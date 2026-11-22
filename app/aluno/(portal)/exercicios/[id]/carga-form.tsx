"use client";

import { useActionState, useEffect, useRef } from "react";
import { useAvisos } from "@/components/avisos";
import { Campo } from "@/components/campo";
import type { FormState } from "@/lib/form";

export function CargaForm({ acao, sugestao }: { acao: (e: FormState, d: FormData) => Promise<FormState>; sugestao: { carga: string; reps: string } }) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const form = useRef<HTMLFormElement>(null);
  const { avisar } = useAvisos();
  const erros = estado?.erros ?? {};
  useEffect(() => {
    if (estado?.ok && estado.mensagem) avisar({ texto: estado.mensagem });
    else if (estado?.mensagem && !estado.ok) avisar({ texto: estado.mensagem, erro: true });
  }, [estado, avisar]);

  return (
    <form ref={form} action={executar} className="linha-form" noValidate>
      <Campo id="carga_kg" rotulo="Carga de hoje (kg)" erro={erros.carga_kg}>
        <input id="carga_kg" name="carga_kg" inputMode="decimal" defaultValue={estado?.valores?.carga_kg ?? sugestao.carga} className="curto" aria-invalid={erros.carga_kg ? true : undefined} />
      </Campo>
      <Campo id="repeticoes" rotulo="Repetições" erro={erros.repeticoes}>
        <input id="repeticoes" name="repeticoes" type="number" min={1} max={100} defaultValue={estado?.valores?.repeticoes ?? sugestao.reps} className="curto" />
      </Campo>
      <button type="submit" className="btn primary sm" disabled={pendente}>
        {pendente ? "Salvando…" : "Anotar"}
      </button>
    </form>
  );
}
