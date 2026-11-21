"use client";

import { useActionState, useEffect } from "react";
import { useAvisos } from "@/components/avisos";
import { salvarCapacidade } from "./actions";

export function CapacidadeForm({ atual }: { atual: number }) {
  const [estado, executar, pendente] = useActionState(salvarCapacidade, undefined);
  const { avisar } = useAvisos();
  useEffect(() => {
    if (estado?.ok && estado.mensagem) avisar({ texto: estado.mensagem });
  }, [estado, avisar]);

  return (
    <form action={executar} className="receber" noValidate>
      <label htmlFor="capacidade" className="muted small" style={{ margin: 0 }}>
        Capacidade máxima
      </label>
      <input id="capacidade" name="capacidade" type="number" min={1} max={2000} defaultValue={estado?.valores?.capacidade ?? atual} className="curto" />
      <button type="submit" className="btn sm" disabled={pendente}>
        Salvar
      </button>
      {estado?.erros?.capacidade ? <span className="err">{estado.erros.capacidade}</span> : null}
    </form>
  );
}
