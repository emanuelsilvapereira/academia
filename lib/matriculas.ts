// Operações de matrícula que gravam no banco (recebem a conexão como parâmetro, para poderem ser testadas).
import type Database from "better-sqlite3";
import { fimDaMatricula, gerarParcelas, inicioDaRenovacao } from "./financeiro.ts";

type Plano = { id: number; preco_centavos: number; meses: number };

/** Cria a matrícula e as parcelas dela. Use dentro de uma transação. Devolve o id da matrícula. */
export function criarMatricula(
  db: Database.Database,
  dados: { aluno_id: number; plano_id: number; inicio: string; renovacao_automatica: boolean },
): number {
  const plano = db.prepare("SELECT id, preco_centavos, meses FROM plano WHERE id = ?").get(dados.plano_id) as Plano | undefined;
  if (!plano) throw new Error("Plano não encontrado.");

  const id = Number(
    db
      .prepare(
        `INSERT INTO matricula (aluno_id, plano_id, inicio, fim, valor_centavos, renovacao_automatica)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(dados.aluno_id, plano.id, dados.inicio, fimDaMatricula(dados.inicio, plano.meses), plano.preco_centavos, dados.renovacao_automatica ? 1 : 0)
      .lastInsertRowid,
  );

  const inserir = db.prepare(
    "INSERT INTO pagamento (matricula_id, parcela, valor_centavos, vencimento) VALUES (?, ?, ?, ?)",
  );
  for (const p of gerarParcelas(plano.preco_centavos, plano.meses, dados.inicio)) {
    inserir.run(id, p.parcela, p.valor_centavos, p.vencimento);
  }
  return id;
}

type UltimaMatricula = { id: number; aluno_id: number; plano_id: number; fim: string; renovacao_automatica: number };

/** Matrícula mais recente (não cancelada) de um aluno. */
export function ultimaMatricula(db: Database.Database, alunoId: number): UltimaMatricula | undefined {
  return db
    .prepare(
      `SELECT id, aluno_id, plano_id, fim, renovacao_automatica FROM matricula
       WHERE aluno_id = ? AND cancelada_em IS NULL
       ORDER BY inicio DESC, id DESC LIMIT 1`,
    )
    .get(alunoId) as UltimaMatricula | undefined;
}

/** Renova (cria a próxima matrícula com o mesmo plano ou outro). Devolve o id da nova matrícula. */
export function renovarMatricula(
  db: Database.Database,
  alunoId: number,
  planoId: number,
  renovacaoAutomatica: boolean,
  hoje: string,
): number {
  const atual = ultimaMatricula(db, alunoId);
  return criarMatricula(db, {
    aluno_id: alunoId,
    plano_id: planoId,
    inicio: inicioDaRenovacao(atual?.fim ?? null, hoje),
    renovacao_automatica: renovacaoAutomatica,
  });
}

/**
 * Renovação automática: para alunos ativos cuja última matrícula tem renovação automática e já terminou,
 * cria a próxima. Ela começa no dia seguinte ao fim (ou hoje, se acabou há mais tempo: não cobra os dias
 * em que o aluno ficou sem matrícula). Roda ao abrir as páginas, no máximo uma vez por dia.
 * Devolve quantas matrículas foram criadas.
 */
export function renovarAutomaticas(db: Database.Database, hoje: string): number {
  const vencidas = db
    .prepare(
      `SELECT m.id, m.aluno_id, m.plano_id, m.fim, m.renovacao_automatica
       FROM matricula m JOIN aluno a ON a.id = m.aluno_id
       WHERE a.ativo = 1 AND m.cancelada_em IS NULL AND m.renovacao_automatica = 1 AND m.fim < ?
         AND NOT EXISTS (
           SELECT 1 FROM matricula m2
           WHERE m2.aluno_id = m.aluno_id AND m2.cancelada_em IS NULL AND m2.inicio > m.inicio
         )`,
    )
    .all(hoje) as UltimaMatricula[];

  const executar = db.transaction(() => {
    for (const m of vencidas) {
      criarMatricula(db, {
        aluno_id: m.aluno_id,
        plano_id: m.plano_id,
        inicio: inicioDaRenovacao(m.fim, hoje),
        renovacao_automatica: true,
      });
    }
  });
  executar();
  return vencidas.length;
}
