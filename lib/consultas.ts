// Consultas usadas pelas telas, pelo painel e pelos relatórios exportados (CSV/PDF).
// Ficam num lugar só para a tela e o arquivo exportado mostrarem exatamente os mesmos números.
import type Database from "better-sqlite3";
import { addDias, addMeses } from "./format.ts";

export const DIAS_VENCIMENTO = 7;
export const DIAS_RISCO = 14;
export const POR_PAGINA = 15;

/**
 * "Visão" dos alunos com os campos calculados. Precisa do parâmetro @hoje.
 * - matrícula atual: a que cobre hoje; se não houver, a mais recente
 * - devido / dias de atraso: soma das parcelas vencidas e não pagas (mesmo de matrícula cancelada)
 * - situação: inativo (saiu) > pendente (tem parcela atrasada) > vencido (sem matrícula válida) > ativo
 */
export const CTE_ALUNOS = `
WITH atual AS (
  SELECT * FROM (
    SELECT m.*, ROW_NUMBER() OVER (
      PARTITION BY m.aluno_id
      ORDER BY (m.inicio <= @hoje AND m.fim >= @hoje) DESC, m.inicio DESC, m.id DESC
    ) AS rn
    FROM matricula m WHERE m.cancelada_em IS NULL
  ) WHERE rn = 1
),
divida AS (
  SELECT m.aluno_id, SUM(pg.valor_centavos) AS devido, MIN(pg.vencimento) AS mais_antiga, COUNT(*) AS parcelas
  FROM pagamento pg JOIN matricula m ON m.id = pg.matricula_id
  WHERE pg.pago_em IS NULL AND pg.vencimento < @hoje
  GROUP BY m.aluno_id
),
freq AS (SELECT aluno_id, MAX(data) AS ultima_presenca FROM presenca GROUP BY aluno_id),
av AS (
  SELECT a.id, a.nome, a.email, a.telefone, a.cpf, a.nascimento, a.codigo, a.cadastro, a.ativo, a.instrutor_id,
         i.nome AS instrutor_nome,
         t.id AS matricula_id, t.plano_id, p.nome AS plano_nome, t.inicio, t.fim, t.renovacao_automatica,
         COALESCE(d.devido, 0) AS devido, COALESCE(d.parcelas, 0) AS parcelas_atrasadas,
         CASE WHEN d.mais_antiga IS NULL THEN 0
              ELSE CAST(julianday(@hoje) - julianday(d.mais_antiga) AS INTEGER) END AS dias_atraso,
         f.ultima_presenca,
         CASE WHEN a.ativo = 0 THEN 'inativo'
              WHEN d.devido IS NOT NULL THEN 'pendente'
              WHEN t.id IS NULL OR t.fim < @hoje OR t.inicio > @hoje THEN 'vencido'
              ELSE 'ativo' END AS situacao
  FROM aluno a
  LEFT JOIN atual t ON t.aluno_id = a.id
  LEFT JOIN plano p ON p.id = t.plano_id
  LEFT JOIN divida d ON d.aluno_id = a.id
  LEFT JOIN freq f ON f.aluno_id = a.id
  LEFT JOIN instrutor i ON i.id = a.instrutor_id
)`;

export type AlunoVisao = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  nascimento: string;
  codigo: string;
  cadastro: string;
  ativo: number;
  instrutor_id: number | null;
  instrutor_nome: string | null;
  matricula_id: number | null;
  plano_id: number | null;
  plano_nome: string | null;
  inicio: string | null;
  fim: string | null;
  renovacao_automatica: number | null;
  devido: number;
  parcelas_atrasadas: number;
  dias_atraso: number;
  ultima_presenca: string | null;
  situacao: "ativo" | "pendente" | "vencido" | "inativo";
};

export function buscarAluno(db: Database.Database, id: number, hoje: string): AlunoVisao | undefined {
  return db.prepare(`${CTE_ALUNOS} SELECT * FROM av WHERE id = @id`).get({ hoje, id }) as AlunoVisao | undefined;
}

// ---------- Lista de alunos (busca, filtros, ordenação e paginação no servidor) ----------

// Só estas colunas podem ordenar (lista fixa: o texto da URL nunca entra direto no SQL).
export const ORDENS_ALUNOS: Record<string, string> = {
  nome: "nome COLLATE NOCASE",
  plano: "plano_nome COLLATE NOCASE",
  situacao: "situacao",
  fim: "fim",
  ultima: "ultima_presenca",
  cadastro: "cadastro",
};

export type FiltrosAlunos = {
  q: string;
  situacao: string;
  plano: number;
  instrutor: number;
  ordem: string;
  dir: "asc" | "desc";
};

