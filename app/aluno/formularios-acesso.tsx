"use client";

import { useActionState, useState } from "react";
import { Campo } from "@/components/campo";
import { InputMascara } from "@/components/input-mascara";
import { entrarAluno, primeiroAcesso } from "./actions";

function CampoSenha({ id, rotulo, erro, autoComplete }: { id: string; rotulo: string; erro?: string; autoComplete: string }) {
  const [mostrar, setMostrar] = useState(false);
  return (
    <Campo id={id} rotulo={rotulo} erro={erro}>
      <div className="pw">
        <input id={id} name={id} type={mostrar ? "text" : "password"} autoComplete={autoComplete} aria-invalid={erro ? true : undefined} />
        <button type="button" className="link-btn" onClick={() => setMostrar((v) => !v)} aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}>
          {mostrar ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </Campo>
  );
}

export function EntrarAlunoForm() {
  const [estado, executar, pendente] = useActionState(entrarAluno, undefined);
  return (
    <form action={executar} noValidate>
      {estado?.mensagem ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}
      <Campo id="email" rotulo="E-mail" erro={estado?.erros?.email}>
        <input id="email" name="email" type="email" autoComplete="username" placeholder="voce@exemplo.com" defaultValue={estado?.valores?.email ?? ""} />
      </Campo>
      <CampoSenha id="senha" rotulo="Senha" erro={estado?.erros?.senha} autoComplete="current-password" />
      <button type="submit" className="btn primary block" disabled={pendente}>
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export function PrimeiroAcessoForm() {
  const [estado, executar, pendente] = useActionState(primeiroAcesso, undefined);
  const erros = estado?.erros ?? {};
  return (
    <form action={executar} noValidate>
      {estado?.mensagem ? (
        <div className="alert" role="alert">
          {estado.mensagem}
        </div>
      ) : null}
      <Campo id="cpf" rotulo="CPF" erro={erros.cpf}>
        <InputMascara id="cpf" name="cpf" mascara="cpf" defaultValue={estado?.valores?.cpf} aria-invalid={erros.cpf ? true : undefined} />
      </Campo>
      <Campo id="nascimento" rotulo="Data de nascimento" erro={erros.nascimento}>
        <InputMascara id="nascimento" name="nascimento" mascara="data" defaultValue={estado?.valores?.nascimento} aria-invalid={erros.nascimento ? true : undefined} />
      </Campo>
      <CampoSenha id="senha" rotulo="Crie uma senha (mínimo 6 caracteres)" erro={erros.senha} autoComplete="new-password" />
      <CampoSenha id="confirmacao" rotulo="Repita a senha" erro={erros.confirmacao} autoComplete="new-password" />
      <button type="submit" className="btn primary block" disabled={pendente}>
        {pendente ? "Criando acesso..." : "Criar acesso"}
      </button>
    </form>
  );
}
