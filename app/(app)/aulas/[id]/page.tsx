import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoAcao } from "@/components/botao-excluir";
import { horaFim } from "@/lib/aulas";
import { exigirUsuario } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addDias, diaDaSemana, formatarData, formatarTelefone, hojeISO } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { DIAS_LONGOS } from "@/lib/rotina";
import { removerReserva } from "../actions";

type Reserva = { id: number; aluno_id: number; nome: string; telefone: string; criada_em: string; veio: number };

export default async function AulaPage({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = getDb();
  const hoje = hojeISO();
  const aula = db
    .prepare("SELECT a.*, i.nome AS instrutor_nome FROM aula a LEFT JOIN instrutor i ON i.id = a.instrutor_id WHERE a.id = ?")
    .get(id) as { id: number; nome: string; dia_semana: number; hora: string; duracao_min: number; vagas: number; sala: string; instrutor_nome: string | null } | undefined;
  if (!aula) notFound();
  const editar = pode(usuario.perfil, "aulas.editar");

  // As duas próximas datas da aula (a de hoje conta) e a última que já passou.
  let proxima = hoje;
  while (diaDaSemana(proxima) !== aula.dia_semana) proxima = addDias(proxima, 1);
  const datas = [addDias(proxima, -7), proxima, addDias(proxima, 7)];
  const reservasDe = (data: string) =>
    db
      .prepare(
        `SELECT r.id, a.id AS aluno_id, a.nome, a.telefone, r.criada_em,
                EXISTS (SELECT 1 FROM presenca p WHERE p.aluno_id = a.id AND p.data = r.data) AS veio
         FROM aula_reserva r JOIN aluno a ON a.id = r.aluno_id WHERE r.aula_id = ? AND r.data = ? ORDER BY r.criada_em`,
      )
      .all(id, data) as Reserva[];

  return (
    <>
      <header className="head">
        <div>
          <p className="muted small">
            <Link href="/aulas" className="sublinhado-hover">
              Aulas
            </Link>{" "}
            / {aula.nome}
          </p>
          <h1>{aula.nome}</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {DIAS_LONGOS[aula.dia_semana]}, {aula.hora}–{horaFim(aula.hora, aula.duracao_min)}
            {aula.sala ? ` · ${aula.sala}` : ""} · {aula.instrutor_nome ?? "sem instrutor"} · {aula.vagas} vagas
          </p>
        </div>
        {editar ? (
          <Link href={`/aulas/${aula.id}/editar`} className="btn">
            Editar
          </Link>
        ) : null}
      </header>

      {datas.map((data) => {
        const lista = reservasDe(data);
        const passou = data < hoje;
        return (
          <section key={data} className="secao">
            <h2 className="secao-titulo">
              {formatarData(data)} {data === hoje ? "(hoje)" : passou ? "(já aconteceu)" : ""}{" "}
              <span className="muted">
                · {lista.length}/{aula.vagas} reservas
              </span>
            </h2>
            {lista.length === 0 ? (
              <p className="muted">Ninguém reservou.</p>
            ) : (
              <ul className="lista-simples">
                {lista.map((r) => (
                  <li key={r.id}>
                    <span>
                      <Link href={`/alunos/${r.aluno_id}`} className="name sublinhado-hover">
                        {r.nome}
                      </Link>{" "}
                      <span className="muted small">{formatarTelefone(r.telefone)}</span>
                    </span>
                    <span className="row">
                      {passou || data === hoje ? <span className="muted small">{r.veio ? "✓ entrou na academia" : "não registrou entrada"}</span> : null}
                      {editar && !passou ? <BotaoAcao acao={removerReserva.bind(null, r.id)} rotulo="Tirar da lista" perigo /> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}
