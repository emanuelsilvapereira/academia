import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db.ts";
import { pode, type Perfil, type Permissao } from "./permissoes.ts";

const COOKIE = "pulso_sessao";
const DURACAO_SEGUNDOS = 60 * 60 * 8;

function segredo(): string {
  // Em produção, defina AUTH_SECRET no ambiente. Este valor serve só para rodar localmente.
  return process.env.AUTH_SECRET || "segredo-somente-para-desenvolvimento-local";
}

/** Assinatura HMAC usada nos cookies de sessão (equipe e portal do aluno). */
export function assinar(conteudo: string): string {
  return createHmac("sha256", segredo()).update(conteudo).digest("hex");
}

export async function criarSessao(usuarioId: number): Promise<void> {
  const expira = Math.floor(Date.now() / 1000) + DURACAO_SEGUNDOS;
  const conteudo = `${usuarioId}.${expira}`;
  (await cookies()).set(COOKIE, `${conteudo}.${assinar(conteudo)}`, {
    httpOnly: true, // o JavaScript do navegador não consegue ler o cookie
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SEGUNDOS,
  });
}

export async function encerrarSessao(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export type Usuario = { id: number; nome: string; email: string; perfil: Perfil; instrutor_id: number | null };

export async function usuarioAtual(): Promise<Usuario | null> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return null;

  const partes = valor.split(".");
  if (partes.length !== 3) return null;
  const [id, expira, assinatura] = partes;

  const esperado = Buffer.from(assinar(`${id}.${expira}`));
  const recebido = Buffer.from(assinatura);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  if (Number(expira) < Date.now() / 1000) return null;

  // O perfil é lido do banco a cada requisição: se o administrador mudar o perfil ou desativar
  // o usuário, vale na hora.
  const usuario = getDb()
    .prepare("SELECT id, nome, email, perfil, instrutor_id FROM usuario WHERE id = ? AND ativo = 1")
    .get(Number(id)) as Usuario | undefined;
  return usuario ?? null;
}

/** Use no começo de toda página e de toda ação: quem não está logado vai para /login. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

/** Como exigirUsuario, mas também confere a permissão do perfil. Sem permissão, vai para /sem-permissao. */
export async function exigirPermissao(permissao: Permissao): Promise<Usuario> {
  const usuario = await exigirUsuario();
  if (!pode(usuario.perfil, permissao)) redirect("/sem-permissao");
  return usuario;
}

/** IP de quem fez a requisição (usado no bloqueio de login). */
export async function ipDaRequisicao(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}
