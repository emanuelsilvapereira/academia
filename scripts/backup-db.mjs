// Cópia de segurança do banco: npm run db:backup
// Usa a API de backup do SQLite, que gera uma cópia consistente mesmo com o sistema rodando.
// Guarda as 10 cópias mais recentes em backups/.
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const MANTER = 10;
const origem = path.join(process.cwd(), "data", "pulso.db");
const pasta = path.join(process.cwd(), "backups");

if (!fs.existsSync(origem)) {
  console.error("Não há banco para copiar (data/pulso.db ainda não existe). Rode o sistema uma vez antes.");
  process.exit(1);
}
fs.mkdirSync(pasta, { recursive: true });

const carimbo = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const destino = path.join(pasta, `pulso-${carimbo}.db`);

const db = new Database(origem, { readonly: true, fileMustExist: true });
await db.backup(destino);
db.close();

// Confere se a cópia abre e está íntegra.
const copia = new Database(destino, { readonly: true });
const integridade = copia.pragma("integrity_check", { simple: true });
const alunos = copia.prepare("SELECT COUNT(*) AS n FROM aluno").get().n;
copia.close();
if (integridade !== "ok") {
  console.error(`A cópia ${destino} falhou na verificação de integridade: ${integridade}`);
  process.exit(1);
}

const antigas = fs.readdirSync(pasta).filter((f) => /^pulso-\d{8}-\d{6}\.db$/.test(f)).sort().reverse().slice(MANTER);
for (const f of antigas) fs.unlinkSync(path.join(pasta, f));

const kb = Math.round(fs.statSync(destino).size / 1024);
console.log(`Backup criado: ${path.relative(process.cwd(), destino)} (${kb} KB, ${alunos} alunos, integridade ok).`);
if (antigas.length) console.log(`${antigas.length} cópia(s) antiga(s) removida(s); ficam as ${MANTER} mais recentes.`);
