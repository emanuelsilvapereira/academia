"use client";

import { useActionState, useEffect, useRef } from "react";
import { useAvisos } from "@/components/avisos";
import { Campo } from "@/components/campo";
import { alterarSenhaAluno } from "../../actions";

export function AlterarSenhaForm() {
  const [estado, executar, pendente] = useActionState(alterarSenhaAluno, undefined);
  const form = useRef<HTMLFormElement>(null);
  const { avisar } = useAvisos();
  const erros = estado?.erros ?? {};

  useEffect(() => {
    if (estado?.ok && estado.mensagem) {
      avisar({ texto: estado.mensagem });
      form.current?.reset();
    }
  }, [estado, avisar]);

  return (
    <form ref={form} action={executar} noValidate>
      <Campo id="atual" rotulo="Senha atual" erro={erros.atual}>
        <input id="atual" name="atual" type="password" autoComplete="current-password" aria-invalid={erros.atual ? true : undefined} />
      </Campo>
      <Campo id="senha" rotulo="Nova senha (mínimo 6 caracteres)" erro={erros.senha}>
        <input id="senha" name="senha" type="password" autoComplete="new-password" aria-invalid={erros.senha ? true : undefined} />
      </Campo>
      <Campo id="confirmacao" rotulo="Repita a nova senha" erro={erros.confirmacao}>
        <input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" aria-invalid={erros.confirmacao ? true : undefined} />
      </Campo>
      <button type="submit" className="btn primary" disabled={pendente}>
        {pendente ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
