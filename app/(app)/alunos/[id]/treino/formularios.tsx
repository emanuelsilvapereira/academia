"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useAvisos } from "@/components/avisos";
import { Campo } from "@/components/campo";
import { GRUPO_ROTULO } from "@/lib/format";
import type { FormState, ResultadoAcao } from "@/lib/form";

type Acao = (estado: FormState, dados: FormData) => Promise<FormState>;

function useSucesso(estado: FormState, form: React.RefObject<HTMLFormElement | null>) {
  const { avisar } = useAvisos();
  useEffect(() => {
    if (estado?.ok && estado.mensagem) {
      avisar({ texto: estado.mensagem });
      form.current?.reset();
    }
  }, [estado, avisar, form]);
}

export function NovaFichaForm({ acao, livres }: { acao: Acao; livres: string[] }) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const form = useRef<HTMLFormElement>(null);
  useSucesso(estado, form);
  if (livres.length === 0) return <p className="muted small">O aluno já tem todas as fichas (A a E).</p>;

  return (
    <form ref={form} action={executar} className="linha-form" noValidate>
      <Campo id="letra" rotulo="Ficha" erro={estado?.erros?.letra}>
        <select id="letra" name="letra" defaultValue={livres[0]}>
          {livres.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="objetivo" rotulo="Foco (opcional)" erro={estado?.erros?.objetivo}>
        <input id="objetivo" name="objetivo" maxLength={60} placeholder="Ex.: Peito e tríceps" autoComplete="off" />
      </Campo>
      <button type="submit" className="btn primary sm" disabled={pendente}>
        {pendente ? "Criando…" : "Criar ficha"}
      </button>
    </form>
  );
}

type Exercicio = { id: number; nome: string; grupo: string; equipamento: string };

export function AdicionarExercicioForm({ acao, exercicios, prefixo }: { acao: Acao; exercicios: Exercicio[]; prefixo: string }) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const form = useRef<HTMLFormElement>(null);
  useSucesso(estado, form);
  const erros = estado?.erros ?? {};
  const val = (c: string, padrao: string) => (estado?.ok ? padrao : (estado?.valores?.[c] ?? padrao));
  const grupos = Object.keys(GRUPO_ROTULO).filter((g) => exercicios.some((e) => e.grupo === g));

  return (
    <form ref={form} action={executar} className="linha-form" noValidate>
      {estado?.mensagem && !estado.ok ? <p className="err">{estado.mensagem}</p> : null}
      <Campo id={`${prefixo}-ex`} rotulo="Exercício" erro={erros.exercicio_id}>
        <select id={`${prefixo}-ex`} name="exercicio_id" defaultValue={val("exercicio_id", "")}>
          <option value="">Selecione…</option>
          {grupos.map((g) => (
            <optgroup key={g} label={GRUPO_ROTULO[g]}>
              {exercicios
                .filter((e) => e.grupo === g)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome} ({e.equipamento})
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </Campo>
      <Campo id={`${prefixo}-s`} rotulo="Séries" erro={erros.series}>
        <input id={`${prefixo}-s`} name="series" type="number" min={1} max={10} defaultValue={val("series", "3")} className="curto" />
      </Campo>
      <Campo id={`${prefixo}-r`} rotulo="Repetições" erro={erros.repeticoes}>
        <input id={`${prefixo}-r`} name="repeticoes" defaultValue={val("repeticoes", "10-12")} maxLength={12} className="curto" />
      </Campo>
      <Campo id={`${prefixo}-c`} rotulo="Carga (kg)" erro={erros.carga_kg}>
        <input id={`${prefixo}-c`} name="carga_kg" inputMode="decimal" defaultValue={val("carga_kg", "")} className="curto" />
      </Campo>
      <Campo id={`${prefixo}-d`} rotulo="Descanso (s)" erro={erros.descanso_seg}>
        <input id={`${prefixo}-d`} name="descanso_seg" type="number" min={0} max={600} step={15} defaultValue={val("descanso_seg", "60")} className="curto" />
      </Campo>
      <button type="submit" className="btn sm" disabled={pendente}>
        {pendente ? "…" : "Adicionar"}
      </button>
    </form>
  );
}

export function BotoesOrdem({ subir, descer, primeiro, ultimo }: { subir: () => Promise<ResultadoAcao>; descer: () => Promise<ResultadoAcao>; primeiro: boolean; ultimo: boolean }) {
  const [pendente, iniciar] = useTransition();
  return (
    <span className="ordem">
      <button type="button" className="btn sm icone" disabled={primeiro || pendente} onClick={() => iniciar(async () => void (await subir()))} aria-label="Subir">
        ↑
      </button>
      <button type="button" className="btn sm icone" disabled={ultimo || pendente} onClick={() => iniciar(async () => void (await descer()))} aria-label="Descer">
        ↓
      </button>
    </span>
  );
}
