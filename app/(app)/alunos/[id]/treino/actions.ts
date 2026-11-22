"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hojeISO } from "@/lib/format";
import { ehViolacaoUnica, semErros, texto, type FormState, type ResultadoAcao, type ResultadoExclusao } from "@/lib/form";
import { excluirComDesfazer } from "@/lib/lixeira";
import { DIAS_LONGOS, diasParaTexto } from "@/lib/rotina";
import { paraDecimal } from "@/lib/validacao";

const LETRAS = ["A", "B", "C", "D", "E"];

function atualizar(alunoId: number) {
  revalidatePath(`/alunos/${alunoId}/treino`);
  revalidatePath(`/alunos/${alunoId}`);
}

function fichaDoAluno(fichaId: number, alunoId: number) {
  return getDb()
    .prepare("SELECT f.id, f.letra, a.nome FROM ficha f JOIN aluno a ON a.id = f.aluno_id WHERE f.id = ? AND f.aluno_id = ?")
    .get(fichaId, alunoId) as { id: number; letra: string; nome: string } | undefined;
}

export async function criarFicha(alunoId: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("treinos.editar");
  const letra = texto(form, "letra").toUpperCase();
  const objetivo = texto(form, "objetivo");
  const valores = { letra, objetivo };
  const erros: Record<string, string> = {};
  if (!LETRAS.includes(letra)) erros.letra = "Escolha a letra da ficha.";
  if (objetivo.length > 60) erros.objetivo = "No máximo 60 caracteres.";
  if (!semErros(erros)) return { erros, valores };

  const db = getDb();
  const aluno = db.prepare("SELECT nome, instrutor_id FROM aluno WHERE id = ?").get(alunoId) as { nome: string; instrutor_id: number | null } | undefined;
  if (!aluno) return { mensagem: "Esse aluno não existe mais." };
  try {
    const id = Number(
      db
        .prepare("INSERT INTO ficha (aluno_id, letra, objetivo, instrutor_id, atualizada_em) VALUES (?, ?, ?, ?, ?)")
        .run(alunoId, letra, objetivo, usuario.instrutor_id ?? aluno.instrutor_id, hojeISO()).lastInsertRowid,
    );
    auditar(db, usuario, "criar", "ficha", id, `Criou a ficha ${letra} de ${aluno.nome}`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { erros: { letra: `O aluno já tem a ficha ${letra}.` }, valores };
    return { mensagem: "Não foi possível salvar agora.", valores };
  }
  atualizar(alunoId);
  return { ok: true, mensagem: `Ficha ${letra} criada.` };
}

export async function excluirFicha(alunoId: number, fichaId: number): Promise<ResultadoExclusao> {
  const usuario = await exigirPermissao("treinos.editar");
  const f = fichaDoAluno(fichaId, alunoId);
  if (!f) return { ok: false, mensagem: "Ficha não encontrada." };
  const db = getDb();
  const desfazer = excluirComDesfazer(db, "ficha", fichaId, `ficha ${f.letra} de ${f.nome}`, usuario.id);
  auditar(db, usuario, "excluir", "ficha", fichaId, `Excluiu a ficha ${f.letra} de ${f.nome}`);
  atualizar(alunoId);
  return { ok: true, mensagem: `Ficha ${f.letra} excluída.`, desfazer: desfazer ?? undefined };
}

export async function adicionarExercicio(alunoId: number, fichaId: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("treinos.editar");
  const valores = {
    exercicio_id: texto(form, "exercicio_id"),
    series: texto(form, "series"),
    repeticoes: texto(form, "repeticoes"),
    carga_kg: texto(form, "carga_kg"),
    descanso_seg: texto(form, "descanso_seg"),
  };
  const db = getDb();
  const f = fichaDoAluno(fichaId, alunoId);
  if (!f) return { mensagem: "Ficha não encontrada." };

  const erros: Record<string, string> = {};
  const exercicio = db.prepare("SELECT nome FROM exercicio WHERE id = ?").get(Number(valores.exercicio_id)) as { nome: string } | undefined;
  if (!exercicio) erros.exercicio_id = "Escolha um exercício.";
  const series = Number(valores.series);
  if (!Number.isInteger(series) || series < 1 || series > 10) erros.series = "De 1 a 10.";
  if (!/^[\p{L}\d\s\-–xX/]{1,12}$/u.test(valores.repeticoes)) erros.repeticoes = "Ex.: 12, 10-12 ou 30 s.";
  const carga = paraDecimal(valores.carga_kg);
  if (carga !== null && (Number.isNaN(carga) || carga > 500)) erros.carga_kg = "Carga em kg (até 500).";
  const descanso = valores.descanso_seg ? Number(valores.descanso_seg) : null;
  if (descanso !== null && (!Number.isInteger(descanso) || descanso < 0 || descanso > 600)) erros.descanso_seg = "De 0 a 600 s.";
  if (!semErros(erros)) return { erros, valores };

  const ordem = (db.prepare("SELECT COALESCE(MAX(ordem), 0) + 1 AS n FROM ficha_item WHERE ficha_id = ?").get(fichaId) as { n: number }).n;
  db.transaction(() => {
    db.prepare(
      "INSERT INTO ficha_item (ficha_id, exercicio_id, ordem, series, repeticoes, carga_kg, descanso_seg) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(fichaId, Number(valores.exercicio_id), ordem, series, valores.repeticoes, carga, descanso);
    db.prepare("UPDATE ficha SET atualizada_em = ? WHERE id = ?").run(hojeISO(), fichaId);
    auditar(db, usuario, "editar", "ficha", fichaId, `Adicionou ${exercicio!.nome} na ficha ${f.letra} de ${f.nome}`);
  })();
  atualizar(alunoId);
  return { ok: true, mensagem: `${exercicio!.nome} adicionado à ficha ${f.letra}.` };
}

export async function removerExercicio(alunoId: number, itemId: number): Promise<ResultadoExclusao> {
  const usuario = await exigirPermissao("treinos.editar");
  const db = getDb();
  const item = db
    .prepare(
      `SELECT fi.id, f.id AS ficha_id, f.letra, e.nome FROM ficha_item fi JOIN ficha f ON f.id = fi.ficha_id
       JOIN exercicio e ON e.id = fi.exercicio_id WHERE fi.id = ? AND f.aluno_id = ?`,
    )
    .get(itemId, alunoId) as { id: number; ficha_id: number; letra: string; nome: string } | undefined;
  if (!item) return { ok: false, mensagem: "Exercício não encontrado na ficha." };
  const desfazer = excluirComDesfazer(db, "ficha_item", itemId, `${item.nome} da ficha ${item.letra}`, usuario.id);
  db.prepare("UPDATE ficha SET atualizada_em = ? WHERE id = ?").run(hojeISO(), item.ficha_id);
  auditar(db, usuario, "editar", "ficha", item.ficha_id, `Removeu ${item.nome} da ficha ${item.letra}`);
  atualizar(alunoId);
  return { ok: true, mensagem: `${item.nome} removido da ficha ${item.letra}.`, desfazer: desfazer ?? undefined };
}

/** Sobe ou desce um exercício na ordem da ficha (troca de lugar com o vizinho). */
export async function moverExercicio(alunoId: number, itemId: number, direcao: -1 | 1): Promise<ResultadoAcao> {
  await exigirPermissao("treinos.editar");
  const db = getDb();
  const item = db
    .prepare("SELECT fi.id, fi.ficha_id, fi.ordem FROM ficha_item fi JOIN ficha f ON f.id = fi.ficha_id WHERE fi.id = ? AND f.aluno_id = ?")
    .get(itemId, alunoId) as { id: number; ficha_id: number; ordem: number } | undefined;
  if (!item) return { ok: false, mensagem: "Exercício não encontrado." };
  const vizinho = db
    .prepare(
      direcao < 0
        ? "SELECT id, ordem FROM ficha_item WHERE ficha_id = ? AND ordem < ? ORDER BY ordem DESC LIMIT 1"
        : "SELECT id, ordem FROM ficha_item WHERE ficha_id = ? AND ordem > ? ORDER BY ordem ASC LIMIT 1",
    )
    .get(item.ficha_id, item.ordem) as { id: number; ordem: number } | undefined;
  if (!vizinho) return { ok: true, mensagem: "" };
  db.transaction(() => {
    db.prepare("UPDATE ficha_item SET ordem = ? WHERE id = ?").run(vizinho.ordem, item.id);
    db.prepare("UPDATE ficha_item SET ordem = ? WHERE id = ?").run(item.ordem, vizinho.id);
  })();
  atualizar(alunoId);
  return { ok: true, mensagem: "" };
}

/** Define em quais dias da semana a ficha é feita (aparece na rotina do aluno no portal). */
export async function definirDiasFicha(alunoId: number, fichaId: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("treinos.editar");
  const f = fichaDoAluno(fichaId, alunoId);
  if (!f) return { mensagem: "Ficha não encontrada." };
  const dias = form
    .getAll("dias")
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const texto = diasParaTexto(dias);
  const db = getDb();
  db.prepare("UPDATE ficha SET dias = ? WHERE id = ?").run(texto, fichaId);
  const nomes = texto ? texto.split(",").map((d) => DIAS_LONGOS[Number(d)]).join(", ") : "sem dia fixo";
  auditar(db, usuario, "editar", "ficha", fichaId, `Definiu os dias da ficha ${f.letra} de ${f.nome}: ${nomes}`);
  atualizar(alunoId);
  revalidatePath("/aluno", "layout");
  return { ok: true, mensagem: `Ficha ${f.letra}: ${nomes}.` };
}