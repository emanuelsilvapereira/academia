// Abre (ou cria) o banco SQLite. Separado de lib/db.ts para os testes usarem um banco em memória.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { aplicarAnimacoes, prepararExtrasDemo, prepararPortalDemo, seedDatabase } from "./seed.ts";

/** Versão do modelo do banco. Suba este número quando o db/schema.sql mudar de forma incompatível. */
export const VERSAO_BANCO = 6;

/** A partir desta versão o banco é atualizado no lugar (sem perder dados). Versões mais antigas são recriadas. */
const VERSAO_MIGRAVEL = 2;

/** Colunas novas da versão 3 (portal do aluno, rotina de treino e detalhes dos exercícios). */
const COLUNAS_V3: [tabela: string, coluna: string, definicao: string][] = [
  ["aluno", "senha_hash", "TEXT"],
  ["exercicio", "descricao", "TEXT NOT NULL DEFAULT ''"],
  ["exercicio", "execucao", "TEXT NOT NULL DEFAULT ''"],
  ["exercicio", "dicas", "TEXT NOT NULL DEFAULT ''"],
  ["exercicio", "musculos_primarios", "TEXT NOT NULL DEFAULT ''"],
  ["exercicio", "musculos_secundarios", "TEXT NOT NULL DEFAULT ''"],
  ["exercicio", "video_url", "TEXT NOT NULL DEFAULT ''"],
  ["ficha", "dias", "TEXT NOT NULL DEFAULT ''"],
];

/** Colunas novas da versão 4 (Pix informado pelo aluno). As tabelas novas vêm do próprio schema.sql. */
const COLUNAS_V4: [tabela: string, coluna: string, definicao: string][] = [["pagamento", "informado_em", "TEXT"]];

/** Versão 6: animação de cada exercício (pasta com as fotos em public/exercicios). */
const COLUNAS_V6: [tabela: string, coluna: string, definicao: string][] = [["exercicio", "animacao", "TEXT NOT NULL DEFAULT ''"]];

function adicionarColunas(db: Database.Database, colunas: [string, string, string][]): void {
  for (const [tabela, coluna, definicao] of colunas) {
    const existe = (db.prepare(`PRAGMA table_info(${tabela})`).all() as { name: string }[]).some((c) => c.name === coluna);
    if (!existe) db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
  }
}

/** Atualiza um banco antigo (versão 2 ou 3) passo a passo até a versão atual, sem perder dados. */
function migrar(db: Database.Database, versao: number): void {
  if (versao < 3) {
    adicionarColunas(db, COLUNAS_V3);
    prepararPortalDemo(db);
  }
  if (versao < 4) {
    adicionarColunas(db, COLUNAS_V4);
    prepararExtrasDemo(db);
  }
  if (versao < 6) {
    adicionarColunas(db, COLUNAS_V6);
    aplicarAnimacoes(db);
  }
}

function configurar(db: Database.Database, schemaSql: string, comDemo: boolean): void {
  db.pragma("foreign_keys = ON"); // sem isso o SQLite ignora as chaves estrangeiras
  const versao = db.pragma("user_version", { simple: true }) as number;
  db.exec(schemaSql);
  if (versao >= VERSAO_MIGRAVEL && versao < VERSAO_BANCO) db.transaction(() => migrar(db, versao))();
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
 * Abre o arquivo do banco. Bancos a partir da versão 2 são atualizados no lugar. Se for da versão 1 (modelo incompatível), o arquivo
 * antigo é guardado como pulso.v1.bak.db e um banco novo é criado com os dados de demonstração.
 */
export function abrirArquivo(arquivo: string): Database.Database {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });

  let db = new Database(arquivo);
  const versao = db.pragma("user_version", { simple: true }) as number;
  const temTabelas = (db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'").get() as { n: number }).n > 0;

  if (temTabelas && versao < VERSAO_MIGRAVEL) {
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
