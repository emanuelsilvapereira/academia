import type Database from "better-sqlite3";
import path from "node:path";
import { abrirArquivo } from "./banco.ts";
import { hojeISO } from "./format.ts";
import { renovarAutomaticas } from "./matriculas.ts";

// Uma única conexão por processo (evita abrir várias no modo de desenvolvimento).
const global = globalThis as unknown as { __pulsoDb?: Database.Database; __pulsoManutencao?: string };

export function getDb(): Database.Database {
  if (!global.__pulsoDb) global.__pulsoDb = abrirArquivo(path.join(process.cwd(), "data", "pulso.db"));
  const db = global.__pulsoDb;

  // Tarefas diárias (no máximo uma vez por dia): renovação automática de matrículas.
  const hoje = hojeISO();
  if (global.__pulsoManutencao !== hoje) {
    global.__pulsoManutencao = hoje;
    try {
      renovarAutomaticas(db, hoje);
    } catch (e) {
      console.error("[pulso] Falha na renovação automática:", e);
    }
  }
  return db;
}
