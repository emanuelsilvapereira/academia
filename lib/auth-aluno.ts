// Sessão do portal do aluno. É separada da sessão da equipe (outro cookie e outro conteúdo assinado),
// então um aluno logado nunca consegue abrir as telas da equipe, e vice-versa.
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { assinar } from "./auth.ts";
import { getDb } from "./db.ts";

const COOKIE = "pulso_aluno";
const DURACAO_SEGUNDOS = 60 * 60 * 24 * 30; // 30 dias: o aluno usa no celular e não quer entrar toda vez

export type AlunoLogado = { id: number; nome: string; email: string };

export async function criarSessaoAluno(alunoId: number): Promise<void> {
  const expira = Math.floor(Date.now() / 1000) + DURACAO_SEGUNDOS;
  const conteudo = `${alunoId}.${expira}`;
  (await cookies()).set(COOKIE, `${conteudo}.${assinar(`aluno|${conteudo}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SEGUNDOS,
  });
}

export async function encerrarSessaoAluno(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function alunoAtual(): Promise<AlunoLogado | null> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return null;
  const partes = valor.split(".");
  if (partes.length !== 3) return null;
  const [id, expira, assinatura] = partes;

  const esperado = Buffer.from(assinar(`aluno|${id}.${expira}`));
  const recebido = Buffer.from(assinatura);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  if (Number(expira) < Date.now() / 1000) return null;

  // Lido do banco a cada requisição: se a recepção redefinir o acesso (senha apagada) ou o aluno
  // for desativado, a sessão deixa de valer na hora.
  const aluno = getDb()
    .prepare("SELECT id, nome, email FROM aluno WHERE id = ? AND ativo = 1 AND senha_hash IS NOT NULL")
    .get(Number(id)) as AlunoLogado | undefined;
  return aluno ?? null;
}

/** Use no começo de toda página e ação do portal: quem não está logado vai para /aluno/entrar. */
export async function exigirAluno(): Promise<AlunoLogado> {
  const aluno = await alunoAtual();
  if (!aluno) redirect("/aluno/entrar");
  return aluno;
}
