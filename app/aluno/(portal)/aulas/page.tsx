import { BotaoAcao } from "@/components/botao-excluir";
import { horaFim, jaComecou, proximasOcorrencias, type Ocorrencia } from "@/lib/aulas";
import { exigirAluno } from "@/lib/auth-aluno";
import { getDb } from "@/lib/db";
import { addDias, agoraHora, diaDaSemana, formatarData, hojeISO, plural } from "@/lib/format";
import { DIAS_LONGOS } from "@/lib/rotina";
import { alternarReserva } from "../../actions";

export const metadata = { title: "Aulas · Pulso" };

const DIAS_NA_TELA = 7;

function CartaoAula({ o, hoje, agora }: { o: Ocorrencia; hoje: string; agora: string }) {
  const livres = o.vagas - o.reservadas;
  const comecou = jaComecou(o.data, o.hora, hoje, agora);
  return (
    <li className={`aula${o.minha ? " aula-minha" : ""}${comecou ? " aula-passou" : ""}`}>
      <div className="aula-hora mono">
        {o.hora}
        <span className="muted small">{horaFim(o.hora, o.duracao_min)}</span>
      </div>
      <div className="aula-corpo">
        <strong>
          {o.nome} {o.minha ? <span className="tag tag-forte">reservada</span> : null}
        </strong>
        <span className="muted small">{[o.instrutor_nome, o.sala, `${o.duracao_min} min`].filter(Boolean).join(" · ")}</span>
        <span className="small">{comecou ? "Já começou" : livres > 0 ? plural(livres, "vaga livre", "vagas livres") : "Lotada"}</span>
      </div>
      <div className="aula-acao">
        {comecou ? null : o.minha ? (
          <BotaoAcao acao={alternarReserva.bind(null, o.id, o.data, false)} rotulo="Cancelar" />
        ) : livres > 0 ? (
          <BotaoAcao acao={alternarReserva.bind(null, o.id, o.data, true)} rotulo="Reservar" classe="btn sm primary" />
        ) : null}
      </div>
    </li>
  );
}

export default async function AulasAlunoPage() {
  const { id } = await exigirAluno();
  const db = getDb();
  const hoje = hojeISO();
  const agora = agoraHora();
  const ocorrencias = proximasOcorrencias(db, hoje, DIAS_NA_TELA, id);
  const minhas = ocorrencias.filter((o) => o.minha && !jaComecou(o.data, o.hora, hoje, agora));
  const dias = Array.from({ length: DIAS_NA_TELA }, (_, i) => addDias(hoje, i));

  return (
    <>
      <header className="head">
        <div>
          <h1>Aulas coletivas</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Reserve sua vaga com até 7 dias de antecedência. Não vai poder ir? Cancele para liberar a vaga para outra pessoa.
          </p>
        </div>
      </header>

      <section className="secao">
        <h2 className="secao-titulo">Minhas reservas ({minhas.length})</h2>
        {minhas.length === 0 ? (
          <p className="muted">Você não tem aulas reservadas.</p>
        ) : (
          <ul className="aulas">
            {minhas.map((o) => (
              <CartaoAula key={`${o.id}${o.data}`} o={o} hoje={hoje} agora={agora} />
            ))}
          </ul>
        )}
      </section>

      {dias.map((data) => {
        const doDia = ocorrencias.filter((o) => o.data === data);
        return (
          <section key={data} className="secao">
            <h2 className="secao-titulo">
              {data === hoje ? "Hoje" : data === addDias(hoje, 1) ? "Amanhã" : DIAS_LONGOS[diaDaSemana(data)]}{" "}
              <span className="muted">· {formatarData(data)}</span>
            </h2>
            {doDia.length === 0 ? (
              <p className="muted">Sem aulas neste dia.</p>
            ) : (
              <ul className="aulas">
                {doDia.map((o) => (
                  <CartaoAula key={`${o.id}${o.data}`} o={o} hoje={hoje} agora={agora} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}
