import { SITUACAO_ROTULO } from "@/lib/format";

// Ativo = círculo cheio, pendente = meio cheio, vencido = tracejado, inativo = vazio.
// O texto sempre acompanha o símbolo (não depende só de cor).
function Icone({ status }: { status: string }) {
  return (
    <svg viewBox="-10 -10 20 20" width="14" height="14" aria-hidden="true">
      {status === "ativo" ? (
        <circle r="7" className="r-fill" />
      ) : status === "pendente" ? (
        <>
          <circle r="7" className="r-line" />
          <path d="M0 -7 A7 7 0 0 1 0 7 Z" className="r-fill" />
        </>
      ) : status === "vencido" ? (
        <circle r="6.5" className="r-line" strokeDasharray="3 2.4" />
      ) : (
        <circle r="6" className="r-line" opacity="0.4" />
      )}
    </svg>
  );
}

export function Status({ status }: { status: string }) {
  return (
    <span className="status">
      <Icone status={status} />
      {SITUACAO_ROTULO[status] ?? status}
    </span>
  );
}
