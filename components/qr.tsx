import QRCode from "qrcode";

// QR code gerado no servidor como SVG (não precisa de internet nem de imagem externa).
export async function QrCode({ texto, tamanho = 148 }: { texto: string; tamanho?: number }) {
  const svg = await QRCode.toString(texto, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  return (
    <div
      className="qr"
      style={{ width: tamanho, height: tamanho }}
      role="img"
      aria-label={`QR code ${texto}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
