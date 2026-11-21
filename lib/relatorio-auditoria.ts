// Consulta do log de auditoria (tela e exportação).
import type Database from "better-sqlite3";
import { ACAO_ROTULO, ENTIDADE_ROTULO } from "./auditoria.ts";
import { dataISOValida } from "./validacao.ts";

export const POR_PAGINA_AUDITORIA = 30;

export type FiltrosAuditoria = { q: string; acao: string; entidade: string; de: string; ate: string };

export function filtrosAuditoria(ler: (k: string) => string): FiltrosAuditoria {
  return {
    q: ler("q").trim().slice(0, 80),
    acao: ler("acao") in ACAO_ROTULO ? ler("acao") : "",
    entidade: ler("entidade") in ENTIDADE_ROTULO ? ler("entidade") : "",
    de: dataISOValida(ler("de")) ? ler("de") : "",
    ate: dataISOValida(ler("ate")) ? ler("ate") : "",
  };
}

export type LinhaAuditoria = { id: number; quando: string; usuario_email: string; acao: string; entidade: string; entidade_id: number | null; descricao: string };

export function consultarAuditoria(db: Database.Database, f: FiltrosAuditoria, pagina: number | null): { total: number; linhas: LinhaAuditoria[] } {
  const like = `%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const where = `WHERE (@q = '' OR descricao LIKE @like ESCAPE '\\' OR usuario_email LIKE @like ESCAPE '\\')
      AND (@acao = '' OR acao = @acao)
      AND (@entidade = '' OR entidade = @entidade OR (@entidade = 'ficha' AND entidade = 'ficha_item'))
      AND (@de = '' OR quando >= @de)
      AND (@ate = '' OR quando < date(@ate, '+1 day'))`;
  const params = { ...f, like };
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM auditoria ${where}`).get(params) as { n: number }).n;
  const limite = pagina === null ? "LIMIT 5000" : `LIMIT ${POR_PAGINA_AUDITORIA} OFFSET ${(Math.max(1, pagina) - 1) * POR_PAGINA_AUDITORIA}`;
  const linhas = db.prepare(`SELECT * FROM auditoria ${where} ORDER BY quando DESC, id DESC ${limite}`).all(params) as LinhaAuditoria[];
  return { total, linhas };
}
