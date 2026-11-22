import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoAcao } from "@/components/botao-excluir";
import { DetalheExercicio } from "@/components/detalhe-exercicio";
import { GraficoLinha } from "@/components/grafico-linha";
import { exigirAluno } from "@/lib/auth-aluno";
import { getDb } from "@/lib/db";
import { decimal, formatarData } from "@/lib/format";
import { buscarExercicio } from "@/lib/portal";
import { apagarCarga, registrarCarga } from "../../../actions";
import { CargaForm } from "./carga-form";

export default async function ExercicioAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: alunoId } = await exigirAluno();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = getDb();
  const ex = buscarExercicio(db, id);
  if (!ex) notFound();

  // Como esse exercício aparece nas fichas do aluno (séries, repetições, carga).
  const naFicha = db
    .prepare(
      `SELECT f.letra, fi.series, fi.repeticoes, fi.carga_kg, fi.descanso_seg FROM ficha_item fi JOIN ficha f ON f.id = fi.ficha_id
       WHERE f.aluno_id = ? AND fi.exercicio_id = ? ORDER BY f.letra`,
    )
    .all(alunoId, id) as { letra: string; series: number; repeticoes: string; carga_kg: number | null; descanso_seg: number | null }[];

  const cargas = db
    .prepare("SELECT id, data, carga_kg, repeticoes FROM carga_registro WHERE aluno_id = ? AND exercicio_id = ? ORDER BY data")
    .all(alunoId, id) as { id: number; data: string; carga_kg: number; repeticoes: number | null }[];
  const ultima = cargas[cargas.length - 1];
  const recorde = cargas.reduce((m, c) => Math.max(m, c.carga_kg), 0);
  const sugestao = {
    carga: ultima ? String(ultima.carga_kg).replace(".", ",") : naFicha[0]?.carga_kg != null ? String(naFicha[0].carga_kg).replace(".", ",") : "",
    reps: ultima?.repeticoes ? String(ultima.repeticoes) : (/\d+/.exec(naFicha[0]?.repeticoes ?? "")?.[0] ?? ""),
  };

  return (
    <>
      <header className="head">
        <div>
          <p className="muted small">
            <Link href="/aluno/exercicios" className="sublinhado-hover">
              Exercícios
            </Link>{" "}
            / {ex.nome}
          </p>
          <h1>{ex.nome}</h1>
        </div>
        <Link href="/aluno/treino" className="btn">
          Meu treino
        </Link>
      </header>
      <DetalheExercicio
        ex={ex}
        naFicha={
          naFicha.length ? (
            <div className="faixa faixa-info">
              <strong>No seu treino:</strong>{" "}
              {naFicha
                .map(
                  (n) =>
                    `ficha ${n.letra}, ${n.series} × ${n.repeticoes}${n.carga_kg !== null ? `, ${decimal(n.carga_kg)} kg` : ""}${n.descanso_seg !== null ? `, ${n.descanso_seg}s de descanso` : ""}`,
                )
                .join(" · ")}
            </div>
          ) : null
        }
      />

      <section className="secao" style={{ marginTop: 40 }}>
        <h2 className="secao-titulo">Minha evolução de carga</h2>
        <div className="two-equal">
          <div className="panel">
            <p className="muted small" style={{ marginBottom: 16 }}>
              Anote a carga que usou hoje. Anotar de novo no mesmo dia substitui o valor.
              {cargas.length ? ` Recorde: ${decimal(recorde)} kg.` : ""}
            </p>
            <CargaForm acao={registrarCarga.bind(null, ex.id)} sugestao={sugestao} />
            {cargas.length ? (
              <ul className="lista-simples" style={{ marginTop: 20 }}>
                {[...cargas]
                  .reverse()
                  .slice(0, 6)
                  .map((c) => (
                    <li key={c.id}>
                      <span>{formatarData(c.data)}</span>
                      <span className="row">
                        <span className="mono">
                          {decimal(c.carga_kg)} kg{c.repeticoes ? ` × ${c.repeticoes}` : ""}
                        </span>
                        <BotaoAcao acao={apagarCarga.bind(null, c.id)} rotulo="Apagar" perigo />
                      </span>
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
          {cargas.length >= 2 ? (
            <GraficoLinha titulo="Carga" unidade="kg" pontos={cargas.map((c) => ({ data: c.data, valor: c.carga_kg }))} />
          ) : (
            <div className="panel">
              <p className="muted">O gráfico aparece a partir da segunda anotação.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
