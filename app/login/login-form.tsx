"use client";

import { useActionState, useState } from "react";
import { Campo } from "@/components/campo";
import { entrar } from "./actions";

export function LoginForm() {
  const [estado, executar, pendente] = useActionState(entrar, undefined);
  const [mostrar, setMostrar] = useState(false);

  return (
    <form action={executar} noValidate>
      {estado?.mensagem ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}

      <Campo id="email" rotulo="E-mail" erro={estado?.erros?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="voce@exemplo.com"
          defaultValue={estado?.valores?.email ?? ""}
          aria-invalid={estado?.erros?.email ? true : undefined}
        />
      </Campo>

      <Campo id="senha" rotulo="Senha" erro={estado?.erros?.senha}>
        <div className="pw">
          <input
            id="senha"
            name="senha"
            type={mostrar ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={estado?.erros?.senha ? true : undefined}
          />
          <button
            type="button"
            className="link-btn"
            onClick={() => setMostrar((v) => !v)}
            aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
          >
            {mostrar ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </Campo>

      <button type="submit" className="btn primary block" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
