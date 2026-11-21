// Restaura uma cópia de segurança: npm run db:restore -- backups/pulso-AAAAMMDD-HHMMSS.db
// Pare o servidor antes. O banco atual é guardado como data/pulso.antes-da-restauracao.db.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const arquivo = process.argv[2];
if (!arquivo || !fs.existsSync(arquivo)) {
  const pasta = path.join(process.cwd(), "backups");
  const lista = fs.existsSync(pasta) ? fs.readdirSync(pasta).filter((f) => f.endsWith(".db")).sort().reverse() : [];
  console.error("Uso: npm run db:restore -- backups/<arquivo>.db");
  if (lista.length) console.error(`Cópias disponíveis:\n  ${lista.map((f) => `backups/${f}`).join("\n  ")}`);
  process.exit(1);
}

const teste = new Database(arquivo, { readonly: true });
const ok = teste.pragma("integrity_check", { simple: true }) === "ok";
teste.close();
if (!ok) {
  console.error("Esse arquivo não passou na verificação de integridade. Nada foi alterado.");
  process.exit(1);
}

const base = path.join(process.cwd(), "data", "pulso.db");
fs.mkdirSync(path.dirname(base), { recursive: true });
if (fs.existsSync(base)) fs.copyFileSync(base, path.join(process.cwd(), "data", "pulso.antes-da-restauracao.db"));
for (const extra of ["-wal", "-shm"]) fs.rmSync(`${base}${extra}`, { force: true });
fs.copyFileSync(arquivo, base);
console.log(`Banco restaurado a partir de ${arquivo}. Inicie o sistema de novo.`);
