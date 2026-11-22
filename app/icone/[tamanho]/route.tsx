import { ImageResponse } from "next/og";
import { IconeApp } from "@/components/icone-app";

// Ícones PNG do aplicativo instalável (192 e 512 px), gerados na hora a partir do logo.
const TAMANHOS = [192, 512];

export async function GET(_request: Request, ctx: { params: Promise<{ tamanho: string }> }) {
  const tamanho = Number((await ctx.params).tamanho);
  if (!TAMANHOS.includes(tamanho)) return new Response("Tamanho não disponível", { status: 404 });
  return new ImageResponse(<IconeApp tamanho={tamanho} />, {
    width: tamanho,
    height: tamanho,
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
