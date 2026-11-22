"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Campo } from "@/components/campo";
import type { FormState } from "@/lib/form";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export type InicialAula = {
  nome: string;
  dia_semana: string;
  hora: string;
  duracao_min: string;
  vagas: string;
  sala: string;
  instrutor_id: string;
  ativo: string;
};

export function AulaForm({
  acao,
  inicial,
  instrutores,
}: {
  acao: (e: FormState, d: FormData) => Promise<FormState>;
  inicial: InicialAula;
  instrutores: { id: number; nome: string }[];
}) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const erros = estado?.erros ?? {};
  const v = (c: keyof InicialAula) => estado?.valores?.[c] ?? inicial[c];

  return (
    <form key={JSON.stringify(estado?.valores ?? {})} action={executar} noValidate>
      {estado?.mensagem ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}
      <Campo id="nome" rotulo="Nome da aula" erro={erros.nome}>
        <input id="nome" name="nome" maxLength={40} placeholder="Ex.: Spinning" defaultValue={v("nome")} aria-invalid={erros.nome ? true : undefined} />
      </Campo>
      <div className="form-row">
        <Campo id="dia_semana" rotulo="Dia da semana" erro={erros.dia_semana}>
          <select id="dia_semana" name="dia_semana" defaultValue={v("dia_semana")}>
            {DIAS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="hora" rotulo="Horário" erro={erros.hora}>
          <input id="hora" name="hora" type="time" defaultValue={v("hora")} aria-invalid={erros.hora ? true : undefined} />
        </Campo>
      </div>
      <div className="form-row">
        <Campo id="duracao_min" rotulo="Duração (min)" erro={erros.duracao_min}>
          <input id="duracao_min" name="duracao_min" type="number" min={15} max={180} step={5} defaultValue={v("duracao_min")} />
        </Campo>
        <Campo id="vagas" rotulo="Vagas" erro={erros.vagas}>
          <input id="vagas" name="vagas" type="number" min={1} max={200} defaultValue={v("vagas")} />
        </Campo>
      </div>
      <div className="form-row">
        <Campo id="sala" rotulo="Sala (opcional)" erro={erros.sala}>
          <input id="sala" name="sala" maxLength={30} placeholder="Ex.: Sala 1" defaultValue={v("sala")} />
        </Campo>
        <Campo id="instrutor_id" rotulo="Instrutor" erro={erros.instrutor_id}>
          <select id="instrutor_id" name="instrutor_id" defaultValue={v("instrutor_id")}>
            <option value="">Sem instrutor definido</option>
            {instrutores.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <label className="check">
        <input type="checkbox" name="ativo" defaultChecked={v("ativo") === "1"} />
        <span>Aula ativa (aparece para os alunos reservarem)</span>
      </label>
      <div className="dlg-actions">
        <button type="submit" className="btn primary" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/aulas" className="btn">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
