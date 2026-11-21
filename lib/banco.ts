// Abre (ou cria) o banco SQLite. Separado de lib/db.ts para os testes usarem um banco em memória.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seedDatabase } from "./seed.ts";

/** Versão do modelo do banco. Suba este número quando o db/schema.sql mudar de forma incompatível. */
export const VERSAO_BANCO = 2;

function configurar(db: Database.Database, schemaSql: string, comDemo: boolean): void {
  db.pragma("foreign_keys = ON"); // sem isso o SQLite ignora as chaves estrangeiras
  db.exec(schemaSql);
  db.pragma(`user_version = ${VERSAO_BANCO}`);

  // Primeira execução: carrega os dados fictícios de demonstração.
  const carregar = db.transaction(() => {
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM usuario").get() as { n: number };
    if (n === 0 && comDemo) seedDatabase(db);
  });
  carregar.immediate();
}

export function lerSchema(raiz = process.cwd()): string {
  return fs.readFileSync(path.join(raiz, "db", "schema.sql"), "utf8");
}

/** Banco em memória (testes). */
export function bancoEmMemoria(opcoes: { demo?: boolean } = {}): Database.Database {
  const db = new Database(":memory:");
  configurar(db, lerSchema(), opcoes.demo ?? true);
  return db;
}

/**
 * Abre o arquivo do banco. Se ele for de uma versão antiga do sistema (modelo incompatível), o arquivo
 * antigo é guardado como pulso.v1.bak.db e um banco novo é criado com os dados de demonstração.
 */
export function abrirArquivo(arquivo: string): Database.Database {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });

  let db = new Database(arquivo);
  const versao = db.pragma("user_version", { simple: true }) as number;
  const temTabelas = (db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'").get() as { n: number }).n > 0;

  if (temTabelas && versao < VERSAO_BANCO) {
    db.close();
    const copia = arquivo.replace(/\.db$/, `.v${versao || 1}.bak.db`);
    fs.rmSync(copia, { force: true });
    fs.renameSync(arquivo, copia);
    for (const extra of ["-wal", "-shm"]) fs.rmSync(`${arquivo}${extra}`, { force: true });
    console.warn(`[pulso] Banco antigo guardado em ${copia}. Um banco novo (versão ${VERSAO_BANCO}) foi criado.`);
    db = new Database(arquivo);
  }

  db.pragma("journal_mode = WAL");
  configurar(db, lerSchema(), true);
  return db;
}
