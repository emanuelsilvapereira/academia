import type { ReactNode } from "react";

export function Cabecalho({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <header className="head">
      <h1>{titulo}</h1>
      {children}
    </header>
  );
}
