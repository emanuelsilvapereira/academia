// Funções de data e formatação. Não dependem de nada: rodam no servidor, no navegador e nos testes.

export const FUSO = "America/Sao_Paulo";

/** Situação do aluno, calculada a partir do cadastro, da matrícula e dos pagamentos (lib/consultas.ts). */
export const SITUACAO_ROTULO: Record<string, string> = {
  ativo: "Ativo",
  pendente: "Pagamento pendente",
  vencido: "Matrícula vencida",
  inativo: "Inativo",
};

export const FORMA_ROTULO: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
};

export const GRUPO_ROTULO: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  pernas: "Pernas",
  gluteos: "Glúteos",
  abdomen: "Abdômen",
  cardio: "Cardio",
  corpo_todo: "Corpo todo",
};

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo, para não virar o dia errado à noite. */
export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

/** Hora atual (HH:MM:SS) no fuso de São Paulo. */
export function agoraHora(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(agora);
}

/** "AAAA-MM-DD HH:MM:SS" no fuso de São Paulo (usado na auditoria). */
export function agoraCompleto(agora: Date = new Date()): string {
  return `${hojeISO(agora)} ${agoraHora(agora)}`;
}

export function addDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Soma meses mantendo o dia; se o mês não tem esse dia (ex.: 31/02), usa o último dia do mês. */
export function addMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimoDia));
  return alvo.toISOString().slice(0, 10);
}

/** Número de dias entre duas datas ISO (b - a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** 0 = segunda ... 6 = domingo */
export function diaDaSemana(iso: string): number {
  return (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** "2026-03" -> "mar/26" */
export function rotuloMes(anoMes: string): string {
  const [a, m] = anoMes.split("-");
  return `${MESES_CURTOS[Number(m) - 1]}/${a.slice(2)}`;
}

export function brl(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Número com vírgula decimal (ex.: 72,5). */
export function decimal(n: number | null | undefined, casas = 1): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

/** "11912345678" -> "(11) 91234-5678" */
export function formatarTelefone(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digitos;
}

/** "12345678909" -> "123.456.789-09" */
export function formatarCpf(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  if (d.length !== 11) return digitos;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