function whereAlunos(f: FiltrosAlunos) {
  const q = f.q.trim().slice(0, 80);
  const digitos = q.replace(/\D/g, "");
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return {
    sql: `WHERE (@q = '' OR nome LIKE @like ESCAPE '\\' OR email LIKE @like ESCAPE '\\'
                 OR (@digitos <> '' AND length(@digitos) >= 3 AND cpf LIKE '%' || @digitos || '%')
                 OR codigo = upper(@q))
            AND (@situacao = '' OR situacao = @situacao)
            AND (@plano = 0 OR plano_id = @plano)
            AND (@instrutor = 0 OR instrutor_id = @instrutor)`,
    params: { q, like, digitos, situacao: f.situacao, plano: f.plano, instrutor: f.instrutor },
  };
}

export function listarAlunos(
  db: Database.Database,
  f: FiltrosAlunos,
  hoje: string,
  pagina: number | null, // null = todos (exportação)
): { total: number; linhas: AlunoVisao[] } {
  const w = whereAlunos(f);
  const total = (db.prepare(`${CTE_ALUNOS} SELECT COUNT(*) AS n FROM av ${w.sql}`).get({ ...w.params, hoje }) as { n: number }).n;
  const ordem = ORDENS_ALUNOS[f.ordem] ?? ORDENS_ALUNOS.nome;
  const dir = f.dir === "desc" ? "DESC" : "ASC";
  const limite = pagina === null ? "" : `LIMIT ${POR_PAGINA} OFFSET ${(Math.max(1, pagina) - 1) * POR_PAGINA}`;
  const linhas = db
    .prepare(`${CTE_ALUNOS} SELECT * FROM av ${w.sql} ORDER BY ${ordem} ${dir} NULLS LAST, id ${limite}`)
    .all({ ...w.params, hoje }) as AlunoVisao[];
  return { total, linhas };
}

// ---------- Painel e relatórios ----------

export type Inadimplente = Pick<AlunoVisao, "id" | "nome" | "telefone" | "plano_nome" | "devido" | "dias_atraso" | "parcelas_atrasadas">;

/** Alunos (que não saíram) com parcela vencida e não paga, do maior atraso para o menor. */
export function inadimplentes(db: Database.Database, hoje: string, limite = 1000): Inadimplente[] {
  return db
    .prepare(
      `${CTE_ALUNOS}
       SELECT id, nome, telefone, plano_nome, devido, dias_atraso, parcelas_atrasadas
       FROM av WHERE situacao = 'pendente'
       ORDER BY dias_atraso DESC, devido DESC, nome LIMIT @limite`,
    )
    .all({ hoje, limite }) as Inadimplente[];
}

export function totaisInadimplencia(db: Database.Database, hoje: string): { alunos: number; devido: number } {
  return db
    .prepare(`${CTE_ALUNOS} SELECT COUNT(*) AS alunos, COALESCE(SUM(devido), 0) AS devido FROM av WHERE situacao = 'pendente'`)
    .get({ hoje }) as { alunos: number; devido: number };
}

export type Vencimento = Pick<AlunoVisao, "id" | "nome" | "telefone" | "plano_nome" | "fim"> & { dias: number };

/** Matrículas que acabam nos próximos dias, sem renovação automática e sem renovação já feita. */
export function vencimentosProximos(db: Database.Database, hoje: string, dias = DIAS_VENCIMENTO): Vencimento[] {
  return db
    .prepare(
      `${CTE_ALUNOS}
       SELECT id, nome, telefone, plano_nome, fim, CAST(julianday(fim) - julianday(@hoje) AS INTEGER) AS dias
       FROM av
       WHERE ativo = 1 AND fim BETWEEN @hoje AND @ate AND renovacao_automatica = 0
         AND NOT EXISTS (SELECT 1 FROM matricula m WHERE m.aluno_id = av.id AND m.cancelada_em IS NULL AND m.inicio > av.fim)
       ORDER BY fim, nome`,
    )
    .all({ hoje, ate: addDias(hoje, dias) }) as Vencimento[];
}

export type EmRisco = Pick<AlunoVisao, "id" | "nome" | "telefone" | "plano_nome" | "ultima_presenca" | "instrutor_nome"> & {
  dias_sem_treinar: number | null;
};

/** Alunos com matrícula válida que não aparecem há mais de N dias (ou nunca vieram). */
export function alunosEmRisco(db: Database.Database, hoje: string, dias = DIAS_RISCO): EmRisco[] {
  return db
    .prepare(
      `${CTE_ALUNOS}
       SELECT id, nome, telefone, plano_nome, ultima_presenca, instrutor_nome,
              CAST(julianday(@hoje) - julianday(COALESCE(ultima_presenca, inicio)) AS INTEGER) AS dias_sem_treinar
       FROM av
       WHERE situacao IN ('ativo', 'pendente')
         AND COALESCE(ultima_presenca, inicio) < @limite
       ORDER BY dias_sem_treinar DESC, nome`,
    )
    .all({ hoje, limite: addDias(hoje, -dias) }) as EmRisco[];
}

export function capacidadeMaxima(db: Database.Database): number {
  const r = db.prepare("SELECT valor FROM config WHERE chave = 'capacidade_maxima'").get() as { valor: string } | undefined;
  return Number(r?.valor) || 40;
}

export type Dentro = { id: number; aluno_id: number; nome: string; hora: string };

