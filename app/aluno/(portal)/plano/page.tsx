import { exigirAluno } from "@/lib/auth-aluno";
import { getDb } from "@/lib/db";
import { brl, diasEntre, formatarData, hojeISO, plural } from "@/lib/format";

export const metadata = { title: "Meu plano · Pulso" };

type Matricula = { id: number; plano_nome: string; meses: number; inicio: string; fim: string; valor_centavos: number; renovacao_automatica: number; cancelada_em: string | null };
type Plano = { id: number; nome: string; preco_centavos: number; meses: number };

export default async function PlanoAlunoPage() {
  const { id } = await exigirAluno();
  const db = getDb();
  const hoje = hojeISO();
  const matriculas = db
    .prepare(
      `SELECT m.id, p.nome AS plano_nome, p.meses, m.inicio, m.fim, m.valor_centavos, m.renovacao_automatica, m.cancelada_em
       FROM matricula m JOIN plano p ON p.id = m.plano_id WHERE m.aluno_id = ? ORDER BY m.inicio DESC, m.id DESC`,
    )
    .all(id) as Matricula[];
  const validas = matriculas.filter((m) => !m.cancelada_em);
  const atual = validas.find((m) => m.inicio <= hoje && m.fim >= hoje) ?? validas.find((m) => m.inicio <= hoje);
  const agendada = validas.find((m) => m.inicio > hoje);
  const planos = db.prepare("SELECT id, nome, preco_centavos, meses FROM plano ORDER BY meses, nome").all() as Plano[];
  const porMes = (p: Plano) => p.preco_centavos / p.meses;
  const referencia = planos.find((p) => p.meses === 1) ?? planos[0];

  const total = atual ? diasEntre(atual.inicio, atual.fim) + 1 : 0;
  const passados = atual ? Math.min(total, Math.max(0, diasEntre(atual.inicio, hoje) + 1)) : 0;
  const pct = total ? Math.round((passados / total) * 100) : 0;

  return (
    <>
      <header className="head">
        <div>
          <h1>Meu plano</h1>
        </div>
      </header>

      <div className="two-equal">
        <section className="panel">
          {atual ? (
            <>
              <p className="muted small">{atual.fim < hoje ? "Último plano (vencido)" : "Plano atual"}</p>
              <p className="destaque">{atual.plano_nome}</p>
              <div className="barra" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Quanto do plano já passou" style={{ margin: "16px 0 8px" }}>
                <span style={{ width: `${pct}%` }} className={atual.fim < hoje || diasEntre(hoje, atual.fim) <= 7 ? "cheia" : undefined} />
              </div>
              <p className="muted small" style={{ marginBottom: 16 }}>
                {atual.fim < hoje ? `Venceu há ${plural(diasEntre(atual.fim, hoje), "dia", "dias")}` : `Faltam ${plural(diasEntre(hoje, atual.fim), "dia", "dias")}`}
              </p>
              <dl className="dados">
                <dt>Período</dt>
                <dd>
                  {formatarData(atual.inicio)} a {formatarData(atual.fim)}
                </dd>
                <dt>Valor do contrato</dt>
                <dd>
                  {brl(atual.valor_centavos)}
                  {atual.meses > 1 ? ` (${atual.meses}× de ${brl(Math.round(atual.valor_centavos / atual.meses))})` : ""}
                </dd>
                <dt>Renovação automática</dt>
                <dd>{atual.renovacao_automatica ? "Ligada: renova sozinho no fim do período" : "Desligada"}</dd>
              </dl>
            </>
          ) : (
            <p className="muted">Você não tem matrícula ativa. Fale com a recepção para escolher um plano.</p>
          )}
        </section>

        <section className="panel">
          {agendada ? (
            <>
              <p className="muted small">Próximo período (já renovado)</p>
              <p className="destaque">{agendada.plano_nome}</p>
              <p>
                De {formatarData(agendada.inicio)} a {formatarData(agendada.fim)} · {brl(agendada.valor_centavos)}
              </p>
            </>
          ) : (
            <>
              <h2>Quer renovar ou trocar de plano?</h2>
              <p className="muted">
                Fale com a recepção. A renovação começa no dia seguinte ao fim do plano atual, então você não perde nenhum dia.
              </p>
            </>
          )}
        </section>
      </div>

      <section className="secao">
        <h2 className="secao-titulo">Planos da academia</h2>
        <div className="cards">
          {planos.map((p) => {
            const economia = referencia && p.meses > 1 ? Math.round((1 - porMes(p) / porMes(referencia)) * 100) : 0;
            return (
              <article key={p.id} className={`card${atual?.plano_nome === p.nome ? " card-atual" : ""}`}>
                <h3>
                  {p.nome} {atual?.plano_nome === p.nome ? <span className="tag tag-forte">seu plano</span> : null}
                </h3>
                <span className="price">{brl(Math.round(porMes(p)))}</span>
                <span className="muted small">por mês</span>
                <dl>
                  <dt>Duração</dt>
                  <dd>{plural(p.meses, "mês", "meses")}</dd>
                  <dt>Total</dt>
                  <dd>{brl(p.preco_centavos)}</dd>
                  <dt>Economia</dt>
                  <dd>{economia > 0 ? `${economia}% vs ${referencia.nome}` : "—"}</dd>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      {matriculas.length > 1 ? (
        <details className="historico">
          <summary>Histórico de matrículas ({matriculas.length})</summary>
          <table>
            <thead>
              <tr>
                <th>Plano</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Valor</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {matriculas.map((m) => (
                <tr key={m.id}>
                  <td data-label="Plano">{m.plano_nome}</td>
                  <td data-label="Início">{formatarData(m.inicio)}</td>
                  <td data-label="Fim">{formatarData(m.fim)}</td>
                  <td data-label="Valor">{brl(m.valor_centavos)}</td>
                  <td data-label="Situação">
                    {m.cancelada_em ? `Cancelada em ${formatarData(m.cancelada_em)}` : m.inicio > hoje ? "Agendada" : m.fim < hoje ? "Encerrada" : "Em vigor"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </>
  );
}
