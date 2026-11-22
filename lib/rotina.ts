// Rotina de treino do aluno: qual ficha fazer hoje, sequência de semanas e conquistas.
// Funções puras (sem banco), cobertas pelos testes.
import { addDias, diaDaSemana } from "./format.ts";

export const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const DIAS_LONGOS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

/** "0,2,4" -> [0, 2, 4] (0 = segunda ... 6 = domingo). */
export function lerDias(texto: string | null | undefined): number[] {
  const dias = (texto ?? "")
    .split(",")
    .filter((s) => s.trim() !== "")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  return [...new Set(dias)].sort((a, b) => a - b);
}

export function diasParaTexto(dias: number[]): string {
  return lerDias(dias.join(",")).join(",");
}

export type FichaRotina = { letra: string; dias: number[] };

export type TreinoDoDia =
  | { tipo: "treino"; letra: string; motivo: "dia" | "sequencia" }
  | { tipo: "descanso"; proxima: { letra: string; dia: number; emDias: number } | null }
  | { tipo: "sem_ficha" };

/**
 * Qual treino fazer hoje.
 * - Se alguma ficha está marcada para o dia da semana de hoje, é ela.
 * - Se nenhuma ficha tem dia fixo, segue a sequência A → B → C... a partir do último treino feito.
 * - Se as fichas têm dias fixos e hoje não é nenhum deles, é dia de descanso (e mostra o próximo).
 */
export function treinoDeHoje(fichas: FichaRotina[], hoje: string, ultimaLetraFeita: string | null): TreinoDoDia {
  if (fichas.length === 0) return { tipo: "sem_ficha" };
  const ordenadas = [...fichas].sort((a, b) => a.letra.localeCompare(b.letra));
  const dow = diaDaSemana(hoje);

  const doDia = ordenadas.find((f) => f.dias.includes(dow));
  if (doDia) return { tipo: "treino", letra: doDia.letra, motivo: "dia" };

  if (ordenadas.every((f) => f.dias.length === 0)) {
    const i = ordenadas.findIndex((f) => f.letra === ultimaLetraFeita);
    return { tipo: "treino", letra: ordenadas[(i + 1) % ordenadas.length].letra, motivo: "sequencia" };
  }

  for (let k = 1; k <= 7; k++) {
    const dia = (dow + k) % 7;
    const f = ordenadas.find((x) => x.dias.includes(dia));
    if (f) return { tipo: "descanso", proxima: { letra: f.letra, dia, emDias: k } };
  }
  return { tipo: "descanso", proxima: null };
}

/** Segunda-feira da semana de uma data. */
export function inicioDaSemana(iso: string): string {
  return addDias(iso, -diaDaSemana(iso));
}

/**
 * Quantas semanas seguidas o aluno treinou pelo menos uma vez, terminando na semana atual
 * (se ainda não treinou nesta semana, conta a partir da semana passada, sem quebrar a sequência).
 */
export function semanasSeguidas(datas: Iterable<string>, hoje: string): number {
  const semanas = new Set<string>();
  for (const d of datas) semanas.add(inicioDaSemana(d));
  let semana = inicioDaSemana(hoje);
  if (!semanas.has(semana)) semana = addDias(semana, -7);
  let n = 0;
  while (semanas.has(semana)) {
    n++;
    semana = addDias(semana, -7);
  }
  return n;
}

export type Conquista = { id: string; titulo: string; descricao: string; ganhou: boolean; progresso?: string };

/** Conquistas calculadas a partir do histórico (nada fica guardado no banco). */
export function conquistas(dados: {
  totalTreinos: number;
  semanasSeguidas: number;
  avaliacoes: { gordura_pct: number | null }[];
  mesesDeCasa: number;
}): Conquista[] {
  const { totalTreinos: t, semanasSeguidas: s, avaliacoes, mesesDeCasa: m } = dados;
  const comGordura = avaliacoes.filter((a) => a.gordura_pct !== null);
  const perdeuGordura = comGordura.length >= 2 && comGordura[comGordura.length - 1].gordura_pct! < comGordura[0].gordura_pct!;
  const marca = (alvo: number, atual: number) => (atual >= alvo ? undefined : `${atual}/${alvo}`);
  return [
    { id: "primeiro", titulo: "Primeiro treino", descricao: "Registrou a primeira entrada na academia.", ganhou: t >= 1 },
    { id: "dez", titulo: "10 treinos", descricao: "Treinou 10 vezes.", ganhou: t >= 10, progresso: marca(10, t) },
    { id: "cinquenta", titulo: "50 treinos", descricao: "Treinou 50 vezes.", ganhou: t >= 50, progresso: marca(50, t) },
    { id: "cem", titulo: "100 treinos", descricao: "Treinou 100 vezes.", ganhou: t >= 100, progresso: marca(100, t) },
    { id: "constancia", titulo: "Constância", descricao: "4 semanas seguidas treinando.", ganhou: s >= 4, progresso: marca(4, s) },
    { id: "evolucao", titulo: "Evolução", descricao: "Diminuiu o % de gordura desde a primeira avaliação.", ganhou: perdeuGordura },
    { id: "veterano", titulo: "Veterano", descricao: "Um ano de academia.", ganhou: m >= 12, progresso: marca(12, m) },
  ];
}
