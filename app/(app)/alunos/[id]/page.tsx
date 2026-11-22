import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoAcao, BotaoExcluir } from "@/components/botao-excluir";
import { GraficoLinha } from "@/components/grafico-linha";
import { MapaFrequencia } from "@/components/mapa-frequencia";
import { QrCode } from "@/components/qr";
import { Status } from "@/components/status";
import { exigirUsuario } from "@/lib/auth";
import { buscarAluno } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import {
  addDias,
  brl,
  decimal,
  diasEntre,
  FORMA_ROTULO,
  formatarCpf,
  formatarData,
  formatarTelefone,
  GRUPO_ROTULO,
  hojeISO,
  plural,
} from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { idade } from "@/lib/validacao";
import { excluirAluno } from "../actions";
import {
  alternarRenovacaoAutomatica,
  cancelarMatricula,
  criarAvaliacao,
  estornarPagamento,
  excluirAvaliacao,
  receberPagamento,
  redefinirAcessoPortal,
  renovar,
} from "./actions";
import { AvaliacaoForm, ReceberForm, RenovarForm } from "./formularios";

type Matricula = { id: number; plano_nome: string; inicio: string; fim: string; valor_centavos: number; renovacao_automatica: number; cancelada_em: string | null };
type Parcela = { id: number; matricula_id: number; plano_nome: string; parcela: number; meses: number; valor_centavos: number; vencimento: string; pago_em: string | null; forma: string | null; informado_em: string | null };
type ItemFicha = { ficha_id: number; letra: string; objetivo: string; exercicio: string; grupo: string; series: number; repeticoes: string; carga_kg: number | null };
type Avaliacao = { id: number; data: string; peso_kg: number; altura_cm: number; gordura_pct: number | null; cintura_cm: number | null; quadril_cm: number | null; braco_cm: number | null; coxa_cm: number | null };

function SituacaoParcela({ p, hoje }: { p: Parcela; hoje: string }) {
  if (p.pago_em) return <span>Pago em {formatarData(p.pago_em)} · {FORMA_ROTULO[p.forma ?? ""] ?? p.forma}</span>;
  if (p.informado_em) return <strong>Aluno informou Pix em {formatarData(p.informado_em.slice(0, 10))}: conferir</strong>;
  if (p.vencimento < hoje) return <strong>Atrasado há {plural(diasEntre(p.vencimento, hoje), "dia", "dias")}</strong>;
  if (p.vencimento === hoje) return <strong>Vence hoje</strong>;
  return <span className="muted">A vencer</span>;
}

