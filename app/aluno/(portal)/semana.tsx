import { addDias, diaDaSemana } from "@/lib/format";
import type { FichaTreino } from "@/lib/portal";
import { DIAS_CURTOS, inicioDaSemana } from "@/lib/rotina";

// Rotina da semana atual (segunda a domingo): ficha de cada dia, o que já foi feito e o dia de hoje.
export function SemanaRotina({ fichas, hoje, feitos }: { fichas: FichaTreino[]; hoje: string; feitos: { data: string; letra: string }[] }) {
  const segunda = inicioDaSemana(hoje);
  const dias = Array.from({ length: 7 }, (_, i) => addDias(segunda, i));
  return (
    <ol className="semana" aria-label="Rotina desta semana">
      {dias.map((data) => {
        const dow = diaDaSemana(data);
        const planejadas = fichas.filter((f) => f.dias.includes(dow)).map((f) => f.letra);
        const feitasNoDia = feitos.filter((f) => f.data === data).map((f) => f.letra);
        const classe = ["semana-dia", data === hoje ? "hoje" : "", feitasNoDia.length ? "feito" : "", data > hoje ? "futuro" : ""].join(" ");
        const letras = feitasNoDia.length ? feitasNoDia : planejadas;
        return (
          <li key={data} className={classe}>
            <span className="semana-nome">{data === hoje ? "Hoje" : DIAS_CURTOS[dow]}</span>
            <span className="semana-letra">{letras.length ? letras.join("+") : "·"}</span>
            <span className="semana-estado small">{feitasNoDia.length ? "✓ feito" : planejadas.length ? (data < hoje ? "não fez" : "treino") : "descanso"}</span>
          </li>
        );
      })}
    </ol>
  );
}
