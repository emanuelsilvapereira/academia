"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Campo } from "@/components/campo";
import type { FormState } from "@/lib/form";

type Inicial = { nome: string; preco: string; meses: string };

export function PlanoForm({
  acao,
  inicial,
}: {
  acao: (estado: FormState, dados: FormData) => Promise<FormState>;
  inicial: Inicial;
}) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const erros = estado?.erros ?? {};
  const v = (campo: keyof Inicial) => estado?.valores?.[campo] ?? inicial[campo];
  const inv = (campo: string) => (erros[campo] ? true : undefined);

  return (
    <form action={executar} noValidate>
      {estado?.mensagem ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}

      <Campo id="nome" rotulo="Nome" erro={erros.nome}>
        <input id="nome" name="nome" maxLength={30} autoComplete="off" defaultValue={v("nome")} aria-invalid={inv("nome")} />
      </Campo>

      <div className="form-row">
        <Campo id="preco" rotulo="Preço (R$)" erro={erros.preco}>
          <input id="preco" name="preco" inputMode="decimal" placeholder="99,90" autoComplete="off" defaultValue={v("preco")} aria-invalid={inv("preco")} />
        </Campo>
        <Campo id="meses" rotulo="Duração (meses)" erro={erros.meses}>
          <input id="meses" name="meses" type="number" min={1} max={24} step={1} defaultValue={v("meses")} aria-invalid={inv("meses")} />
        </Campo>
      </div>

      <div className="dlg-actions">
        <button type="submit" className="btn primary" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/planos" className="btn">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
