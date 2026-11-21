// Gera CSV no formato que o Excel em português abre direto: separador ";", acentos em UTF-8 (com BOM).

/** Protege contra "injeção de fórmula": células que começam com = + - @ viram texto no Excel. */
function celula(valor: string | number | null | undefined): string {
  let s = valor === null || valor === undefined ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function gerarCsv(colunas: string[], linhas: (string | number | null)[][]): string {
  const todas = [colunas, ...linhas].map((l) => l.map(celula).join(";"));
  return `﻿${todas.join("\r\n")}\r\n`;
}
