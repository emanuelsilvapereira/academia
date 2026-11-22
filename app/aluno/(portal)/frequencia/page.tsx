import { MapaFrequencia } from "@/components/mapa-frequencia";
import { exigirAluno } from "@/lib/auth-aluno";
import { getDb } from "@/lib/db";
import { addDias, decimal, diaDaSemana, formatarData, hojeISO, plural } from "@/lib/format";
import { DIAS_LONGOS, semanasSeguidas } from "@/lib/rotina";

export const metadata = { title: "Frequência · Pulso" };

function minutos(h: string) {
  return Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
}

export default async function FrequenciaAlunoPage() {
  const { id } = await exigirAluno();
  const db = getDb();
  const hoje = hojeISO();
  const presencas = db.prepare("SELECT data, hora, saida FROM presenca WHERE aluno_id = ? ORDER BY data DESC").all(id) as {
    data: string;
    hora: string;
    saida: string | null;
  }[];
  const datas = presencas.map((p) => p.data);
  const ultimos30 = datas.filter((d) => d > addDias(hoje, -30)).length;
  const media = datas.filter((d) => d > addDias(hoje, -84)).length / 12;
  const sequencia = semanasSeguidas(datas, hoje);
  const comSaida = presencas.filter((p) => p.saida).slice(0, 30);
  const duracaoMedia = comSaida.length ? comSaida.reduce((s, p) => s + minutos(p.saida!) - minutos(p.hora), 0) / comSaida.length : null;
  const porDia = Array.from({ length: 7 }, (_, d) => datas.filter((x) => x > addDias(hoje, -120) && diaDaSemana(x) === d).length);
  const diaFavorito = porDia.some(Boolean) ? porDia.indexOf(Math.max(...porDia)) : null;

  return (
    <>
      <header className="head">
        <div>
          <h1>Frequência</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Cada entrada registrada na recepção (pelo nome ou pela carteirinha) aparece aqui.
          </p>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi">
          <span className="rotulo">Últimos 30 dias</span>
          <span className="num">{ultimos30}</span>
          <span className="muted small">treinos</span>
        </div>
        <div className="kpi">
          <span className="rotulo">Média por semana</span>
          <span className="num">{decimal(media)}</span>
          <span className="muted small">últimas 12 semanas</span>
        </div>
        <div className="kpi">
          <span className="rotulo">Sequência</span>
          <span className="num">{sequencia}</span>
          <span className="muted small">{sequencia === 1 ? "semana seguida" : "semanas seguidas"}</span>
        </div>
        <div className="kpi">
          <span className="rotulo">Tempo médio</span>
          <span className="num">{duracaoMedia ? `${Math.round(duracaoMedia)} min` : "—"}</span>
          <span className="muted small">{diaFavorito !== null ? `dia preferido: ${DIAS_LONGOS[diaFavorito]}` : "por treino"}</span>
        </div>
      </div>

      <div className="two-equal">
        <section className="panel">
          <h2>Últimas 12 semanas</h2>
          <MapaFrequencia dias={new Set(datas)} hoje={hoje} />
          <p className="muted small" style={{ marginTop: 12 }}>
            {plural(datas.length, "treino", "treinos")} desde que você entrou na academia.
          </p>
        </section>
        <section className="panel">
          <h2>Últimas entradas</h2>
          {presencas.length === 0 ? (
            <p className="muted">Nenhuma entrada ainda.</p>
          ) : (
            <ul className="lista-simples">
              {presencas.slice(0, 12).map((p) => (
                <li key={p.data}>
                  <span>
                    {formatarData(p.data)} <span className="muted small">({DIAS_LONGOS[diaDaSemana(p.data)]})</span>
                  </span>
                  <span className="mono muted">
                    {p.hora.slice(0, 5)} – {p.saida ? p.saida.slice(0, 5) : "na academia"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
