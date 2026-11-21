import Link from "next/link";

// Links de página (« Anterior 1 2 3 … Próxima »), mantendo a busca e os filtros da URL.
export function Paginacao({
  caminho,
  base,
  pagina,
  total,
  porPagina,
}: {
  caminho: string;
  base: URLSearchParams;
  pagina: number;
  total: number;
  porPagina: number;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;

  const link = (n: number) => {
    const p = new URLSearchParams(base);
    if (n > 1) p.set("pagina", String(n));
    else p.delete("pagina");
    const qs = p.toString();
    return qs ? `${caminho}?${qs}` : caminho;
  };

  // Mostra a primeira, a última e as vizinhas da atual.
  const numeros: (number | "…")[] = [];
  for (let n = 1; n <= paginas; n++) {
    if (n === 1 || n === paginas || Math.abs(n - pagina) <= 1) numeros.push(n);
    else if (numeros[numeros.length - 1] !== "…") numeros.push("…");
  }

  const de = (pagina - 1) * porPagina + 1;
  const ate = Math.min(pagina * porPagina, total);

  return (
    <nav className="paginacao" aria-label="Páginas">
      <span className="muted small">
        {de}–{ate} de {total}
      </span>
      <div className="paginas">
        {pagina > 1 ? (
          <Link href={link(pagina - 1)} className="btn sm" rel="prev">
            Anterior
          </Link>
        ) : (
          <span className="btn sm" aria-disabled="true">
            Anterior
          </span>
        )}
        {numeros.map((n, i) =>
          n === "…" ? (
            <span key={`r${i}`} className="muted">
              …
            </span>
          ) : (
            <Link key={n} href={link(n)} className="pag" aria-current={n === pagina ? "page" : undefined}>
              {n}
            </Link>
          ),
        )}
        {pagina < paginas ? (
          <Link href={link(pagina + 1)} className="btn sm" rel="next">
            Próxima
          </Link>
        ) : (
          <span className="btn sm" aria-disabled="true">
            Próxima
          </span>
        )}
      </div>
    </nav>
  );
}
