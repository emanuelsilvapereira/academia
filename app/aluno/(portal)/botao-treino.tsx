"use client";

import { useTransition } from "react";
import { useAvisos } from "@/components/avisos";
import { alternarTreinoFeito } from "../actions";

/** Botão "Concluí este treino" (marca ou desmarca a ficha no dia de hoje). */
export function BotaoTreinoFeito({ letra, feito, classe = "" }: { letra: string; feito: boolean; classe?: string }) {
  const [pendente, iniciar] = useTransition();
  const { avisar } = useAvisos();
  return (
    <button
      type="button"
      className={`btn ${feito ? "" : "primary"} ${classe}`}
      aria-pressed={feito}
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await alternarTreinoFeito(letra);
          avisar({ texto: r.mensagem, erro: !r.ok });
        })
      }
    >
      {pendente ? "Salvando…" : feito ? `✓ Ficha ${letra} concluída hoje` : `Concluí a ficha ${letra}`}
    </button>
  );
}
