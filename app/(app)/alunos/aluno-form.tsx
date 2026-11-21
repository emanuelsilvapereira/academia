"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Campo } from "@/components/campo";
import { InputMascara } from "@/components/input-mascara";
import { brl, FORMA_ROTULO } from "@/lib/format";
import type { FormState } from "@/lib/form";

export type InicialAluno = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  nascimento: string; // dd/mm/aaaa
  instrutor_id: string;
  ativo: string; // "on" ou ""
  plano_id: string;
  inicio: string;
  renovacao_automatica: string;
  pagar_agora: string;
  forma: string;
};

type Plano = { id: number; nome: string; preco_centavos: number; meses: number };

export function AlunoForm({
  acao,
  planos,
  instrutores,
  inicial,
  novo,
  voltar,
}: {
  acao: (estado: FormState, dados: FormData) => Promise<FormState>;
  planos: Plano[];
  instrutores: { id: number; nome: string }[];
  inicial: InicialAluno;
  novo: boolean;
  voltar: string;
}) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const erros = estado?.erros ?? {};
  const v = (campo: keyof InicialAluno) => estado?.valores?.[campo] ?? inicial[campo];
  const inv = (campo: string) => (erros[campo] ? true : undefined);
  const desc = (campo: string) => (erros[campo] ? `${campo}-erro` : undefined);
  const [planoId, setPlanoId] = useState(v("plano_id"));
  const [pagar, setPagar] = useState(v("pagar_agora") === "on");
  const plano = planos.find((p) => String(p.id) === planoId);

  return (
    <form action={executar} noValidate>
      {estado?.mensagem ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}

      <fieldset>
        <legend>Dados pessoais</legend>
        <Campo id="nome" rotulo="Nome completo" erro={erros.nome}>
          <input id="nome" name="nome" maxLength={80} autoComplete="off" defaultValue={v("nome")} aria-invalid={inv("nome")} aria-describedby={desc("nome")} />
        </Campo>

        <div className="form-row">
          <Campo id="cpf" rotulo="CPF" erro={erros.cpf}>
            <InputMascara mascara="cpf" id="cpf" name="cpf" defaultValue={v("cpf")} aria-invalid={inv("cpf")} aria-describedby={desc("cpf")} />
          </Campo>
          <Campo id="nascimento" rotulo="Data de nascimento" erro={erros.nascimento}>
            <InputMascara mascara="data" id="nascimento" name="nascimento" defaultValue={v("nascimento")} aria-invalid={inv("nascimento")} aria-describedby={desc("nascimento")} />
          </Campo>
        </div>

        <div className="form-row">
          <Campo id="email" rotulo="E-mail" erro={erros.email}>
            <input id="email" name="email" type="email" maxLength={80} autoComplete="off" defaultValue={v("email")} aria-invalid={inv("email")} aria-describedby={desc("email")} />
          </Campo>
          <Campo id="telefone" rotulo="Telefone" erro={erros.telefone}>
            <InputMascara mascara="telefone" id="telefone" name="telefone" defaultValue={v("telefone")} aria-invalid={inv("telefone")} aria-describedby={desc("telefone")} />
          </Campo>
        </div>

        <Campo id="instrutor_id" rotulo="Instrutor responsável" erro={erros.instrutor_id}>
          <select id="instrutor_id" name="instrutor_id" defaultValue={v("instrutor_id")} aria-invalid={inv("instrutor_id")}>
            <option value="">Sem instrutor</option>
            {instrutores.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </Campo>

        {!novo ? (
          <label className="check">
            <input type="checkbox" name="ativo" defaultChecked={v("ativo") === "on"} />
            <span>
              Aluno ativo <span className="muted">(desmarque quando ele sair da academia; o histórico é mantido)</span>
            </span>
          </label>
        ) : null}
      </fieldset>

      {novo ? (
        <fieldset>
          <legend>Matrícula</legend>
          <div className="form-row">
            <Campo id="plano_id" rotulo="Plano" erro={erros.plano_id}>
              <select id="plano_id" name="plano_id" value={planoId} onChange={(e) => setPlanoId(e.target.value)} aria-invalid={inv("plano_id")}>
                {planos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} · {brl(p.preco_centavos)}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="inicio" rotulo="Início" erro={erros.inicio}>
              <input id="inicio" name="inicio" type="date" defaultValue={v("inicio")} aria-invalid={inv("inicio")} />
            </Campo>
          </div>
          {plano ? (
            <p className="hint" style={{ marginTop: -8, marginBottom: 18 }}>
              {plano.meses === 1 ? "1 parcela" : `${plano.meses} parcelas mensais`} de{" "}
              {brl(Math.floor(plano.preco_centavos / plano.meses))}. A primeira vence no dia do início.
            </p>
          ) : null}

          <label className="check">
            <input type="checkbox" name="renovacao_automatica" defaultChecked={v("renovacao_automatica") === "on"} />
            <span>Renovar automaticamente quando a matrícula acabar</span>
          </label>

          <label className="check">
            <input type="checkbox" name="pagar_agora" checked={pagar} onChange={(e) => setPagar(e.target.checked)} />
            <span>A primeira parcela foi paga agora</span>
          </label>
          {pagar ? (
            <Campo id="forma" rotulo="Forma de pagamento" erro={erros.forma}>
              <select id="forma" name="forma" defaultValue={v("forma") || "pix"} aria-invalid={inv("forma")}>
                {Object.entries(FORMA_ROTULO).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </Campo>
          ) : null}
        </fieldset>
      ) : null}

      <div className="dlg-actions">
        <button type="submit" className="btn primary" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href={voltar} className="btn">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
