// "Desfazer" exclusões. Antes de apagar, copiamos o registro e tudo que depende dele (as linhas que o
// ON DELETE CASCADE apagaria) para a tabela lixeira, em JSON. Desfazer recoloca as linhas com os mesmos ids.
// Referências ON DELETE SET NULL (ex.: aluno.instrutor_id) também são lembradas e religadas.
import type Database from "better-sqlite3";

/** Por quanto tempo uma exclusão pode ser desfeita. */
export const PRAZO_DESFAZER_SEGUNDOS = 5 * 60;

type Filho = { tabela: string; coluna: string; filhos?: Filho[] };
type Entidade = { tabela: string; filhos: Filho[]; anular: { tabela: string; coluna: string }[] };

// Para cada tipo que pode ser excluído: o que cai junto (CASCADE) e o que fica sem referência (SET NULL).
// Os filhos vêm na ordem em que precisam ser recolocados (matrícula antes de pagamento, por exemplo).
const ENTIDADES: Record<string, Entidade> = {
  aluno: {
    tabela: "aluno",
    filhos: [
      { tabela: "matricula", coluna: "aluno_id", filhos: [{ tabela: "pagamento", coluna: "matricula_id" }] },
      { tabela: "presenca", coluna: "aluno_id" },
      { tabela: "ficha", coluna: "aluno_id", filhos: [{ tabela: "ficha_item", coluna: "ficha_id" }] },
      { tabela: "avaliacao", coluna: "aluno_id" },
    ],
    anular: [],
  },
  plano: { tabela: "plano", filhos: [], anular: [] },
  presenca: { tabela: "presenca", filhos: [], anular: [] },
  exercicio: { tabela: "exercicio", filhos: [], anular: [] },
  avaliacao: { tabela: "avaliacao", filhos: [], anular: [] },
  ficha: { tabela: "ficha", filhos: [{ tabela: "ficha_item", coluna: "ficha_id" }], anular: [] },
  ficha_item: { tabela: "ficha_item", filhos: [], anular: [] },
  instrutor: {
    tabela: "instrutor",
    filhos: [],
    anular: [
      { tabela: "aluno", coluna: "instrutor_id" },
      { tabela: "ficha", coluna: "instrutor_id" },
      { tabela: "avaliacao", coluna: "instrutor_id" },
      { tabela: "usuario", coluna: "instrutor_id" },
    ],
  },
};

export type TipoExcluivel = keyof typeof ENTIDADES;

type Linha = Record<string, unknown>;
type Copia = {
  linhas: { tabela: string; dados: Linha }[];
  anulados: { tabela: string; coluna: string; ids: number[] }[];
};

function coletarFilhos(db: Database.Database, pai: string, idsPai: number[], filhos: Filho[], destino: Copia["linhas"]) {
  for (const f of filhos) {
    if (idsPai.length === 0) continue;
    const marcadores = idsPai.map(() => "?").join(",");
    const linhas = db.prepare(`SELECT * FROM ${f.tabela} WHERE ${f.coluna} IN (${marcadores}) ORDER BY id`).all(...idsPai) as Linha[];
    for (const dados of linhas) destino.push({ tabela: f.tabela, dados });
    if (f.filhos) coletarFilhos(db, f.tabela, linhas.map((l) => Number(l.id)), f.filhos, destino);
  }
}

/**
 * Copia o registro para a lixeira e o exclui, tudo numa transação.
 * Devolve o id na lixeira (para o botão "Desfazer") ou null se o registro não existia.
 * Erros do banco (ex.: ON DELETE RESTRICT) sobem para quem chamou.
 */
export function excluirComDesfazer(
  db: Database.Database,
  tipo: TipoExcluivel,
  id: number,
  descricao: string,
  usuarioId: number | null,
  agoraSeg = Math.floor(Date.now() / 1000),
): number | null {
  const ent = ENTIDADES[tipo];
  const executar = db.transaction((): number | null => {
    const principal = db.prepare(`SELECT * FROM ${ent.tabela} WHERE id = ?`).get(id) as Linha | undefined;
    if (!principal) return null;

    const copia: Copia = { linhas: [{ tabela: ent.tabela, dados: principal }], anulados: [] };
    coletarFilhos(db, ent.tabela, [id], ent.filhos, copia.linhas);
    for (const a of ent.anular) {
      const ids = (db.prepare(`SELECT id FROM ${a.tabela} WHERE ${a.coluna} = ?`).all(id) as { id: number }[]).map((r) => r.id);
      if (ids.length) copia.anulados.push({ tabela: a.tabela, coluna: a.coluna, ids });
    }

    db.prepare(`DELETE FROM ${ent.tabela} WHERE id = ?`).run(id);

    // Limpa itens antigos da lixeira (passaram do prazo de desfazer).
    db.prepare("DELETE FROM lixeira WHERE excluido_em < ?").run(agoraSeg - 24 * 60 * 60);

    return Number(
      db
        .prepare(
          "INSERT INTO lixeira (entidade, entidade_id, descricao, dados, excluido_em, usuario_id) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(tipo, id, descricao, JSON.stringify(copia), agoraSeg, usuarioId).lastInsertRowid,
    );
  });
  return executar();
}

export type ResultadoRestauracao =
  | { ok: true; entidade: string; entidadeId: number; descricao: string }
  | { ok: false; motivo: string };

/** Recoloca no banco o que foi excluído. Só vale dentro do prazo e uma única vez. */
export function restaurar(
  db: Database.Database,
  lixeiraId: number,
  agoraSeg = Math.floor(Date.now() / 1000),
): ResultadoRestauracao {
  const item = db.prepare("SELECT * FROM lixeira WHERE id = ?").get(lixeiraId) as
    | { entidade: string; entidade_id: number; descricao: string; dados: string; excluido_em: number; restaurado: number }
    | undefined;
  if (!item || item.restaurado) return { ok: false, motivo: "Não há nada para desfazer." };
  if (agoraSeg - item.excluido_em > PRAZO_DESFAZER_SEGUNDOS) return { ok: false, motivo: "O prazo para desfazer já passou." };

  const copia = JSON.parse(item.dados) as Copia;
  try {
    db.transaction(() => {
      for (const { tabela, dados } of copia.linhas) {
        const colunas = Object.keys(dados);
        db.prepare(
          `INSERT INTO ${tabela} (${colunas.map((c) => `"${c}"`).join(", ")}) VALUES (${colunas.map((c) => `@${c}`).join(", ")})`,
        ).run(dados);
      }
      for (const a of copia.anulados) {
        const religar = db.prepare(`UPDATE ${a.tabela} SET ${a.coluna} = ? WHERE id = ? AND ${a.coluna} IS NULL`);
        for (const id of a.ids) religar.run(item.entidade_id, id);
      }
      db.prepare("UPDATE lixeira SET restaurado = 1 WHERE id = ?").run(lixeiraId);
    })();
  } catch {
    // Ex.: alguém cadastrou outro aluno com o mesmo e-mail depois da exclusão.
    return { ok: false, motivo: "Não foi possível desfazer: algum dado entrou em conflito com um cadastro novo." };
  }
  return { ok: true, entidade: item.entidade, entidadeId: item.entidade_id, descricao: item.descricao };
}
