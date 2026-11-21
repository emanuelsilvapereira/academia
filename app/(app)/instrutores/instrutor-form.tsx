"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { InputMascara } from "@/components/input-mascara";
import type { FormState } from "@/lib/form";

type Inicial = { nome: string; email: string; telefone: string; especialidade: string; ativo: string };

export function InstrutorForm({
  acao,
  inicial,
  editar,
}: {
  acao: (e: FormState, d: FormData) => Promise<FormState>;
  inicial: Inicial;
  editar: boolean;
}) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const erros = estado?.erros ?? {};
  const v = (c: keyof Inicial) => estado?.valores?.[c] ?? inicial[c];
  const inv = (c: string) => (erros[c] ? true : undefined);

  return (
    <form action={executar} noValidate>
      {estado?.mensagem ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}
      <Campo id="nome" rotulo="Nome completo" erro={erros.nome}>
        <input id="nome" name="nome" maxLength={80} autoComplete="off" defaultValue={v("nome")} aria-invalid={inv("nome")} />
      </Campo>
      <div className="form-row">
        <Campo id="email" rotulo="E-mail" erro={erros.email}>
          <input id="email" name="email" type="email" maxLength={80} autoComplete="off" defaultValue={v("email")} aria-invalid={inv("email")} />
        </Campo>
        <Campo id="telefone" rotulo="Telefone" erro={erros.telefone}>
          <InputMascara mascara="telefone" id="telefone" name="telefone" defaultValue={v("telefone")} aria-invalid={inv("telefone")} />
        </Campo>
      </div>
      <Campo id="especialidade" rotulo="Especialidade" erro={erros.especialidade}>
        <input id="especialidade" name="especialidade" maxLength={60} placeholder="Ex.: Musculação" autoComplete="off" defaultValue={v("especialidade")} aria-invalid={inv("especialidade")} />
      </Campo>
      {editar ? (
        <label className="check">
          <input type="checkbox" name="ativo" defaultChecked={v("ativo") === "on"} />
          <span>
            Instrutor ativo <span className="muted">(inativos não aparecem para novos alunos)</span>
          </span>
        </label>
      ) : null}
      <div className="dlg-actions">
        <button type="submit" className="btn primary" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/instrutores" className="btn">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
