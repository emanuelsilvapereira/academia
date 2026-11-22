// Logotipo do Pulso (três círculos) com o nome.
export function Marca({ sub }: { sub?: string }) {
  return (
    <div className="brand">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="12" cy="12" r="10" className="r-line" />
        <circle cx="12" cy="12" r="5.5" className="r-line" />
        <circle cx="12" cy="12" r="1.8" className="r-fill" />
      </svg>
      <span>Pulso</span>
      {sub ? <span className="brand-sub">{sub}</span> : null}
    </div>
  );
}
