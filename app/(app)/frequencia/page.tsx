import Link from "next/link";
import { AtualizarSozinho } from "@/components/atualizar-sozinho";
import { BotaoAcao, BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/cabecalho";
import { Exportar } from "@/components/exportar";
import { exigirUsuario } from "@/lib/auth";
import { capacidadeMaxima, quemEstaDentro } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { agoraHora, hojeISO } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { registrarSaida, removerEntrada } from "./actions";
import { CapacidadeForm } from "./capacidade-form";
import { Checkin } from "./checkin";

type Entrada = { id: number; aluno_id: number; nome: string; plano_nome: string | null; hora: string; saida: string | null };

function minutosDesde(hora: string, agora: string): number {
  const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  return Math.max(0, m(agora) - m(hora));
}

function duracao(min: number): string {
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
}

export default async function FrequenciaPage() {
  const usuario = await exigirUsuario();
  const db = getDb();
  const hoje = hojeISO();
  const agora = agoraHora();
  const registrar = pode(usuario.perfil, "frequencia.registrar");

  const dentro = quemEstaDentro(db, hoje);
  const capacidade = capacidadeMaxima(db);
  const ocupacao = Math.min(100, Math.round((dentro.length / capacidade) * 100));

  const entradas = db
    .prepare(
      `SELECT pr.id, pr.aluno_id, pr.hora, pr.saida, a.nome,
              (SELECT p.nome FROM matricula m JOIN plano p ON p.id = m.plano_id
               WHERE m.aluno_id = a.id AND m.cancelada_em IS NULL
               ORDER BY (m.inicio <= pr.data AND m.fim >= pr.data) DESC, m.inicio DESC LIMIT 1) AS plano_nome
       FROM presenca pr JOIN aluno a ON a.id = pr.aluno_id
       WHERE pr.data = ?
       ORDER BY pr.hora DESC, pr.id DESC`,
    )
    .all(hoje) as Entrada[];

  return (
    <>
      <AtualizarSozinho segundos={30} />
      <Cabecalho titulo="Frequência">
        {pode(usuario.perfil, "relatorios.exportar") ? <Exportar relatorio="frequencia" /> : null}
      </Cabecalho>

      <div className="two">
        <div>
          {registrar ? (
            <section className="panel" style={{ marginBottom: 16 }}>
              <h2>Check-in rápido</h2>
              <Checkin />
            </section>
          ) : null}

          <section className="panel lotacao" aria-label="Lotação ao vivo">
            <h2>Lotação ao vivo</h2>
            <p className="lotacao-num">
              <span className="num">{dentro.length}</span>
              <span className="muted"> de {capacidade} pessoas</span>
            </p>
            <div className="barra" role="meter" aria-valuemin={0} aria-valuemax={capacidade} aria-valuenow={dentro.length} aria-label="Ocupação">
              <span style={{ width: `${ocupacao}%` }} className={ocupacao >= 90 ? "cheia" : undefined} />
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>
              {ocupacao}% da capacidade · atualiza sozinho a cada 30 s
            </p>
            {pode(usuario.perfil, "config.editar") ? (
              <div style={{ marginTop: 16 }}>
                <CapacidadeForm atual={capacidade} />
              </div>
            ) : null}
          </section>
        </div>

        <div>
          <section className="secao">
            <h2 className="secao-titulo">Na academia agora ({dentro.length})</h2>
            {dentro.length === 0 ? (
              <p className="muted">Ninguém na academia neste momento.</p>
            ) : (
              <ul className="lista-simples dentro">
                {dentro.map((d) => (
                  <li key={d.id}>
                    <span>
                      <Link href={`/alunos/${d.aluno_id}`} className="name sublinhado-hover">
                        {d.nome}
                      </Link>
                      <span className="sub mono">
                        entrou {d.hora.slice(0, 5)} · há {duracao(minutosDesde(d.hora, agora))}
                      </span>
                    </span>
                    {registrar ? <BotaoAcao acao={registrarSaida.bind(null, d.id)} rotulo="Registrar saída" /> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="secao">
            <h2 className="secao-titulo">Entradas de hoje ({entradas.length})</h2>
            <div className="tabela">
              <table>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Plano</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th className="actions">
                      <span className="sr">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entradas.length === 0 ? (
                    <tr>
                      <td className="empty" colSpan={5}>
                        Ninguém registrou entrada hoje ainda.
                      </td>
                    </tr>
                  ) : (
                    entradas.map((e) => (
                      <tr key={e.id}>
                        <td data-label="Aluno">
                          <Link href={`/alunos/${e.aluno_id}`} className="name sublinhado-hover">
                            {e.nome}
                          </Link>
                        </td>
                        <td data-label="Plano">{e.plano_nome ?? "—"}</td>
                        <td data-label="Entrada" className="mono">
                          {e.hora}
                        </td>
                        <td data-label="Saída" className="mono">
                          {e.saida ?? <span className="muted">na academia</span>}
                        </td>
                        <td className="actions">
                          {registrar ? (
                            <BotaoExcluir acao={removerEntrada.bind(null, e.id)} nome={`a entrada de ${e.nome}`} rotulo="Remover" />
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
