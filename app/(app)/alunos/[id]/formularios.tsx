"use client";

import { useActionState, useEffect, useRef } from "react";
import { useAvisos } from "@/components/avisos";
import { Campo } from "@/components/campo";
import { brl, FORMA_ROTULO } from "@/lib/format";
import type { FormState } from "@/lib/form";

type Acao = (estado: FormState, dados: FormData) => Promise<FormState>;

/** Mostra o aviso de sucesso e limpa o formulário quando a ação dá certo. */
function useResultado(estado: FormState, form: React.RefObject<HTMLFormElement | null>) {
  const { avisar } = useAvisos();
  useEffect(() => {
    if (estado?.ok && estado.mensagem) {
      avisar({ texto: estado.mensagem });
      form.current?.reset();
    }
  }, [estado, avisar, form]);
}

export function RenovarForm({
  acao,
  planos,
  planoAtual,
}: {
  acao: Acao;
  planos: { id: number; nome: string; preco_centavos: number; meses: number }[];
  planoAtual: number | null;
}) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const form = useRef<HTMLFormElement>(null);
  useResultado(estado, form);

  return (
    <form ref={form} action={executar} className="inline-form" noValidate>
      {estado?.mensagem && !estado.ok ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}
      <Campo id="renovar-plano" rotulo="Renovar com o plano" erro={estado?.erros?.plano_id}>
        <select id="renovar-plano" name="plano_id" defaultValue={planoAtual ?? planos[0]?.id}>
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} · {brl(p.preco_centavos)} ({p.meses} {p.meses === 1 ? "mês" : "meses"})
            </option>
          ))}
        </select>
      </Campo>
      <label className="check">
        <input type="checkbox" name="renovacao_automatica" />
        <span>Renovar automaticamente depois</span>
      </label>
      <button type="submit" className="btn primary sm" disabled={pendente}>
        {pendente ? "Renovando…" : "Renovar matrícula"}
      </button>
    </form>
  );
}

export function ReceberForm({ acao, hoje }: { acao: Acao; hoje: string }) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const form = useRef<HTMLFormElement>(null);
  useResultado(estado, form);
  const erro = estado?.erros?.forma ?? estado?.erros?.data ?? (!estado?.ok ? estado?.mensagem : undefined);

  return (
    <form ref={form} action={executar} className="receber">
      <input type="date" name="data" defaultValue={hoje} max={hoje} aria-label="Data do pagamento" />
      <select name="forma" defaultValue="pix" aria-label="Forma de pagamento">
        {Object.entries(FORMA_ROTULO).map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </select>
      <button type="submit" className="btn sm primary" disabled={pendente}>
        {pendente ? "…" : "Receber"}
      </button>
      {erro ? (
        <span className="err" role="alert">
          {erro}
        </span>
      ) : null}
    </form>
  );
}

const CAMPOS_AVALIACAO: [string, string, string][] = [
  ["peso_kg", "Peso (kg)", "72,5"],
  ["altura_cm", "Altura (cm)", "170"],
  ["gordura_pct", "% de gordura", "22"],
  ["cintura_cm", "Cintura (cm)", ""],
  ["quadril_cm", "Quadril (cm)", ""],
  ["braco_cm", "Braço (cm)", ""],
  ["coxa_cm", "Coxa (cm)", ""],
];

export function AvaliacaoForm({ acao, hoje, alturaAnterior }: { acao: Acao; hoje: string; alturaAnterior?: number }) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const form = useRef<HTMLFormElement>(null);
  useResultado(estado, form);
  const erros = estado?.erros ?? {};
  const val = (c: string, padrao = "") => (estado?.ok ? padrao : (estado?.valores?.[c] ?? padrao));

  return (
    <form ref={form} action={executar} noValidate>
      {estado?.mensagem && !estado.ok ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}
      <div className="grade-campos">
        <Campo id="av-data" rotulo="Data" erro={erros.data}>
          <input id="av-data" name="data" type="date" max={hoje} defaultValue={val("data", hoje)} aria-invalid={erros.data ? true : undefined} />
        </Campo>
        {CAMPOS_AVALIACAO.map(([campo, rotulo, exemplo]) => (
          <Campo key={campo} id={`av-${campo}`} rotulo={rotulo} erro={erros[campo]}>
            <input
              id={`av-${campo}`}
              name={campo}
              inputMode="decimal"
              placeholder={exemplo}
              autoComplete="off"
              defaultValue={val(campo, campo === "altura_cm" && alturaAnterior ? String(alturaAnterior).replace(".", ",") : "")}
              aria-invalid={erros[campo] ? true : undefined}
            />
          </Campo>
        ))}
      </div>
      <button type="submit" className="btn primary sm" disabled={pendente}>
        {pendente ? "Salvando…" : "Registrar avaliação"}
      </button>
    </form>
  );
}
