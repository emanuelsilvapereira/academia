import type { ReactNode } from "react";

// Rótulo + campo + mensagem de erro, sempre ligados por id (acessibilidade).
export function Campo({
  id,
  rotulo,
  erro,
  children,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{rotulo}</label>
      {children}
      {erro ? (
        <p className="err" id={`${id}-erro`} role="alert">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
