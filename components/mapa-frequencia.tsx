import { addDias, diaDaSemana, formatarData } from "@/lib/format";

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

// Calendário das últimas N semanas: cada quadradinho é um dia; cheio = treinou.
export function MapaFrequencia({ dias, hoje, semanas = 12 }: { dias: Set<string>; hoje: string; semanas?: number }) {
  // Começa numa segunda-feira, para as colunas serem semanas.
  const inicio = addDias(hoje, -(semanas * 7 - 1) - diaDaSemana(addDias(hoje, -(semanas * 7 - 1))));
  const colunas: string[][] = [];
  for (let d = inicio; d <= hoje; d = addDias(d, 1)) {
    if (diaDaSemana(d) === 0) colunas.push([]);
    colunas[colunas.length - 1].push(d);
  }
  const tam = 13, gap = 3, esq = 26;

  return (
    <svg
      className="mapa"
      viewBox={`0 0 ${esq + colunas.length * (tam + gap)} ${7 * (tam + gap)}`}
      role="img"
      aria-label={`Dias com treino nas últimas ${semanas} semanas: ${[...dias].filter((d) => d >= inicio).length}`}
    >
      {[0, 2, 4].map((i) => (
        <text key={i} className="g-eixo" x={0} y={i * (tam + gap) + tam - 2}>
          {DIAS[i]}
        </text>
      ))}
      {colunas.map((col, c) =>
        col.map((d) => (
          <rect
            key={d}
            x={esq + c * (tam + gap)}
            y={diaDaSemana(d) * (tam + gap)}
            width={tam}
            height={tam}
            rx={3}
            className={dias.has(d) ? "m-dia m-treinou" : "m-dia"}
          >
            <title>
              {formatarData(d)}: {dias.has(d) ? "treinou" : "não veio"}
            </title>
          </rect>
        )),
      )}
    </svg>
  );
}
