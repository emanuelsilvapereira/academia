// Aulas coletivas: grade semanal, ocorrências dos próximos dias e reservas com limite de vagas.
import type Database from "better-sqlite3";
import { addDias, diaDaSemana } from "./format.ts";

export type Aula = {
  id: number;
  nome: string;
  dia_semana: number;
  hora: string;
  duracao_min: number;
  vagas: number;
  sala: string;
  instrutor_id: number | null;
  instrutor_nome: string | null;
  ativo: number;
};

export type Ocorrencia = Aula & { data: string; reservadas: number; minha: boolean };

/** Hora de término "HH:MM" de uma aula. */
export function horaFim(hora: string, duracaoMin: number): string {
  const total = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)) + duracaoMin;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** A aula daquela data já começou? (agora = "HH:MM:SS" de hoje). */
export function jaComecou(data: string, hora: string, hoje: string, agora: string): boolean {
  return data < hoje || (data === hoje && hora <= agora.slice(0, 5));
}

export function listarAulas(db: Database.Database, apenasAtivas = false): Aula[] {
  return db
    .prepare(
      `SELECT a.*, i.nome AS instrutor_nome FROM aula a LEFT JOIN instrutor i ON i.id = a.instrutor_id
       ${apenasAtivas ? "WHERE a.ativo = 1" : ""} ORDER BY a.dia_semana, a.hora, a.nome`,
    )
    .all() as Aula[];
}

/** Aulas dos próximos N dias (a partir de hoje), com quantas vagas já foram reservadas. */
export function proximasOcorrencias(db: Database.Database, hoje: string, dias: number, alunoId: number | null): Ocorrencia[] {
  const aulas = listarAulas(db, true);
  const contagem = db
    .prepare("SELECT aula_id, data, COUNT(*) AS n FROM aula_reserva WHERE data BETWEEN ? AND ? GROUP BY aula_id, data")
    .all(hoje, addDias(hoje, dias - 1)) as { aula_id: number; data: string; n: number }[];
  const minhas = alunoId
    ? new Set(
        (db.prepare("SELECT aula_id, data FROM aula_reserva WHERE aluno_id = ? AND data >= ?").all(alunoId, hoje) as { aula_id: number; data: string }[]).map(
          (r) => `${r.aula_id}|${r.data}`,
        ),
      )
    : new Set<string>();
  const n = new Map(contagem.map((c) => [`${c.aula_id}|${c.data}`, c.n]));
  const lista: Ocorrencia[] = [];
  for (let d = 0; d < dias; d++) {
    const data = addDias(hoje, d);
    for (const a of aulas.filter((x) => x.dia_semana === diaDaSemana(data))) {
      const chave = `${a.id}|${data}`;
      lista.push({ ...a, data, reservadas: n.get(chave) ?? 0, minha: minhas.has(chave) });
    }
  }
  return lista;
}

export type ResultadoReserva = { ok: true } | { ok: false; motivo: string };

/**
 * Reserva uma vaga. Tudo numa transação "immediate": duas pessoas tentando a última vaga ao mesmo tempo
 * não conseguem passar do limite.
 */
export function reservarAula(
  db: Database.Database,
  alunoId: number,
  aulaId: number,
  data: string,
  hoje: string,
  agora: string,
  criadaEm: string,
  diasAntecedencia = 7,
): ResultadoReserva {
  const tentar = db.transaction((): ResultadoReserva => {
    const aula = db.prepare("SELECT * FROM aula WHERE id = ? AND ativo = 1").get(aulaId) as Aula | undefined;
    if (!aula) return { ok: false, motivo: "Essa aula não existe mais." };
    if (diaDaSemana(data) !== aula.dia_semana) return { ok: false, motivo: "Essa aula não acontece nesse dia." };
    if (jaComecou(data, aula.hora, hoje, agora)) return { ok: false, motivo: "Essa aula já começou." };
    if (data > addDias(hoje, diasAntecedencia - 1)) return { ok: false, motivo: `Dá para reservar com até ${diasAntecedencia} dias de antecedência.` };
    if (db.prepare("SELECT 1 FROM aula_reserva WHERE aula_id = ? AND data = ? AND aluno_id = ?").get(aulaId, data, alunoId)) {
      return { ok: false, motivo: "Você já reservou essa aula." };
    }
    const conflito = db
      .prepare(
        `SELECT a.nome FROM aula_reserva r JOIN aula a ON a.id = r.aula_id
         WHERE r.aluno_id = ? AND r.data = ? AND a.hora = ?`,
      )
      .get(alunoId, data, aula.hora) as { nome: string } | undefined;
    if (conflito) return { ok: false, motivo: `Você já tem ${conflito.nome} nesse horário.` };
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM aula_reserva WHERE aula_id = ? AND data = ?").get(aulaId, data) as { n: number };
    if (n >= aula.vagas) return { ok: false, motivo: "Não há mais vagas nessa aula." };
    db.prepare("INSERT INTO aula_reserva (aula_id, aluno_id, data, criada_em) VALUES (?, ?, ?, ?)").run(aulaId, alunoId, data, criadaEm);
    return { ok: true };
  });
  return tentar.immediate();
}

/** Cancela a própria reserva (só antes de a aula começar). */
export function cancelarReserva(db: Database.Database, alunoId: number, aulaId: number, data: string, hoje: string, agora: string): ResultadoReserva {
  const aula = db.prepare("SELECT hora FROM aula WHERE id = ?").get(aulaId) as { hora: string } | undefined;
  if (aula && jaComecou(data, aula.hora, hoje, agora)) return { ok: false, motivo: "A aula já começou; não dá mais para cancelar." };
  const r = db.prepare("DELETE FROM aula_reserva WHERE aula_id = ? AND data = ? AND aluno_id = ?").run(aulaId, data, alunoId);
  return r.changes ? { ok: true } : { ok: false, motivo: "Você não tinha reserva nessa aula." };
}