/** Quem registrou entrada hoje e ainda não registrou saída. */
export function quemEstaDentro(db: Database.Database, hoje: string): Dentro[] {
  return db
    .prepare(
      `SELECT pr.id, pr.aluno_id, a.nome, pr.hora
       FROM presenca pr JOIN aluno a ON a.id = pr.aluno_id
       WHERE pr.data = ? AND pr.saida IS NULL
       ORDER BY pr.hora`,
    )
    .all(hoje) as Dentro[];
}

export type ReceitaMes = { mes: string; recebido: number; previsto: number };

/** Para cada um dos últimos N meses: quanto entrou (pelo dia do pagamento) e quanto vencia no mês. */
export function receitaPorMes(db: Database.Database, hoje: string, meses = 12): ReceitaMes[] {
  const lista: string[] = [];
  const primeiro = `${hoje.slice(0, 7)}-01`;
  for (let i = meses - 1; i >= 0; i--) lista.push(addMeses(primeiro, -i).slice(0, 7));
  const inicio = `${lista[0]}-01`;

  const recebidos = db
    .prepare(
      `SELECT substr(pago_em, 1, 7) AS mes, SUM(valor_centavos) AS v
       FROM pagamento WHERE pago_em >= ? GROUP BY mes`,
    )
    .all(inicio) as { mes: string; v: number }[];
  const previstos = db
    .prepare(
      `SELECT substr(pg.vencimento, 1, 7) AS mes, SUM(pg.valor_centavos) AS v
       FROM pagamento pg JOIN matricula m ON m.id = pg.matricula_id
       WHERE pg.vencimento >= ? AND pg.vencimento <= ? GROUP BY mes`,
    )
    .all(inicio, `${lista[lista.length - 1]}-31`) as { mes: string; v: number }[];

  const r = Object.fromEntries(recebidos.map((x) => [x.mes, x.v]));
  const p = Object.fromEntries(previstos.map((x) => [x.mes, x.v]));
  return lista.map((mes) => ({ mes, recebido: r[mes] ?? 0, previsto: p[mes] ?? 0 }));
}

export type PagamentoRecebido = {
  id: number;
  aluno_id: number;
  nome: string;
  plano_nome: string;
  parcela: number;
  meses: number;
  valor_centavos: number;
  vencimento: string;
  pago_em: string;
  forma: string;
};

export function pagamentosRecebidos(db: Database.Database, anoMes: string): PagamentoRecebido[] {
  return db
    .prepare(
      `SELECT pg.id, a.id AS aluno_id, a.nome, p.nome AS plano_nome, pg.parcela, p.meses, pg.valor_centavos,
              pg.vencimento, pg.pago_em, pg.forma
       FROM pagamento pg
       JOIN matricula m ON m.id = pg.matricula_id
       JOIN aluno a ON a.id = m.aluno_id
       JOIN plano p ON p.id = m.plano_id
       WHERE substr(pg.pago_em, 1, 7) = ?
       ORDER BY pg.pago_em DESC, pg.id DESC`,
    )
    .all(anoMes) as PagamentoRecebido[];
}

/** Mapa de entradas por dia (para os gráficos de frequência). */
export function entradasPorDia(db: Database.Database, desde: string, alunoId?: number): Record<string, number> {
  const linhas = (
    alunoId
      ? db.prepare("SELECT data, COUNT(*) AS n FROM presenca WHERE data >= ? AND aluno_id = ? GROUP BY data").all(desde, alunoId)
      : db.prepare("SELECT data, COUNT(*) AS n FROM presenca WHERE data >= ? GROUP BY data").all(desde)
  ) as { data: string; n: number }[];
  return Object.fromEntries(linhas.map((l) => [l.data, l.n]));
}

export function contar(db: Database.Database, sql: string, ...params: unknown[]): number {
  return (db.prepare(sql).get(...params) as { n: number }).n;
}

/** Lê os filtros da lista de alunos a partir da URL (a tela e a exportação usam a mesma função). */
export function filtrosDaUrl(ler: (chave: string) => string): FiltrosAlunos {
  const situacao = ler("situacao");
  const ordem = ler("ordem");
  return {
    q: ler("q").trim().slice(0, 80),
    situacao: ["ativo", "pendente", "vencido", "inativo"].includes(situacao) ? situacao : "",
    plano: Number(ler("plano")) || 0,
    instrutor: Number(ler("instrutor")) || 0,
    ordem: ordem in ORDENS_ALUNOS ? ordem : "nome",
    dir: ler("dir") === "desc" ? "desc" : "asc",
  };
}

/** Os mesmos filtros como parâmetros de URL (para links de ordenação, páginas e exportação). */
export function filtrosParaUrl(f: FiltrosAlunos): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.situacao) p.set("situacao", f.situacao);
  if (f.plano) p.set("plano", String(f.plano));
  if (f.instrutor) p.set("instrutor", String(f.instrutor));
  if (f.ordem !== "nome") p.set("ordem", f.ordem);
  if (f.dir !== "asc") p.set("dir", f.dir);
  return p;
}
