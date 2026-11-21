"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Recarrega os dados da página de tempos em tempos (lotação ao vivo), só enquanto a aba está visível.
export function AtualizarSozinho({ segundos = 30 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}
