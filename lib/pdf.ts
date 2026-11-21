// Gerador de PDF mínimo (tabela com título), escrito à mão para não depender de biblioteca.
// Usa as fontes padrão do PDF (Helvetica), que todo leitor já tem, com codificação WinAnsi (acentos do português).

export type ColunaPdf = { titulo: string; largura: number; direita?: boolean }; // largura: proporção
export type TabelaPdf = { titulo: string; subtitulo?: string; colunas: ColunaPdf[]; linhas: string[][]; rodape?: string };

// Larguras da Helvetica (em milésimos do tamanho da fonte) para os caracteres 32 a 126.
const LARGURAS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556,
  556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

// Caracteres fora do Latin-1 que a codificação WinAnsi tem em 0x80–0x9F.
const WINANSI: Record<string, number> = { "€": 0x80, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "×": 0xd7 };

function larguraChar(c: string, negrito: boolean): number {
  const base = c.normalize("NFD")[0] ?? c; // "ã" mede como "a"
  const cod = base.charCodeAt(0);
  const w = cod >= 32 && cod <= 126 ? LARGURAS[cod - 32] : c === "—" ? 1000 : 556;
  return negrito ? w * 1.06 : w;
}

export function larguraTexto(s: string, tamanho: number, negrito = false): number {
  let total = 0;
  for (const c of s) total += larguraChar(c, negrito);
  return (total / 1000) * tamanho;
}

/** Corta o texto com "…" para caber na largura. */
function caber(s: string, max: number, tamanho: number, negrito = false): string {
  if (larguraTexto(s, tamanho, negrito) <= max) return s;
  let r = s;
  while (r.length > 1 && larguraTexto(`${r}…`, tamanho, negrito) > max) r = r.slice(0, -1);
  return `${r.trimEnd()}…`;
}

/** Texto -> bytes WinAnsi já escapados para uma string literal do PDF. */
function literal(s: string): string {
  let r = "";
  for (const c of s) {
    let cod = WINANSI[c] ?? c.charCodeAt(0);
    if (cod > 255 || (cod >= 0x80 && cod <= 0x9f && !Object.values(WINANSI).includes(cod))) cod = 63; // "?"
    const ch = String.fromCharCode(cod);
    r += ch === "(" || ch === ")" || ch === "\\" ? `\\${ch}` : ch;
  }
  return `(${r})`;
}

export function gerarPdf(t: TabelaPdf, agora = new Date()): Uint8Array {
  const paisagem = t.colunas.length > 5;
  const [W, H] = paisagem ? [842, 595] : [595, 842];
  const M = 40; // margem
  const areaL = W - 2 * M;
  const somaLarg = t.colunas.reduce((s, c) => s + c.largura, 0);
  const larguras = t.colunas.map((c) => (c.largura / somaLarg) * areaL);
  const LINHA = 17, FONTE = 8.5, PAD = 4;

  const paginas: string[] = [];
  let i = 0;
  do {
    const cmd: string[] = [];
    const texto = (x: number, y: number, s: string, tam: number, negrito = false, cinza = false) =>
      cmd.push(`BT /${negrito ? "F2" : "F1"} ${tam} Tf ${cinza ? "0.42 g" : "0 g"} ${x.toFixed(2)} ${y.toFixed(2)} Td ${literal(s)} Tj ET`);
    const linha = (y: number, cinza = 0.8) => cmd.push(`${cinza} G 0.5 w ${M} ${y.toFixed(2)} m ${W - M} ${y.toFixed(2)} l S`);

    let y = H - M - 14;
    if (paginas.length === 0) {
      texto(M, y, t.titulo, 16, true);
      y -= 16;
      if (t.subtitulo) {
        texto(M, y, caber(t.subtitulo, areaL, 9), 9, false, true);
        y -= 14;
      }
      y -= 10;
    } else {
      texto(M, y, `${t.titulo} (continuação)`, 10, true);
      y -= 22;
    }

    // Cabeçalho da tabela
    let x = M;
    t.colunas.forEach((c, k) => {
      const s = caber(c.titulo, larguras[k] - 2 * PAD, FONTE, true);
      const dx = c.direita ? larguras[k] - PAD - larguraTexto(s, FONTE, true) : PAD;
      texto(x + dx, y, s, FONTE, true);
      x += larguras[k];
    });
    y -= 6;
    linha(y, 0.2);
    y -= LINHA - 4;

    while (i < t.linhas.length && y > M + 24) {
      x = M;
      t.linhas[i].forEach((v, k) => {
        const s = caber(v ?? "", larguras[k] - 2 * PAD, FONTE);
        const dx = t.colunas[k]?.direita ? larguras[k] - PAD - larguraTexto(s, FONTE) : PAD;
        texto(x + dx, y, s, FONTE);
        x += larguras[k];
      });
      linha(y - 6);
      y -= LINHA;
      i++;
    }
    if (t.linhas.length === 0) texto(M + PAD, y, "Nenhum registro.", FONTE, false, true);
    paginas.push(cmd.join("\n"));
  } while (i < t.linhas.length);

  // Rodapé (precisa do total de páginas)
  const dataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(agora);
  const corpos = paginas.map((p, n) => {
    const rodape = `${t.rodape ?? "Pulso · Gestão de Academia"} · gerado em ${dataHora} · página ${n + 1} de ${paginas.length}`;
    return `${p}\nBT /F1 7.5 Tf 0.42 g ${M} ${M - 14} Td ${literal(rodape)} Tj ET`;
  });

  // Monta os objetos do PDF e a tabela de referências (xref) com as posições em bytes.
  const objetos: string[] = [];
  const kids = corpos.map((_, n) => `${5 + n * 2} 0 R`).join(" ");
  objetos.push("<< /Type /Catalog /Pages 2 0 R >>");
  objetos.push(`<< /Type /Pages /Kids [${kids}] /Count ${corpos.length} >>`);
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objetos.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  corpos.forEach((c, n) => {
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + n * 2} 0 R >>`);
    objetos.push(`<< /Length ${Buffer.byteLength(c, "latin1")} >>\nstream\n${c}\nendstream`);
  });

  let saida = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const posicoes: number[] = [];
  objetos.forEach((o, n) => {
    posicoes.push(Buffer.byteLength(saida, "latin1"));
    saida += `${n + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(saida, "latin1");
  saida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const p of posicoes) saida += `${String(p).padStart(10, "0")} 00000 n \n`;
  saida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(saida, "latin1"));
}
