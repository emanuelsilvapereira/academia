import { decimal, formatarData } from "@/lib/format";

type Ponto = { data: string; valor: number };

/** Escolhe limites "redondos" para o eixo, com um pouco de folga acima e abaixo. */
function limites(valores: number[]): { min: number; max: number; passo: number } {
  const lo = Math.min(...valores);
  const hi = Math.max(...valores);
  const folga = Math.max((hi - lo) * 0.15, 1);
  const alvo = (hi - lo + 2 * folga) / 4;
  const pot = 10 ** Math.floor(Math.log10(alvo));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= alvo) ?? 10 * pot;
  const min = Math.floor((lo - folga) / passo) * passo;
  return { min, max: min + passo * 4, passo };
}

// Gráfico de linha simples em SVG (evolução de peso, % de gordura etc.). Passe o mouse num ponto para ver o valor.
export function GraficoLinha({ titulo, unidade, pontos }: { titulo: string; unidade: string; pontos: Ponto[] }) {
  if (pontos.length === 0) return null;
  const largura = 460, altura = 200, esq = 40, dir = 14, topo = 14, base = 26;
  const areaL = largura - esq - dir;
  const areaA = altura - topo - base;
  const { min, max, passo } = limites(pontos.map((p) => p.valor));
  const t0 = Date.parse(pontos[0].data);
  const t1 = Date.parse(pontos[pontos.length - 1].data);
  const x = (d: string) => (pontos.length === 1 ? esq + areaL / 2 : esq + ((Date.parse(d) - t0) / (t1 - t0)) * areaL);
  const y = (v: number) => topo + areaA - ((v - min) / (max - min)) * areaA;
  const caminho = pontos.map((p, i) => `${i ? "L" : "M"}${x(p.data).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const primeiro = pontos[0].valor;
  const ultimo = pontos[pontos.length - 1].valor;
  const diferenca = ultimo - primeiro;

  return (
    <figure className="grafico">
      <figcaption>
        <h2>{titulo}</h2>
        <p>
          {decimal(ultimo)} {unidade} agora
          {pontos.length > 1 ? ` · ${diferenca > 0 ? "+" : ""}${decimal(diferenca)} ${unidade} desde ${formatarData(pontos[0].data)}` : ""}
        </p>
      </figcaption>
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={`${titulo}: de ${decimal(primeiro)} para ${decimal(ultimo)} ${unidade}`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = min + i * passo;
          return (
            <g key={i}>
              <line className="g-grade" x1={esq} x2={largura - dir} y1={y(v)} y2={y(v)} />
              <text className="g-eixo" x={esq - 8} y={y(v) + 3} textAnchor="end">
                {decimal(v)}
              </text>
            </g>
          );
        })}
        <path d={caminho} className="g-linha" />
        {pontos.map((p, i) => (
          <circle key={p.data} cx={x(p.data)} cy={y(p.valor)} r={i === pontos.length - 1 ? 4 : 3} className={i === pontos.length - 1 ? "g-ponto g-ponto-ultimo" : "g-ponto"}>
            <title>
              {formatarData(p.data)}: {decimal(p.valor)} {unidade}
            </title>
          </circle>
        ))}
        <text className="g-eixo" x={esq} y={altura - 7}>
          {formatarData(pontos[0].data)}
        </text>
        {pontos.length > 1 ? (
          <text className="g-eixo" x={largura - dir} y={altura - 7} textAnchor="end">
            {formatarData(pontos[pontos.length - 1].data)}
          </text>
        ) : null}
      </svg>
    </figure>
  );
}
