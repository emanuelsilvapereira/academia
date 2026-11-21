"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { GRUPO_ROTULO } from "@/lib/format";
import type { FormState } from "@/lib/form";

type Inicial = { nome: string; grupo: string; equipamento: string };

export function ExercicioForm({ acao, inicial }: { acao: (e: FormState, d: FormData) => Promise<FormState>; inicial: Inicial }) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const erros = estado?.erros ?? {};
  const v = (c: keyof Inicial) => estado?.valores?.[c] ?? inicial[c];

  return (
    <form action={executar} noValidate>
      {estado?.mensagem ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}
      <Campo id="nome" rotulo="Nome" erro={erros.nome}>
        <input id="nome" name="nome" maxLength={60} autoComplete="off" defaultValue={v("nome")} aria-invalid={erros.nome ? true : undefined} />
      </Campo>
      <div className="form-row">
        <Campo id="grupo" rotulo="Grupo muscular" erro={erros.grupo}>
          <select id="grupo" name="grupo" defaultValue={v("grupo")} aria-invalid={erros.grupo ? true : undefined}>
            {Object.entries(GRUPO_ROTULO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="equipamento" rotulo="Equipamento" erro={erros.equipamento}>
          <input id="equipamento" name="equipamento" maxLength={40} placeholder="Ex.: Halteres" autoComplete="off" defaultValue={v("equipamento")} aria-invalid={erros.equipamento ? true : undefined} />
        </Campo>
      </div>
      <div className="dlg-actions">
        <button type="submit" className="btn primary" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/exercicios" className="btn">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
