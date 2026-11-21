"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Campo } from "@/components/campo";
import type { FormState } from "@/lib/form";
import { PERFIL_ROTULO, PERFIS } from "@/lib/permissoes";

type Inicial = { nome: string; email: string; perfil: string; instrutor_id: string; ativo: string };

export function UsuarioForm({
  acao,
  inicial,
  instrutores,
  novo,
}: {
  acao: (e: FormState, d: FormData) => Promise<FormState>;
  inicial: Inicial;
  instrutores: { id: number; nome: string }[];
  novo: boolean;
}) {
  const [estado, executar, pendente] = useActionState(acao, undefined);
  const erros = estado?.erros ?? {};
  const v = (c: keyof Inicial) => estado?.valores?.[c] ?? inicial[c];
  const inv = (c: string) => (erros[c] ? true : undefined);
  const [perfil, setPerfil] = useState(v("perfil"));

  return (
    <form action={executar} noValidate>
      {estado?.mensagem ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}
      <Campo id="nome" rotulo="Nome" erro={erros.nome}>
        <input id="nome" name="nome" maxLength={80} autoComplete="off" defaultValue={v("nome")} aria-invalid={inv("nome")} />
      </Campo>
      <Campo id="email" rotulo="E-mail (login)" erro={erros.email}>
        <input id="email" name="email" type="email" maxLength={80} autoComplete="off" defaultValue={v("email")} aria-invalid={inv("email")} />
      </Campo>
      <div className="form-row">
        <Campo id="perfil" rotulo="Perfil de acesso" erro={erros.perfil}>
          <select id="perfil" name="perfil" value={perfil} onChange={(e) => setPerfil(e.target.value)} aria-invalid={inv("perfil")}>
            {PERFIS.map((p) => (
              <option key={p} value={p}>
                {PERFIL_ROTULO[p]}
              </option>
            ))}
          </select>
        </Campo>
        {perfil === "instrutor" ? (
          <Campo id="instrutor_id" rotulo="Cadastro de instrutor" erro={erros.instrutor_id}>
            <select id="instrutor_id" name="instrutor_id" defaultValue={v("instrutor_id")}>
              <option value="">Nenhum</option>
              {instrutores.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
          </Campo>
        ) : null}
      </div>
      <Campo id="senha" rotulo={novo ? "Senha inicial" : "Nova senha (deixe em branco para manter)"} erro={erros.senha}>
        <input id="senha" name="senha" type="password" autoComplete="new-password" placeholder="Mínimo 8, com letras e números" aria-invalid={inv("senha")} />
      </Campo>
      {!novo ? (
        <label className="check">
          <input type="checkbox" name="ativo" defaultChecked={v("ativo") === "on"} />
          <span>
            Pode entrar no sistema <span className="muted">(desmarque para bloquear o acesso sem apagar o histórico)</span>
          </span>
        </label>
      ) : null}
      <div className="dlg-actions">
        <button type="submit" className="btn primary" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/usuarios" className="btn">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
