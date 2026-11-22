import Link from "next/link";
import { MiniaturaExercicio } from "@/components/animacao-exercicio";
import { exigirAluno } from "@/lib/auth-aluno";
import { getDb } from "@/lib/db";
import { addDias, decimal, formatarData, GRUPO_ROTULO, hojeISO, plural } from "@/lib/format";
import { lerMusculos, MUSCULOS } from "@/lib/musculos";
import { fichasDoAluno, treinoSugerido, treinosFeitos } from "@/lib/portal";
import { DIAS_LONGOS } from "@/lib/rotina";
import { BotaoTreinoFeito } from "../botao-treino";
import { SemanaRotina } from "../semana";

export const metadata = { title: "Meu treino · Pulso" };

function diasPorExtenso(dias: number[]): string {
  if (dias.length === 0) return "sem dia fixo";
  const nomes = dias.map((d) => DIAS_LONGOS[d]);
  return nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

export default async function TreinoAlunoPage() {
  const { id } = await exigirAluno();
  const db = getDb();
  const hoje = hojeISO();
  const fichas = fichasDoAluno(db, id);
  const sugestao = treinoSugerido(db, id, fichas, hoje);
  const feitos = treinosFeitos(db, id, addDias(hoje, -30));
  const feitasHoje = new Set(feitos.filter((f) => f.data === hoje).map((f) => f.letra));
  const instrutor = db
    .prepare("SELECT i.nome FROM aluno a JOIN instrutor i ON i.id = a.instrutor_id WHERE a.id = ?")
    .get(id) as { nome: string } | undefined;

  return (
    <>
      <header className="head">
        <div>
          <h1>Meu treino</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {instrutor ? `Montado por ${instrutor.nome}.` : "Seu treino é montado pelo instrutor da academia."} Toque num exercício para ver o vídeo e
            os músculos que ele trabalha.
          </p>
        </div>
      </header>

      {fichas.length === 0 ? (
        <div className="panel">
          <p>Você ainda não tem fichas de treino. Fale com seu instrutor na academia.</p>
        </div>
      ) : (
        <>
          <section className="secao">
            <h2 className="secao-titulo">Rotina da semana</h2>
            <SemanaRotina fichas={fichas} hoje={hoje} feitos={feitos} />
          </section>

          {fichas.map((f) => {
            const grupos = [...new Set(f.itens.map((i) => GRUPO_ROTULO[i.grupo]))].join(", ");
            const eHoje = sugestao.tipo === "treino" && sugestao.letra === f.letra;
            return (
              <section key={f.id} id={`ficha-${f.letra}`} className="secao ficha-aluno">
                <div className="secao-head">
                  <div>
                    <h2 className="secao-titulo" style={{ marginBottom: 2 }}>
                      Ficha {f.letra} {f.objetivo ? <span className="muted">· {f.objetivo}</span> : null}
                      {eHoje ? <span className="tag tag-forte">hoje</span> : null}
                    </h2>
                    <p className="muted small">
                      {diasPorExtenso(f.dias)} · {plural(f.itens.length, "exercício", "exercícios")}
                      {grupos ? ` · ${grupos}` : ""} · atualizada em {formatarData(f.atualizada_em)}
                    </p>
                  </div>
                  {f.itens.length ? <BotaoTreinoFeito letra={f.letra} feito={feitasHoje.has(f.letra)} classe="sm" /> : null}
                </div>

                <ol className="lista-exercicios">
                  {f.itens.map((i, n) => {
                    const principais = lerMusculos(i.musculos_primarios).map((m) => MUSCULOS[m].regiao);
                    return (
                      <li key={i.id}>
                        <Link href={`/aluno/exercicios/${i.exercicio_id}`} className="item-exercicio">
                          <span className="item-num mono">{n + 1}</span>
                          <MiniaturaExercicio pasta={i.animacao} />
                          <span className="item-corpo">
                            <span className="name">
                              {i.nome}
                              {i.video_url ? <span className="tag">vídeo</span> : null}
                            </span>
                            <span className="sub">
                              {i.equipamento}
                              {principais.length ? ` · ${principais.join(", ")}` : ""}
                            </span>
                          </span>
                          <span className="item-carga">
                            <strong className="mono">
                              {i.series} × {i.repeticoes}
                            </strong>
                            <span className="muted small">
                              {[i.carga_kg !== null ? `${decimal(i.carga_kg)} kg` : null, i.descanso_seg !== null ? `${i.descanso_seg}s descanso` : null]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </span>
                            {i.ultima_carga !== null ? (
                              <span className="muted small">
                                você usou {decimal(i.ultima_carga)} kg em {formatarData(i.ultima_carga_data)}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                  {f.itens.length === 0 ? <li className="muted">Nenhum exercício nesta ficha ainda.</li> : null}
                </ol>
              </section>
            );
          })}

          <section className="secao">
            <h2 className="secao-titulo">Treinos concluídos nos últimos 30 dias ({feitos.length})</h2>
            {feitos.length === 0 ? (
              <p className="muted">Quando terminar um treino, toque em &quot;Concluí a ficha&quot; para registrar aqui.</p>
            ) : (
              <ul className="lista-simples">
                {feitos.slice(0, 15).map((f) => (
                  <li key={`${f.data}${f.letra}`}>
                    <span>{formatarData(f.data)}</span>
                    <span className="muted">Ficha {f.letra}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
