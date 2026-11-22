"use client";

import { useState } from "react";

/** Botão que copia um texto (ex.: Pix copia e cola) para a área de transferência. */
export function BotaoCopiar({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="btn primary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
        } catch {
          // Navegadores antigos ou página sem https: seleciona o texto do campo para copiar à mão.
          const campo = document.getElementById("pix-codigo") as HTMLTextAreaElement | null;
          campo?.select();
          document.execCommand?.("copy");
        }
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      }}
    >
      {copiado ? "✓ Copiado" : rotulo}
    </button>
  );
}
