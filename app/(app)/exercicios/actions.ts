"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { GRUPO_ROTULO } from "@/lib/format";
import { ehViolacaoChave, ehViolacaoUnica, semErros, texto, type FormState, type ResultadoExclusao } from "@/lib/form";
import { excluirComDesfazer } from "@/lib/lixeira";

function ler(form: FormData) {
  return { nome: texto(form, "nome").replace(/\s+/g, " "), grupo: texto(form, "grupo"), equipamento: texto(form, "equipamento").replace(/\s+/g, " ") };
}

function validar(v: ReturnType<typeof ler>, idAtual: number) {
  const erros: Record<string, string> = {};
  if (v.nome.length < 3 || v.nome.length > 60) erros.nome = "O nome deve ter de 3 a 60 caracteres.";
  else if (getDb().prepare("SELECT id FROM exercicio WHERE nome = ? AND id <> ?").get(v.nome, idAtual)) erros.nome = "Já existe um exercício com esse nome.";
  if (!(v.grupo in GRUPO_ROTULO)) erros.grupo = "Escolha o grupo muscular.";
  if (v.equipamento.length < 2 || v.equipamento.length > 40) erros.equipamento = "Informe o equipamento (ex.: Halteres, Peso do corpo).";
  return erros;
}

export async function criarExercicio(_estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("exercicios.editar");
  const v = ler(form);
  const erros = validar(v, 0);
  if (!semErros(erros)) return { erros, valores: v };
  const db = getDb();
  try {
    const id = Number(db.prepare("INSERT INTO exercicio (nome, grupo, equipamento) VALUES (@nome, @grupo, @equipamento)").run(v).lastInsertRowid);
    auditar(db, usuario, "criar", "exercicio", id, `Cadastrou o exercício ${v.nome}`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { erros: { nome: "Já existe um exercício com esse nome." }, valores: v };
    return { mensagem: "Não foi possível salvar agora.", valores: v };
  }
  revalidatePath("/exercicios");
  redirect("/exercicios");
}

export async function atualizarExercicio(id: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("exercicios.editar");
  const v = ler(form);
  const erros = validar(v, id);
  if (!semErros(erros)) return { erros, valores: v };
  const db = getDb();
  try {
    const r = db.prepare("UPDATE exercicio SET nome = @nome, grupo = @grupo, equipamento = @equipamento WHERE id = @id").run({ ...v, id });
    if (r.changes === 0) return { mensagem: "Esse exercício não existe mais.", valores: v };
    auditar(db, usuario, "editar", "exercicio", id, `Editou o exercício ${v.nome}`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { erros: { nome: "Já existe um exercício com esse nome." }, valores: v };
    return { mensagem: "Não foi possível salvar agora.", valores: v };
  }
  revalidatePath("/exercicios");
  redirect("/exercicios");
}

export async function excluirExercicio(id: number): Promise<ResultadoExclusao> {
  const usuario = await exigirPermissao("exercicios.editar");
  const db = getDb();
  const ex = db.prepare("SELECT nome FROM exercicio WHERE id = ?").get(id) as { nome: string } | undefined;
  if (!ex) return { ok: false, mensagem: "Esse exercício não existe mais." };
  const { n } = db.prepare("SELECT COUNT(DISTINCT ficha_id) AS n FROM ficha_item WHERE exercicio_id = ?").get(id) as { n: number };
  if (n > 0) return { ok: false, mensagem: `Não dá para excluir: está em ${n} ${n === 1 ? "ficha" : "fichas"} de treino.` };
  try {
    const desfazer = excluirComDesfazer(db, "exercicio", id, ex.nome, usuario.id);
    auditar(db, usuario, "excluir", "exercicio", id, `Excluiu o exercício ${ex.nome}`);
    revalidatePath("/exercicios");
    return { ok: true, mensagem: `${ex.nome} excluído.`, desfazer: desfazer ?? undefined };
  } catch (e) {
    // ON DELETE RESTRICT no banco protege mesmo se alguém usar o exercício entre a checagem e a exclusão.
    if (ehViolacaoChave(e)) return { ok: false, mensagem: "Não dá para excluir: o exercício está em uso." };
    return { ok: false, mensagem: "Não foi possível excluir agora." };
  }
}
