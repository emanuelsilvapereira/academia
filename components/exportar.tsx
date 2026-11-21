// Links para baixar um relatório em CSV (planilha) ou PDF. O arquivo é gerado em app/exportar/[relatorio]/route.ts.
export function Exportar({ relatorio, params }: { relatorio: string; params?: URLSearchParams }) {
  const link = (formato: string) => {
    const p = new URLSearchParams(params);
    p.set("formato", formato);
    return `/exportar/${relatorio}?${p.toString()}`;
  };
  return (
    <span className="exportar">
      <span className="muted small">Exportar</span>
      <a className="btn sm" href={link("csv")} download>
        CSV
      </a>
      <a className="btn sm" href={link("pdf")} download>
        PDF
      </a>
    </span>
  );
}
