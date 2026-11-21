// Apaga o banco local. Na próxima vez que o sistema abrir, ele é recriado com os dados de demonstração.
import fs from "node:fs";
import path from "node:path";

const base = path.join(process.cwd(), "data", "pulso.db");
for (const arquivo of [base, `${base}-wal`, `${base}-shm`]) {
  if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo);
}
console.log("Banco apagado. Ele será recriado (com os dados de demonstração) na próxima execução.");
