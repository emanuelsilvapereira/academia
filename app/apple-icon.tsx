import { ImageResponse } from "next/og";
import { IconeApp } from "@/components/icone-app";

// Ícone usado pelo iPhone em "Adicionar à Tela de Início".
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<IconeApp tamanho={180} />, size);
}
