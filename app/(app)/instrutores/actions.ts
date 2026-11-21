"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { EMAIL_RE } from "@/lib/format";
import { ehViolacaoUnica, semErros, texto, type FormState, type ResultadoExclusao } from "@/lib/form";
import { excluirComDesfazer } from "@/lib/lixeira";
import { soDigitos, telefoneValido } from "@/lib/validacao";

function ler(form: FormData) {
  return {
    nome: texto(form, "nome").replace(/\s+/g, " "),
    email: texto(form, "email").toLowerCase(),
    telefone: texto(form, "telefone"),
    especialidade: texto(form, "especialidade"),
    ativo: texto(form, "ativo"),
  };
}

function validar(v: ReturnType<typeof ler>, idAtual: number) {
  const erros: Record<string, string> = {};
  if (v.nome.length < 3 || v.nome.length > 80) erros.nome = "Informe o nome completo (3 a 80 letras).";
  if (!EMAIL_RE.test(v.email)) erros.email = "Digite um e-mail válido.";
  else if (getDb().prepare("SELECT id FROM instrutor WHERE email = ? AND id <> ?").get(v.email, idAtual)) erros.email = "Já existe um instrutor com esse e-mail.";
  if (!telefoneValido(v.telefone)) erros.telefone = "Telefone com DDD: (11) 91234-5678.";
  if (v.especialidade.length > 60) erros.especialidade = "No máximo 60 caracteres.";
  return erros;
}

export async function criarInstrutor(_estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("instrutores.editar");
  const v = ler(form);
  const erros = validar(v, 0);
  if (!semErros(erros)) return { erros, valores: v };
  const db = getDb();
  try {
    const id = Number(
      db
        .prepare("INSERT INTO instrutor (nome, email, telefone, especialidade) VALUES (?, ?, ?, ?)")
        .run(v.nome, v.email, soDigitos(v.telefone), v.especialidade).lastInsertRowid,
    );
    auditar(db, usuario, "criar", "instrutor", id, `Cadastrou o instrutor ${v.nome}`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { erros: { email: "Já existe um instrutor com esse e-mail." }, valores: v };
    return { mensagem: "Não foi possível salvar agora.", valores: v };
  }
  revalidatePath("/instrutores");
  redirect("/instrutores");
}

export async function atualizarInstrutor(id: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("instrutores.editar");
  const v = ler(form);
  const erros = validar(v, id);
  if (!semErros(erros)) return { erros, valores: v };
  const db = getDb();
  try {
    const r = db
      .prepare("UPDATE instrutor SET nome = ?, email = ?, telefone = ?, especialidade = ?, ativo = ? WHERE id = ?")
      .run(v.nome, v.email, soDigitos(v.telefone), v.especialidade, v.ativo === "on" ? 1 : 0, id);
    if (r.changes === 0) return { mensagem: "Esse instrutor não existe mais.", valores: v };
    auditar(db, usuario, "editar", "instrutor", id, `Editou o instrutor ${v.nome}${v.ativo === "on" ? "" : " (inativo)"}`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { erros: { email: "Já existe um instrutor com esse e-mail." }, valores: v };
    return { mensagem: "Não foi possível salvar agora.", valores: v };
  }
  revalidatePath("/instrutores");
  redirect("/instrutores");
}

export async function excluirInstrutor(id: number): Promise<ResultadoExclusao> {
  const usuario = await exigirPermissao("instrutores.editar");
  const db = getDb();
  const i = db.prepare("SELECT nome FROM instrutor WHERE id = ?").get(id) as { nome: string } | undefined;
  if (!i) return { ok: false, mensagem: "Esse instrutor não existe mais." };
  // Os alunos, fichas e avaliações dele ficam sem instrutor (ON DELETE SET NULL); desfazer religa tudo.
  const desfazer = excluirComDesfazer(db, "instrutor", id, i.nome, usuario.id);
  auditar(db, usuario, "excluir", "instrutor", id, `Excluiu o instrutor ${i.nome}`);
  revalidatePath("/", "layout");
  return { ok: true, mensagem: `${i.nome} excluído. Os alunos dele ficaram sem instrutor.`, desfazer: desfazer ?? undefined };
}
