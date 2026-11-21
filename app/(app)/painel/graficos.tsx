import { addDias, diaDaSemana, hojeISO } from "@/lib/format";

// Gráficos em SVG puro, desenhados no servidor (sem biblioteca externa).

export const DIAS_GRAFICO = 30;
export const SEMANAS_GRAFICO = 12;
export const DIAS_SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

/** Primeiro dia coberto pelos gráficos de 12 semanas. */
export function inicioPeriodoLongo(): string {
  return addDias(hojeISO(), -(SEMANAS_GRAFICO * 7 - 1));
}

type Barra = { rotulo: string; valor: number; dica: string; destaque?: boolean; mostrarRotulo?: boolean };

/** Escolhe um teto "redondo" (1, 2, 5, 10, 20, 50...) com 4 divisões. */
function escala(max: number): { teto: number; passo: number } {
  const alvo = Math.max(max, 1) / 4;
  const pot = 10 ** Math.floor(Math.log10(alvo));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= alvo) ?? 10 * pot;
  return { teto: Math.max(passo * 4, 4 * passo), passo };
}

function GraficoBarras({
  titulo,
  descricao,
  barras,
  largura,
  altura,
  valorNoTopo = false,
  largo = false,
}: {
  titulo: string;
  descricao: string;
  barras: Barra[];
  largura: number;
  altura: number;
  valorNoTopo?: boolean;
  largo?: boolean;
}) {
  const esq = 34, dir = 8, topo = 14, base = 26;
  const areaL = largura - esq - dir;
  const areaA = altura - topo - base;
  const max = Math.max(...barras.map((b) => b.valor), 0);
  const { teto, passo } = escala(max);
  const passoX = areaL / barras.length;
  const larguraBarra = Math.min(passoX * 0.62, 26);
  const ticks = [0, 1, 2, 3, 4].map((i) => i * passo);
  const y = (v: number) => topo + areaA - (v / teto) * areaA;

  return (
    <figure className={largo ? "grafico grafico-largo" : "grafico"}>
      <figcaption>
        <h2>{titulo}</h2>
        <p>{descricao}</p>
      </figcaption>
      <div className="rolagem">
      <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={`${titulo}. ${descricao}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="g-grade" x1={esq} x2={largura - dir} y1={y(t)} y2={y(t)} />
            <text className="g-eixo" x={esq - 8} y={y(t) + 3} textAnchor="end">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {barras.map((b, i) => {
          const cx = esq + passoX * i + passoX / 2;
          const h = (b.valor / teto) * areaA;
          return (
            <g key={i}>
              <rect
                className={b.destaque ? "g-barra g-destaque" : "g-barra"}
                x={cx - larguraBarra / 2}
                y={topo + areaA - h}
                width={larguraBarra}
                height={Math.max(h, b.valor > 0 ? 1 : 0)}
                rx={2}
              >
                <title>{b.dica}</title>
              </rect>
              {valorNoTopo && b.valor > 0 && (
                <text className="g-valor" x={cx} y={topo + areaA - h - 5} textAnchor="middle">
                  {Number.isInteger(b.valor) ? b.valor : b.valor.toFixed(1)}
                </text>
              )}
              {b.mostrarRotulo !== false && (
                <text className="g-eixo" x={cx} y={altura - 7} textAnchor="middle">
                  {b.rotulo}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>
    </figure>
  );
}

export type EntradaDia = { data: string; n: number };
export type EntradaHora = { hora: number; n: number };

/** Entradas por dia nos últimos 30 dias. */
export function GraficoDiario({ porDia }: { porDia: Record<string, number> }) {
  const hoje = hojeISO();
  const barras: Barra[] = [];
  for (let i = DIAS_GRAFICO - 1; i >= 0; i--) {
    const data = addDias(hoje, -i);
    const [, m, d] = data.split("-");
    const n = porDia[data] ?? 0;
    barras.push({
      rotulo: `${d}/${m}`,
      valor: n,
      dica: `${d}/${m}: ${n} ${n === 1 ? "entrada" : "entradas"}`,
      destaque: i === 0,
      mostrarRotulo: i % 5 === 0,
    });
  }
  const total = barras.reduce((s, b) => s + b.valor, 0);
  return (
    <GraficoBarras
      titulo="Entradas por dia"
      descricao={`Últimos ${DIAS_GRAFICO} dias: ${total} entradas no total. A barra clara é hoje.`}
      barras={barras}
      largura={980}
      altura={250}
      largo
    />
  );
}

/** Média de entradas por dia da semana nas últimas 12 semanas. */
export function GraficoSemana({ porDia }: { porDia: Record<string, number> }) {
  const hoje = hojeISO();
  const inicio = inicioPeriodoLongo();
  const soma = Array(7).fill(0);
  const dias = Array(7).fill(0);
  for (let i = 0; i < SEMANAS_GRAFICO * 7; i++) {
    const data = addDias(inicio, i);
    if (data > hoje) break;
    const dow = diaDaSemana(data);
    dias[dow] += 1;
    soma[dow] += porDia[data] ?? 0;
  }
  const medias = soma.map((s, i) => (dias[i] ? Math.round((s / dias[i]) * 10) / 10 : 0));
  const maior = Math.max(...medias);
  return (
    <GraficoBarras
      titulo="Dia da semana"
      descricao="Média de entradas por dia, nas últimas 12 semanas."
      barras={medias.map((m, i) => ({
        rotulo: DIAS_SEMANA[i],
        valor: m,
        dica: `${DIAS_SEMANA[i]}: média de ${m} entradas`,
        destaque: m === maior && m > 0,
      }))}
      largura={470}
      altura={230}
      valorNoTopo
    />
  );
}

/** Entradas por faixa de horário (das 5h às 22h) nas últimas 12 semanas. */
export function GraficoHorario({ porHora }: { porHora: Record<number, number> }) {
  const horas = Array.from({ length: 18 }, (_, i) => i + 5);
  const maior = Math.max(...horas.map((h) => porHora[h] ?? 0));
  return (
    <GraficoBarras
      titulo="Horários de pico"
      descricao="Total de entradas por hora do dia, nas últimas 12 semanas."
      barras={horas.map((h) => {
        const n = porHora[h] ?? 0;
        return {
          rotulo: `${h}h`,
          valor: n,
          dica: `${String(h).padStart(2, "0")}h: ${n} ${n === 1 ? "entrada" : "entradas"}`,
          destaque: n === maior && n > 0,
          mostrarRotulo: h % 2 === 1,
        };
      })}
      largura={470}
      altura={230}
    />
  );
}

export type ReceitaMesGrafico = { mes: string; rotulo: string; recebido: number; previsto: number; atual: boolean };

/** Receita real (pagamentos recebidos no mês) comparada com a prevista (parcelas que venciam no mês). */
export function GraficoReceita({ meses }: { meses: ReceitaMesGrafico[] }) {
  const largura = 980, altura = 260, esq = 64, dir = 8, topo = 14, base = 26;
  const areaL = largura - esq - dir;
  const areaA = altura - topo - base;
  const max = Math.max(...meses.flatMap((m) => [m.recebido, m.previsto]), 0) / 100;
  const { teto, passo } = escala(max);
  const passoX = areaL / meses.length;
  const lb = Math.min(passoX * 0.3, 22);
  const y = (centavos: number) => topo + areaA - (centavos / 100 / teto) * areaA;
  const reais = (v: number) => `R$ ${(v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : v.toLocaleString("pt-BR"))}`;
  const brlCurto = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const totalRecebido = meses.reduce((s, m) => s + m.recebido, 0);
  const totalPrevisto = meses.reduce((s, m) => s + m.previsto, 0);

  return (
    <figure className="grafico grafico-largo">
      <figcaption>
        <h2>Receita por mês</h2>
        <p>
          Recebido (barra cheia) × previsto pelas parcelas do mês (contorno). Últimos {meses.length} meses: {brlCurto(totalRecebido)} de{" "}
          {brlCurto(totalPrevisto)} ({totalPrevisto ? Math.round((totalRecebido / totalPrevisto) * 100) : 0}%).
        </p>
      </figcaption>
      <div className="legenda" aria-hidden="true">
        <span><i className="leg-cheia" /> Recebido</span>
        <span><i className="leg-contorno" /> Previsto</span>
      </div>
      <div className="rolagem">
        <svg viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label="Receita recebida e prevista por mês">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line className="g-grade" x1={esq} x2={largura - dir} y1={y(i * passo * 100)} y2={y(i * passo * 100)} />
              <text className="g-eixo" x={esq - 8} y={y(i * passo * 100) + 3} textAnchor="end">
                {reais(i * passo)}
              </text>
            </g>
          ))}
          {meses.map((m, i) => {
            const cx = esq + passoX * i + passoX / 2;
            return (
              <g key={m.mes}>
                <rect className="g-previsto" x={cx - lb - 1} y={y(m.previsto)} width={lb} height={Math.max(0, topo + areaA - y(m.previsto))} rx={2}>
                  <title>{`${m.rotulo}: previsto ${brlCurto(m.previsto)}`}</title>
                </rect>
                <rect className={m.atual ? "g-barra g-destaque" : "g-barra g-recebido"} x={cx + 1} y={y(m.recebido)} width={lb} height={Math.max(0, topo + areaA - y(m.recebido))} rx={2}>
                  <title>{`${m.rotulo}: recebido ${brlCurto(m.recebido)}${m.previsto ? ` (${Math.round((m.recebido / m.previsto) * 100)}% do previsto)` : ""}`}</title>
                </rect>
                <text className="g-eixo" x={cx} y={altura - 7} textAnchor="middle">
                  {m.rotulo}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
