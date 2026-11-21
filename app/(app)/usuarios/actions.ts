"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { EMAIL_RE } from "@/lib/format";
import { ehViolacaoUnica, semErros, texto, type FormState } from "@/lib/form";
import { hashPassword } from "@/lib/password";
import { PERFIL_ROTULO, PERFIS, type Perfil } from "@/lib/permissoes";

function ler(form: FormData) {
  return {
    nome: texto(form, "nome").replace(/\s+/g, " "),
    email: texto(form, "email").toLowerCase(),
    perfil: texto(form, "perfil"),
    instrutor_id: texto(form, "instrutor_id"),
    ativo: texto(form, "ativo"),
  };
}

function senhaFraca(senha: string): string | null {
  if (senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return "Use letras e números na senha.";
  return null;
}

function validar(v: ReturnType<typeof ler>, idAtual: number) {
  const db = getDb();
  const erros: Record<string, string> = {};
  if (v.nome.length < 3 || v.nome.length > 80) erros.nome = "Informe o nome (3 a 80 letras).";
  if (!EMAIL_RE.test(v.email)) erros.email = "Digite um e-mail válido.";
  else if (db.prepare("SELECT id FROM usuario WHERE email = ? AND id <> ?").get(v.email, idAtual)) erros.email = "Já existe um usuário com esse e-mail.";
  if (!PERFIS.includes(v.perfil as Perfil)) erros.perfil = "Escolha o perfil.";
  const instrutorId = v.instrutor_id ? Number(v.instrutor_id) : null;
  if (instrutorId !== null && !db.prepare("SELECT id FROM instrutor WHERE id = ?").get(instrutorId)) erros.instrutor_id = "Escolha um instrutor da lista.";
  return { erros, instrutorId: v.perfil === "instrutor" ? instrutorId : null };
}

export async function criarUsuario(_estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("usuarios.gerenciar");
  const v = ler(form);
  const senha = typeof form.get("senha") === "string" ? (form.get("senha") as string) : "";
  const { erros, instrutorId } = validar(v, 0);
  const fraca = senhaFraca(senha);
  if (fraca) erros.senha = fraca;
  if (!semErros(erros)) return { erros, valores: v };

  const db = getDb();
  try {
    const id = Number(
      db
        .prepare("INSERT INTO usuario (nome, email, senha_hash, perfil, instrutor_id) VALUES (?, ?, ?, ?, ?)")
        .run(v.nome, v.email, hashPassword(senha), v.perfil, instrutorId).lastInsertRowid,
    );
    auditar(db, usuario, "criar", "usuario", id, `Criou o usuário ${v.email} (${PERFIL_ROTULO[v.perfil as Perfil]})`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { erros: { email: "Já existe um usuário com esse e-mail." }, valores: v };
    return { mensagem: "Não foi possível salvar agora.", valores: v };
  }
  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function atualizarUsuario(id: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("usuarios.gerenciar");
  const v = ler(form);
  const senha = typeof form.get("senha") === "string" ? (form.get("senha") as string) : "";
  const { erros, instrutorId } = validar(v, id);
  if (senha) {
    const fraca = senhaFraca(senha);
    if (fraca) erros.senha = fraca;
  }
  const ativo = v.ativo === "on" ? 1 : 0;
  const db = getDb();

  // Proteções: ninguém tira o próprio acesso de administrador, e sempre sobra pelo menos um admin ativo.
  if (id === usuario.id && (v.perfil !== "admin" || !ativo)) {
    erros.perfil = "Você não pode tirar o seu próprio acesso de administrador.";
  }
  const outrosAdmins = (db.prepare("SELECT COUNT(*) AS n FROM usuario WHERE perfil = 'admin' AND ativo = 1 AND id <> ?").get(id) as { n: number }).n;
  if ((v.perfil !== "admin" || !ativo) && outrosAdmins === 0) erros.perfil = "O sistema precisa de pelo menos um administrador ativo.";
  if (!semErros(erros)) return { erros, valores: v };

  try {
    const r = db
      .prepare("UPDATE usuario SET nome = ?, email = ?, perfil = ?, instrutor_id = ?, ativo = ? WHERE id = ?")
      .run(v.nome, v.email, v.perfil, instrutorId, ativo, id);
    if (r.changes === 0) return { mensagem: "Esse usuário não existe mais.", valores: v };
    if (senha) db.prepare("UPDATE usuario SET senha_hash = ? WHERE id = ?").run(hashPassword(senha), id);
    auditar(db, usuario, "editar", "usuario", id,
      `Editou o usuário ${v.email}: ${PERFIL_ROTULO[v.perfil as Perfil]}${ativo ? "" : ", desativado"}${senha ? ", senha trocada" : ""}`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { erros: { email: "Já existe um usuário com esse e-mail." }, valores: v };
    return { mensagem: "Não foi possível salvar agora.", valores: v };
  }
  revalidatePath("/usuarios");
  redirect("/usuarios");
}
