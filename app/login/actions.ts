"use server";

import { redirect } from "next/navigation";
import { auditar } from "@/lib/auditoria";
import { criarSessao, encerrarSessao, ipDaRequisicao, usuarioAtual } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { EMAIL_RE } from "@/lib/format";
import { texto, type FormState } from "@/lib/form";
import { registrarTentativa, segundosDeBloqueio } from "@/lib/login";
import { verifyPassword } from "@/lib/password";

export async function entrar(_estado: FormState, dados: FormData): Promise<FormState> {
  const email = texto(dados, "email").toLowerCase();
  const senha = typeof dados.get("senha") === "string" ? (dados.get("senha") as string) : "";

  const erros: Record<string, string> = {};
  if (!email) erros.email = "Informe seu e-mail.";
  else if (!EMAIL_RE.test(email)) erros.email = "Digite um e-mail válido.";
  if (!senha) erros.senha = "Informe sua senha.";
  else if (senha.length < 6) erros.senha = "A senha tem pelo menos 6 caracteres.";
  if (Object.keys(erros).length > 0) return { erros, valores: { email } };

  const db = getDb();
  const ip = await ipDaRequisicao();
  const agora = Math.floor(Date.now() / 1000);

  // Muitas tentativas erradas seguidas: bloqueia por alguns minutos (nem confere a senha).
  const espera = segundosDeBloqueio(db, email, ip, agora);
  if (espera > 0) {
    const minutos = Math.ceil(espera / 60);
    return {
      mensagem: `Muitas tentativas sem sucesso. Tente de novo em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`,
      valores: { email },
    };
  }

  const usuario = db
    .prepare("SELECT id, email, senha_hash FROM usuario WHERE email = ? AND ativo = 1")
    .get(email) as { id: number; email: string; senha_hash: string } | undefined;

  // Mensagem genérica: não revela se o e-mail existe.
  if (!usuario || !verifyPassword(senha, usuario.senha_hash)) {
    registrarTentativa(db, email, ip, false, agora);
    auditar(db, usuario ? { id: usuario.id, email: usuario.email } : { id: null, email }, "login_falhou", "sessao", null, `Senha incorreta (IP ${ip})`);
    return { mensagem: "E-mail ou senha incorretos.", valores: { email } };
  }

  registrarTentativa(db, email, ip, true, agora);
  auditar(db, { id: usuario.id, email: usuario.email }, "login", "sessao", null, `Entrou no sistema (IP ${ip})`);
  await criarSessao(usuario.id);
  redirect("/painel");
}

export async function sair(): Promise<void> {
  const usuario = await usuarioAtual();
  if (usuario) auditar(getDb(), usuario, "logout", "sessao", null, "Saiu do sistema");
  await encerrarSessao();
  redirect("/login");
}
