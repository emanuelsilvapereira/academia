// Consultas do portal do aluno. Todas recebem o id do aluno logado: o aluno só vê os próprios dados.
import type Database from "better-sqlite3";
import { lerDias, treinoDeHoje, type TreinoDoDia } from "./rotina.ts";

export type ItemTreino = {
  id: number;
  exercicio_id: number;
  nome: string;
  grupo: string;
  equipamento: string;
  musculos_primarios: string;
  video_url: string;
  animacao: string;
  series: number;
  repeticoes: string;
  carga_kg: number | null;
  descanso_seg: number | null;
  /** Última carga que o aluno anotou nesse exercício (portal). */
  ultima_carga: number | null;
  ultima_carga_data: string | null;
};

export type FichaTreino = {
  id: number;
  letra: string;
  objetivo: string;
  dias: number[];
  atualizada_em: string;
  instrutor_nome: string | null;
  itens: ItemTreino[];
};

export function fichasDoAluno(db: Database.Database, alunoId: number): FichaTreino[] {
  const fichas = db
    .prepare(
      `SELECT f.id, f.letra, f.objetivo, f.dias, f.atualizada_em, i.nome AS instrutor_nome
       FROM ficha f LEFT JOIN instrutor i ON i.id = f.instrutor_id WHERE f.aluno_id = ? ORDER BY f.letra`,
    )
    .all(alunoId) as (Omit<FichaTreino, "dias" | "itens"> & { dias: string })[];
  const itens = db
    .prepare(
      `SELECT fi.id, fi.ficha_id, e.id AS exercicio_id, e.nome, e.grupo, e.equipamento, e.musculos_primarios, e.video_url, e.animacao,
              fi.series, fi.repeticoes, fi.carga_kg, fi.descanso_seg,
              (SELECT c.carga_kg FROM carga_registro c WHERE c.aluno_id = f.aluno_id AND c.exercicio_id = e.id ORDER BY c.data DESC LIMIT 1) AS ultima_carga,
              (SELECT MAX(c.data) FROM carga_registro c WHERE c.aluno_id = f.aluno_id AND c.exercicio_id = e.id) AS ultima_carga_data
       FROM ficha_item fi JOIN ficha f ON f.id = fi.ficha_id JOIN exercicio e ON e.id = fi.exercicio_id
       WHERE f.aluno_id = ? ORDER BY fi.ordem`,
    )
    .all(alunoId) as (ItemTreino & { ficha_id: number })[];
  return fichas.map((f) => ({ ...f, dias: lerDias(f.dias), itens: itens.filter((i) => i.ficha_id === f.id) }));
}

export function treinosFeitos(db: Database.Database, alunoId: number, desde: string): { data: string; letra: string }[] {
  return db
    .prepare("SELECT data, letra FROM treino_feito WHERE aluno_id = ? AND data >= ? ORDER BY data DESC, letra")
    .all(alunoId, desde) as { data: string; letra: string }[];
}

/** Treino sugerido para hoje, considerando os dias de cada ficha e o último treino concluído antes de hoje. */
export function treinoSugerido(db: Database.Database, alunoId: number, fichas: FichaTreino[], hoje: string): TreinoDoDia {
  const ultima = db
    .prepare("SELECT letra FROM treino_feito WHERE aluno_id = ? AND data < ? ORDER BY data DESC, letra DESC LIMIT 1")
    .get(alunoId, hoje) as { letra: string } | undefined;
  return treinoDeHoje(fichas.map((f) => ({ letra: f.letra, dias: f.dias })), hoje, ultima?.letra ?? null);
}

export type ExercicioCompleto = {
  id: number;
  nome: string;
  grupo: string;
  equipamento: string;
  descricao: string;
  execucao: string;
  dicas: string;
  musculos_primarios: string;
  musculos_secundarios: string;
  video_url: string;
  animacao: string;
};

export function buscarExercicio(db: Database.Database, id: number): ExercicioCompleto | undefined {
  return db
    .prepare(
      `SELECT id, nome, grupo, equipamento, descricao, execucao, dicas, musculos_primarios, musculos_secundarios, video_url, animacao
       FROM exercicio WHERE id = ?`,
    )
    .get(id) as ExercicioCompleto | undefined;
}
