"use client";

import { useActionState, useEffect } from "react";
import { useAvisos } from "@/components/avisos";
import { Campo } from "@/components/campo";
import { salvarPix } from "./actions";

export function PixForm({ inicial }: { inicial: { chave: string; nome: string; cidade: string } }) {
  const [estado, executar, pendente] = useActionState(salvarPix, undefined);
  const { avisar } = useAvisos();
  const erros = estado?.erros ?? {};
  const v = (c: keyof typeof inicial) => estado?.valores?.[c] ?? inicial[c];
  useEffect(() => {
    if (estado?.ok && estado.mensagem) avisar({ texto: estado.mensagem });
  }, [estado, avisar]);

  return (
    <form action={executar} noValidate>
      <Campo id="pix-chave" rotulo="Chave Pix da academia" erro={erros.chave}>
        <input id="pix-chave" name="chave" defaultValue={v("chave")} autoComplete="off" aria-invalid={erros.chave ? true : undefined} />
      </Campo>
      <div className="form-row">
        <Campo id="pix-nome" rotulo="Nome do recebedor" erro={erros.nome}>
          <input id="pix-nome" name="nome" defaultValue={v("nome")} maxLength={25} aria-invalid={erros.nome ? true : undefined} />
        </Campo>
        <Campo id="pix-cidade" rotulo="Cidade" erro={erros.cidade}>
          <input id="pix-cidade" name="cidade" defaultValue={v("cidade")} maxLength={15} aria-invalid={erros.cidade ? true : undefined} />
        </Campo>
      </div>
      <button type="submit" className="btn primary sm" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar Pix"}
      </button>
    </form>
  );
}
