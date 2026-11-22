// "Pix copia e cola" (BR Code estático, padrão EMV do Banco Central).
// O aluno paga pelo app do banco; o dinheiro vai direto para a chave da academia. O sistema não
// confirma o pagamento sozinho: a recepção confere o extrato e registra (não há integração bancária).

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do BR Code. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (const byte of Buffer.from(texto, "utf8")) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Campo no formato ID + tamanho (2 dígitos) + valor. */
function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/** Tira acentos e caracteres que o padrão não aceita (nome e cidade do recebedor). */
export function limparTexto(texto: string, max: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .-]/g, "")
    .toUpperCase()
    .trim()
    .slice(0, max);
}

export type DadosPix = { chave: string; nome: string; cidade: string; valorCentavos: number; identificador: string; descricao?: string };

export function pixCopiaECola(d: DadosPix): string {
  const conta = campo("00", "br.gov.bcb.pix") + campo("01", d.chave.trim()) + (d.descricao ? campo("02", limparTexto(d.descricao, 40)) : "");
  const txid = d.identificador.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const semCrc =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") + // real
    campo("54", (d.valorCentavos / 100).toFixed(2)) +
    campo("58", "BR") +
    campo("59", limparTexto(d.nome, 25) || "ACADEMIA") +
    campo("60", limparTexto(d.cidade, 15) || "BRASIL") +
    campo("62", campo("05", txid)) +
    "6304";
  return semCrc + crc16(semCrc);
}

/** Lê a configuração do Pix da academia (tabela config). null = Pix ainda não configurado. */
export function configPix(lerConfig: (chave: string) => string | undefined): { chave: string; nome: string; cidade: string } | null {
  const chave = lerConfig("pix_chave")?.trim();
  if (!chave) return null;
  return { chave, nome: lerConfig("pix_nome") ?? "ACADEMIA", cidade: lerConfig("pix_cidade") ?? "BRASIL" };
}