export default async function PerfilAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const alunoId = Number(id);
  if (!Number.isInteger(alunoId)) notFound();

  const db = getDb();
  const hoje = hojeISO();
  const aluno = buscarAluno(db, alunoId, hoje);
  if (!aluno) notFound();

  const verFinanceiro = pode(usuario.perfil, "financeiro.ver");
  const editarFinanceiro = pode(usuario.perfil, "financeiro.editar");
  const editarAluno = pode(usuario.perfil, "alunos.editar");
  const editarAvaliacao = pode(usuario.perfil, "avaliacoes.editar");

  const matriculas = db
    .prepare(
      `SELECT m.id, p.nome AS plano_nome, m.inicio, m.fim, m.valor_centavos, m.renovacao_automatica, m.cancelada_em
       FROM matricula m JOIN plano p ON p.id = m.plano_id WHERE m.aluno_id = ? ORDER BY m.inicio DESC, m.id DESC`,
    )
    .all(alunoId) as Matricula[];
  const atual = matriculas.find((m) => m.id === aluno.matricula_id);
  const agendada = matriculas.find((m) => !m.cancelada_em && m.inicio > hoje);

  // Parcelas: todas as em aberto + as pagas dos últimos 12 meses.
  const parcelas = verFinanceiro
    ? (db
        .prepare(
          `SELECT pg.id, pg.matricula_id, p.nome AS plano_nome, pg.parcela, p.meses, pg.valor_centavos, pg.vencimento, pg.pago_em, pg.forma, pg.informado_em
           FROM pagamento pg JOIN matricula m ON m.id = pg.matricula_id JOIN plano p ON p.id = m.plano_id
           WHERE m.aluno_id = ? AND (pg.pago_em IS NULL OR pg.vencimento >= ?)
           ORDER BY pg.vencimento DESC, pg.id DESC`,
        )
        .all(alunoId, addDias(hoje, -365)) as Parcela[])
    : [];
  const planos = db.prepare("SELECT id, nome, preco_centavos, meses FROM plano ORDER BY meses, nome").all() as {
    id: number;
    nome: string;
    preco_centavos: number;
    meses: number;
  }[];

  const itens = db
    .prepare(
      `SELECT f.id AS ficha_id, f.letra, f.objetivo, e.nome AS exercicio, e.grupo, fi.series, fi.repeticoes, fi.carga_kg
       FROM ficha f LEFT JOIN ficha_item fi ON fi.ficha_id = f.id LEFT JOIN exercicio e ON e.id = fi.exercicio_id
       WHERE f.aluno_id = ? ORDER BY f.letra, fi.ordem`,
    )
    .all(alunoId) as ItemFicha[];
  const fichas = [...new Map(itens.map((i) => [i.ficha_id, { letra: i.letra, objetivo: i.objetivo }])).entries()].map(([fid, f]) => ({
    ...f,
    itens: itens.filter((i) => i.ficha_id === fid && i.exercicio),
  }));

  const presencas = db
    .prepare("SELECT data, hora, saida FROM presenca WHERE aluno_id = ? AND data >= ? ORDER BY data DESC, hora DESC")
    .all(alunoId, addDias(hoje, -90)) as { data: string; hora: string; saida: string | null }[];
  const ultimos30 = presencas.filter((p) => p.data > addDias(hoje, -30)).length;
  const totalPresencas = (db.prepare("SELECT COUNT(*) AS n FROM presenca WHERE aluno_id = ?").get(alunoId) as { n: number }).n;

  const avaliacoes = db.prepare("SELECT * FROM avaliacao WHERE aluno_id = ? ORDER BY data").all(alunoId) as Avaliacao[];
  const temAcesso = Boolean((db.prepare("SELECT senha_hash IS NOT NULL AS ok FROM aluno WHERE id = ?").get(alunoId) as { ok: number }).ok);
  const ultimaAv = avaliacoes[avaliacoes.length - 1];
  const imc = ultimaAv ? ultimaAv.peso_kg / (ultimaAv.altura_cm / 100) ** 2 : null;

  return (
    <>
      <header className="head perfil-head">
        <div>
          <p className="muted small">
            <Link href="/alunos" className="sublinhado-hover">
              Alunos
            </Link>{" "}
            / Perfil
          </p>
          <h1>{aluno.nome}</h1>
          <div className="row" style={{ marginTop: 12 }}>
            <Status status={aluno.situacao} />
            <span className="muted small">· desde {formatarData(aluno.cadastro)}</span>
          </div>
        </div>
        <div className="row">
          <Link href={`/alunos/${aluno.id}/treino`} className="btn">
            Treino
          </Link>
          {editarAluno ? (
            <>
              <Link href={`/alunos/${aluno.id}/editar`} className="btn">
                Editar
              </Link>
              <BotaoExcluir
                acao={excluirAluno.bind(null, aluno.id)}
                nome={aluno.nome}
                detalhe="Matrículas, pagamentos, frequência, treinos e avaliações dele também serão removidos."
                depois="/alunos"
              />
            </>
          ) : null}
        </div>
      </header>

      {verFinanceiro && aluno.situacao === "pendente" ? (
        <div className="faixa" role="status">
          <strong>Pagamento pendente:</strong> {brl(aluno.devido)} em {plural(aluno.parcelas_atrasadas, "parcela", "parcelas")},
          a mais antiga atrasada há {plural(aluno.dias_atraso, "dia", "dias")}.
        </div>
      ) : null}

      <nav className="ancoras" aria-label="Seções do perfil">
        <a href="#dados">Dados</a>
        <a href="#matricula">Matrícula</a>
        {verFinanceiro ? <a href="#pagamentos">Pagamentos</a> : null}
        <a href="#treino">Treino</a>
        <a href="#frequencia">Frequência</a>
        <a href="#evolucao">Evolução</a>
      </nav>

      {/* ---------- Dados ---------- */}
      <section id="dados" className="secao perfil-dados">
        <div className="panel">
          <h2>Dados</h2>
          <dl className="dados">
            <dt>CPF</dt>
            <dd>{formatarCpf(aluno.cpf)}</dd>
            <dt>Nascimento</dt>
            <dd>
              {formatarData(aluno.nascimento)} ({idade(aluno.nascimento, hoje)} anos)
            </dd>
            <dt>E-mail</dt>
            <dd>{aluno.email}</dd>
            <dt>Telefone</dt>
            <dd>{formatarTelefone(aluno.telefone)}</dd>
            <dt>Instrutor</dt>
            <dd>{aluno.instrutor_nome ?? "Sem instrutor"}</dd>
            <dt>Último treino</dt>
            <dd>{aluno.ultima_presenca ? `${formatarData(aluno.ultima_presenca)} (há ${plural(diasEntre(aluno.ultima_presenca, hoje), "dia", "dias")})` : "Nunca veio"}</dd>
            <dt>Portal do aluno</dt>
            <dd>{temAcesso ? "Acesso criado" : "Aguardando primeiro acesso"}</dd>
          </dl>
          {editarAluno && temAcesso ? (
            <BotaoAcao
              acao={redefinirAcessoPortal.bind(null, aluno.id)}
              rotulo="Redefinir acesso ao portal"
              confirmacao={{
                titulo: "Redefinir o acesso ao portal?",
                texto: "A senha atual do aluno deixa de valer. Ele(a) cria uma nova no primeiro acesso, confirmando CPF e data de nascimento.",
                botao: "Redefinir",
              }}
            />
          ) : !temAcesso ? (
            <p className="hint">Para entrar no portal (/aluno), o aluno usa &quot;Primeiro acesso&quot; com o CPF e a data de nascimento do cadastro.</p>
          ) : null}
        </div>
        <div className="panel carteirinha">
          <h2>Carteirinha</h2>
          <QrCode texto={aluno.codigo} />
          <p className="mono codigo">{aluno.codigo}</p>
          <p className="hint">Mostre este código na recepção para registrar a entrada.</p>
        </div>
      </section>

      {/* ---------- Matrícula ---------- */}
      <section id="matricula" className="secao">
        <h2 className="secao-titulo">Matrícula</h2>
        <div className="two-equal">
          <div className="panel">
            {atual ? (
              <>
                <p className="muted small">{atual.fim < hoje ? "Última matrícula (vencida)" : atual.inicio > hoje ? "Matrícula agendada" : "Matrícula atual"}</p>
                <p className="destaque">{atual.plano_nome}</p>
                <dl className="dados">
                  <dt>Período</dt>
                  <dd>
                    {formatarData(atual.inicio)} a {formatarData(atual.fim)}
                  </dd>
                  <dt>Valor</dt>
                  <dd>{brl(atual.valor_centavos)}</dd>
                  <dt>{atual.fim < hoje ? "Venceu há" : "Vence em"}</dt>
                  <dd>{plural(Math.abs(diasEntre(hoje, atual.fim)), "dia", "dias")}</dd>
                  <dt>Renovação automática</dt>
                  <dd>{atual.renovacao_automatica ? "Ligada" : "Desligada"}</dd>
                </dl>
                {editarAluno ? (
                  <div className="row">
                    <BotaoAcao
                      acao={alternarRenovacaoAutomatica.bind(null, aluno.id, atual.id)}
                      rotulo={atual.renovacao_automatica ? "Desligar renovação automática" : "Ligar renovação automática"}
                    />
                    <BotaoAcao
                      acao={cancelarMatricula.bind(null, aluno.id, atual.id)}
                      rotulo="Cancelar matrícula"
                      perigo
                      confirmacao={{
                        titulo: "Cancelar a matrícula?",
                        texto: "As parcelas que ainda não venceram serão removidas. Parcelas atrasadas continuam como dívida.",
                        botao: "Cancelar matrícula",
                      }}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="muted">Sem matrícula ativa.</p>
            )}
          </div>
          {editarAluno && aluno.ativo && !agendada ? (
            <div className="panel">
              <p className="muted small" style={{ marginBottom: 16 }}>
                A nova matrícula começa {atual && atual.fim >= hoje ? `em ${formatarData(addDias(atual.fim, 1))}, logo depois da atual` : "hoje"}.
              </p>
              <RenovarForm acao={renovar.bind(null, aluno.id)} planos={planos} planoAtual={aluno.plano_id} />
            </div>
          ) : agendada ? (
            <div className="panel">
              <p className="muted small">Renovação agendada</p>
              <p className="destaque">{agendada.plano_nome}</p>
              <p>
                De {formatarData(agendada.inicio)} a {formatarData(agendada.fim)}
              </p>
            </div>
          ) : null}
        </div>

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
      </section>

      {/* ---------- Pagamentos ---------- */}
      {verFinanceiro ? (
        <section id="pagamentos" className="secao">
          <h2 className="secao-titulo">
            Pagamentos <span className="muted small">(em aberto e últimos 12 meses)</span>
          </h2>
          <div className="tabela">
            <table>
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Parcela</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th className="actions">
                    <span className="sr">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {parcelas.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={5}>
                      Nenhuma parcela.
                    </td>
                  </tr>
                ) : (
                  parcelas.map((p) => (
                    <tr key={p.id} className={!p.pago_em && p.vencimento < hoje ? "linha-alerta" : undefined}>
                      <td data-label="Vencimento">{formatarData(p.vencimento)}</td>
                      <td data-label="Parcela">
                        {p.plano_nome} {p.meses > 1 ? `${p.parcela}/${p.meses}` : ""}
                      </td>
                      <td data-label="Valor">{brl(p.valor_centavos)}</td>
                      <td data-label="Situação">
                        <SituacaoParcela p={p} hoje={hoje} />
                      </td>
                      <td className="actions">
                        {editarFinanceiro ? (
                          p.pago_em ? (
                            <BotaoAcao
                              acao={estornarPagamento.bind(null, p.id)}
                              rotulo="Estornar"
                              perigo
                              confirmacao={{
                                titulo: "Estornar este pagamento?",
                                texto: `A parcela de ${brl(p.valor_centavos)} paga em ${formatarData(p.pago_em)} voltará a ficar em aberto.`,
                                botao: "Estornar",
                              }}
                            />
                          ) : (
                            <ReceberForm acao={receberPagamento.bind(null, p.id)} hoje={hoje} />
                          )
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* ---------- Treino ---------- */}
      <section id="treino" className="secao">
        <div className="secao-head">
          <h2 className="secao-titulo">Treino</h2>
          <Link href={`/alunos/${aluno.id}/treino`} className="btn sm">
            {pode(usuario.perfil, "treinos.editar") ? "Montar treino" : "Ver treino completo"}
          </Link>
        </div>
        {fichas.length === 0 ? (
          <p className="muted">Nenhuma ficha de treino ainda.</p>
        ) : (
          <div className="cards">
            {fichas.map((f) => (
              <article key={f.letra} className="card ficha">
                <h3>
                  Ficha {f.letra} <span className="muted small">{f.objetivo}</span>
                </h3>
                <ol>
                  {f.itens.map((i, n) => (
                    <li key={n}>
                      <span>{i.exercicio}</span>
                      <span className="muted small">
                        {i.series}×{i.repeticoes}
                        {i.carga_kg ? ` · ${decimal(i.carga_kg)} kg` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="muted small">{[...new Set(f.itens.map((i) => GRUPO_ROTULO[i.grupo]))].join(", ")}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Frequência ---------- */}
      <section id="frequencia" className="secao">
        <h2 className="secao-titulo">Frequência</h2>
        <div className="two-equal">
          <div className="panel">
            <div className="mini-kpis">
              <div>
                <span className="num">{ultimos30}</span>
                <span className="muted small">treinos nos últimos 30 dias</span>
              </div>
              <div>
                <span className="num">{decimal((presencas.filter((p) => p.data > addDias(hoje, -84)).length / 12), 1)}</span>
                <span className="muted small">por semana (média de 12 semanas)</span>
              </div>
              <div>
                <span className="num">{totalPresencas}</span>
                <span className="muted small">treinos no total</span>
              </div>
            </div>
            <MapaFrequencia dias={new Set(presencas.map((p) => p.data))} hoje={hoje} />
          </div>
          <div className="panel">
            <h3 className="mini-titulo">Últimas entradas</h3>
            {presencas.length === 0 ? (
              <p className="muted">Nenhuma entrada nos últimos 90 dias.</p>
            ) : (
              <ul className="lista-simples">
                {presencas.slice(0, 8).map((p) => (
                  <li key={p.data}>
                    <span>{formatarData(p.data)}</span>
                    <span className="mono muted">
                      {p.hora.slice(0, 5)} – {p.saida ? p.saida.slice(0, 5) : "ainda na academia"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Evolução ---------- */}
      <section id="evolucao" className="secao">
        <h2 className="secao-titulo">Evolução</h2>
        {avaliacoes.length === 0 ? (
          <p className="muted" style={{ marginBottom: 20 }}>
            Nenhuma avaliação física registrada.
          </p>
        ) : (
          <>
            <div className="mini-kpis faixa-kpis">
              <div>
                <span className="num">{decimal(ultimaAv.peso_kg)} kg</span>
                <span className="muted small">peso</span>
              </div>
              <div>
                <span className="num">{ultimaAv.gordura_pct !== null ? `${decimal(ultimaAv.gordura_pct)}%` : "—"}</span>
                <span className="muted small">gordura</span>
              </div>
              <div>
                <span className="num">{imc ? decimal(imc) : "—"}</span>
                <span className="muted small">IMC</span>
              </div>
              <div>
                <span className="num">{avaliacoes.length}</span>
                <span className="muted small">avaliações</span>
              </div>
            </div>
            <div className="graficos-dois" style={{ marginBottom: 16 }}>
              <GraficoLinha titulo="Peso" unidade="kg" pontos={avaliacoes.map((a) => ({ data: a.data, valor: a.peso_kg }))} />
              <GraficoLinha
                titulo="Gordura corporal"
                unidade="%"
                pontos={avaliacoes.filter((a) => a.gordura_pct !== null).map((a) => ({ data: a.data, valor: a.gordura_pct! }))}
              />
            </div>
            <details className="historico">
              <summary>Todas as avaliações ({avaliacoes.length})</summary>
              <div className="tabela">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Peso</th>
                      <th>Altura</th>
                      <th>Gordura</th>
                      <th>Cintura</th>
                      <th>Quadril</th>
                      <th>Braço</th>
                      <th>Coxa</th>
                      <th className="actions">
                        <span className="sr">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...avaliacoes].reverse().map((a) => (
                      <tr key={a.id}>
                        <td data-label="Data">{formatarData(a.data)}</td>
                        <td data-label="Peso">{decimal(a.peso_kg)} kg</td>
                        <td data-label="Altura">{decimal(a.altura_cm, 0)} cm</td>
                        <td data-label="Gordura">{a.gordura_pct !== null ? `${decimal(a.gordura_pct)}%` : "—"}</td>
                        <td data-label="Cintura">{decimal(a.cintura_cm)}</td>
                        <td data-label="Quadril">{decimal(a.quadril_cm)}</td>
                        <td data-label="Braço">{decimal(a.braco_cm)}</td>
                        <td data-label="Coxa">{decimal(a.coxa_cm)}</td>
                        <td className="actions">
                          {editarAvaliacao ? (
                            <BotaoExcluir acao={excluirAvaliacao.bind(null, aluno.id, a.id)} nome={`a avaliação de ${formatarData(a.data)}`} />
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
        {editarAvaliacao ? (
          <div className="panel" style={{ marginTop: 16 }}>
            <h3 className="mini-titulo">Nova avaliação</h3>
            <AvaliacaoForm acao={criarAvaliacao.bind(null, aluno.id)} hoje={hoje} alturaAnterior={ultimaAv?.altura_cm} />
          </div>
        ) : null}
      </section>
    </>
  );
}
