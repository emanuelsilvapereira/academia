"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatarData, hojeISO } from "@/lib/format";
import { semErros, texto, type FormState, type ResultadoAcao, type ResultadoExclusao } from "@/lib/form";
import { excluirComDesfazer } from "@/lib/lixeira";
import { DIAS_LONGOS } from "@/lib/rotina";

function ler(form: FormData) {
  return {
    nome: texto(form, "nome").replace(/\s+/g, " "),
    dia_semana: texto(form, "dia_semana"),
    hora: texto(form, "hora"),
    duracao_min: texto(form, "duracao_min"),
    vagas: texto(form, "vagas"),
    sala: texto(form, "sala").replace(/\s+/g, " "),
    instrutor_id: texto(form, "instrutor_id"),
    ativo: texto(form, "ativo") === "on" ? "1" : "0",
  };
}

function validar(v: ReturnType<typeof ler>) {
  const erros: Record<string, string> = {};
  if (v.nome.length < 3 || v.nome.length > 40) erros.nome = "De 3 a 40 caracteres.";
  const dia = Number(v.dia_semana);
  if (!Number.isInteger(dia) || dia < 0 || dia > 6 || v.dia_semana === "") erros.dia_semana = "Escolha o dia.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.hora)) erros.hora = "Horário no formato HH:MM.";
  const duracao = Number(v.duracao_min);
  if (!Number.isInteger(duracao) || duracao < 15 || duracao > 180) erros.duracao_min = "De 15 a 180 minutos.";
  const vagas = Number(v.vagas);
  if (!Number.isInteger(vagas) || vagas < 1 || vagas > 200) erros.vagas = "De 1 a 200 vagas.";
  if (v.sala.length > 30) erros.sala = "No máximo 30 caracteres.";
  if (v.instrutor_id && !getDb().prepare("SELECT 1 FROM instrutor WHERE id = ?").get(Number(v.instrutor_id))) erros.instrutor_id = "Instrutor inválido.";
  return erros;
}

const paraBanco = (v: ReturnType<typeof ler>) => ({
  nome: v.nome,
  dia_semana: Number(v.dia_semana),
  hora: v.hora,
  duracao_min: Number(v.duracao_min),
  vagas: Number(v.vagas),
  sala: v.sala,
  instrutor_id: v.instrutor_id ? Number(v.instrutor_id) : null,
  ativo: Number(v.ativo),
});

function atualizarTelas() {
  revalidatePath("/aulas");
  revalidatePath("/aluno", "layout");
}

export async function criarAula(_estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("aulas.editar");
  const v = ler(form);
  const erros = validar(v);
  if (!semErros(erros)) return { erros, valores: v };
  const db = getDb();
  const id = Number(
    db
      .prepare(
        `INSERT INTO aula (nome, dia_semana, hora, duracao_min, vagas, sala, instrutor_id, ativo)
         VALUES (@nome, @dia_semana, @hora, @duracao_min, @vagas, @sala, @instrutor_id, @ativo)`,
      )
      .run(paraBanco(v)).lastInsertRowid,
  );
  auditar(db, usuario, "criar", "aula", id, `Criou a aula ${v.nome} (${DIAS_LONGOS[Number(v.dia_semana)]} ${v.hora})`);
  atualizarTelas();
  redirect("/aulas");
}

export async function atualizarAula(id: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("aulas.editar");
  const v = ler(form);
  const erros = validar(v);
  if (!semErros(erros)) return { erros, valores: v };
  const db = getDb();
  const antes = db.prepare("SELECT dia_semana, hora FROM aula WHERE id = ?").get(id) as { dia_semana: number; hora: string } | undefined;
  if (!antes) return { mensagem: "Essa aula não existe mais.", valores: v };
  const novo = paraBanco(v);
  const { n: reservas } = db.prepare("SELECT COUNT(*) AS n FROM aula_reserva WHERE aula_id = ? AND data >= ?").get(id, hojeISO()) as { n: number };
  if (reservas > 0 && (antes.dia_semana !== novo.dia_semana || antes.hora !== novo.hora)) {
    return { mensagem: `Essa aula tem ${reservas} reserva(s) futura(s). Para mudar dia ou horário, crie uma aula nova e desative esta.`, valores: v };
  }
  db.prepare(
    `UPDATE aula SET nome = @nome, dia_semana = @dia_semana, hora = @hora, duracao_min = @duracao_min, vagas = @vagas,
       sala = @sala, instrutor_id = @instrutor_id, ativo = @ativo WHERE id = @id`,
  ).run({ ...novo, id });
  auditar(db, usuario, "editar", "aula", id, `Editou a aula ${v.nome}`);
  atualizarTelas();
  redirect("/aulas");
}

export async function excluirAula(id: number): Promise<ResultadoExclusao> {
  const usuario = await exigirPermissao("aulas.editar");
  const db = getDb();
  const aula = db.prepare("SELECT nome, dia_semana, hora FROM aula WHERE id = ?").get(id) as { nome: string; dia_semana: number; hora: string } | undefined;
  if (!aula) return { ok: false, mensagem: "Essa aula não existe mais." };
  const descricao = `${aula.nome} (${DIAS_LONGOS[aula.dia_semana]} ${aula.hora})`;
  const desfazer = excluirComDesfazer(db, "aula", id, descricao, usuario.id);
  auditar(db, usuario, "excluir", "aula", id, `Excluiu a aula ${descricao}`);
  atualizarTelas();
  return { ok: true, mensagem: `Aula ${descricao} excluída.`, desfazer: desfazer ?? undefined };
}

/** A equipe tira um aluno da lista de uma aula (ex.: avisou que não vai). */
export async function removerReserva(reservaId: number): Promise<ResultadoAcao> {
  const usuario = await exigirPermissao("aulas.editar");
  const db = getDb();
  const r = db
    .prepare(
      `SELECT r.id, r.aula_id, r.data, a.nome AS aula, al.nome AS aluno FROM aula_reserva r JOIN aula a ON a.id = r.aula_id
       JOIN aluno al ON al.id = r.aluno_id WHERE r.id = ?`,
    )
    .get(reservaId) as { id: number; aula_id: number; data: string; aula: string; aluno: string } | undefined;
  if (!r) return { ok: false, mensagem: "Reserva não encontrada." };
  db.prepare("DELETE FROM aula_reserva WHERE id = ?").run(reservaId);
  auditar(db, usuario, "excluir", "aula", r.aula_id, `Tirou ${r.aluno} da aula ${r.aula} de ${formatarData(r.data)}`);
  revalidatePath(`/aulas/${r.aula_id}`);
  atualizarTelas();
  return { ok: true, mensagem: `${r.aluno} saiu da lista de ${r.aula}.` };
}
