import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import { exigirUsuario } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { decimal, formatarData, GRUPO_ROTULO } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { adicionarExercicio, criarFicha, excluirFicha, moverExercicio, removerExercicio } from "./actions";
import { AdicionarExercicioForm, BotoesOrdem, NovaFichaForm } from "./formularios";

type Ficha = { id: number; letra: string; objetivo: string; atualizada_em: string; instrutor_nome: string | null };
type Item = { id: number; ficha_id: number; nome: string; grupo: string; equipamento: string; series: number; repeticoes: string; carga_kg: number | null; descanso_seg: number | null };

export default async function TreinoPage({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const alunoId = Number(id);
  if (!Number.isInteger(alunoId)) notFound();

  const db = getDb();
  const aluno = db
    .prepare("SELECT a.id, a.nome, i.nome AS instrutor_nome FROM aluno a LEFT JOIN instrutor i ON i.id = a.instrutor_id WHERE a.id = ?")
    .get(alunoId) as { id: number; nome: string; instrutor_nome: string | null } | undefined;
  if (!aluno) notFound();

  const editar = pode(usuario.perfil, "treinos.editar");
  const fichas = db
    .prepare(
      `SELECT f.id, f.letra, f.objetivo, f.atualizada_em, i.nome AS instrutor_nome
       FROM ficha f LEFT JOIN instrutor i ON i.id = f.instrutor_id WHERE f.aluno_id = ? ORDER BY f.letra`,
    )
    .all(alunoId) as Ficha[];
  const itens = db
    .prepare(
      `SELECT fi.id, fi.ficha_id, e.nome, e.grupo, e.equipamento, fi.series, fi.repeticoes, fi.carga_kg, fi.descanso_seg
       FROM ficha_item fi JOIN ficha f ON f.id = fi.ficha_id JOIN exercicio e ON e.id = fi.exercicio_id
       WHERE f.aluno_id = ? ORDER BY fi.ordem`,
    )
    .all(alunoId) as Item[];
  const exercicios = editar
    ? (db.prepare("SELECT id, nome, grupo, equipamento FROM exercicio ORDER BY nome").all() as { id: number; nome: string; grupo: string; equipamento: string }[])
    : [];
  const livres = ["A", "B", "C", "D", "E"].filter((l) => !fichas.some((f) => f.letra === l));

  return (
    <>
      <header className="head">
        <div>
          <p className="muted small">
            <Link href="/alunos" className="sublinhado-hover">
              Alunos
            </Link>{" "}
            /{" "}
            <Link href={`/alunos/${aluno.id}`} className="sublinhado-hover">
              {aluno.nome}
            </Link>{" "}
            / Treino
          </p>
          <h1>Fichas de treino</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {aluno.nome} · instrutor responsável: {aluno.instrutor_nome ?? "nenhum"}
          </p>
        </div>
        {editar && exercicios.length === 0 ? (
          <Link href="/exercicios/novo" className="btn">
            Cadastrar exercícios
          </Link>
        ) : null}
      </header>

      {editar ? (
        <div className="panel" style={{ marginBottom: 32 }}>
          <h2>Nova ficha</h2>
          <NovaFichaForm acao={criarFicha.bind(null, aluno.id)} livres={livres} />
        </div>
      ) : null}

      {fichas.length === 0 ? <p className="empty">Nenhuma ficha de treino ainda.</p> : null}

      {fichas.map((f) => {
        const daFicha = itens.filter((i) => i.ficha_id === f.id);
        return (
          <section key={f.id} className="secao">
            <div className="secao-head">
              <div>
                <h2 className="secao-titulo" style={{ marginBottom: 2 }}>
                  Ficha {f.letra} {f.objetivo ? <span className="muted">· {f.objetivo}</span> : null}
                </h2>
                <p className="muted small">
                  Atualizada em {formatarData(f.atualizada_em)}
                  {f.instrutor_nome ? ` por ${f.instrutor_nome}` : ""} · {daFicha.length} exercícios ·{" "}
                  {[...new Set(daFicha.map((i) => GRUPO_ROTULO[i.grupo]))].join(", ") || "sem exercícios"}
                </p>
              </div>
              {editar ? <BotaoExcluir acao={excluirFicha.bind(null, aluno.id, f.id)} nome={`a ficha ${f.letra}`} detalhe="Os exercícios dela também saem." /> : null}
            </div>

            <div className="tabela">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>Exercício</th>
                    <th>Séries × reps</th>
                    <th>Carga</th>
                    <th>Descanso</th>
                    {editar ? (
                      <th className="actions">
                        <span className="sr">Ações</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {daFicha.length === 0 ? (
                    <tr>
                      <td className="empty" colSpan={editar ? 6 : 5}>
                        Nenhum exercício nesta ficha.
                      </td>
                    </tr>
                  ) : (
                    daFicha.map((i, n) => (
                      <tr key={i.id}>
                        <td data-label="#" className="muted mono">
                          {n + 1}
                        </td>
                        <td data-label="Exercício">
                          <span>
                            <span className="name">{i.nome}</span>
                            <span className="sub">
                              {GRUPO_ROTULO[i.grupo]} · {i.equipamento}
                            </span>
                          </span>
                        </td>
                        <td data-label="Séries × reps" className="mono">
                          {i.series} × {i.repeticoes}
                        </td>
                        <td data-label="Carga">{i.carga_kg !== null ? `${decimal(i.carga_kg)} kg` : "—"}</td>
                        <td data-label="Descanso">{i.descanso_seg !== null ? `${i.descanso_seg} s` : "—"}</td>
                        {editar ? (
                          <td className="actions">
                            <BotoesOrdem
                              subir={moverExercicio.bind(null, aluno.id, i.id, -1)}
                              descer={moverExercicio.bind(null, aluno.id, i.id, 1)}
                              primeiro={n === 0}
                              ultimo={n === daFicha.length - 1}
                            />
                            <BotaoExcluir acao={removerExercicio.bind(null, aluno.id, i.id)} nome={`${i.nome} da ficha ${f.letra}`} rotulo="Remover" />
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {editar ? (
              <div className="panel adicionar">
                <AdicionarExercicioForm acao={adicionarExercicio.bind(null, aluno.id, f.id)} exercicios={exercicios} prefixo={`f${f.id}`} />
              </div>
            ) : null}
          </section>
        );
      })}
    </>
  );
}
