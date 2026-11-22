import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { Exportar } from "@/components/exportar";
import { exigirPermissao } from "@/lib/auth";
import { inadimplentes, pagamentosRecebidos, receitaPorMes, totaisInadimplencia, vencimentosProximos } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { addMeses, brl, FORMA_ROTULO, formatarData, formatarTelefone, hojeISO, plural, rotuloMes } from "@/lib/format";
import { BotaoAcao } from "@/components/botao-excluir";
import { pode } from "@/lib/permissoes";
import { recusarPixInformado, receberPagamento } from "../alunos/[id]/actions";
import { ReceberForm } from "../alunos/[id]/formularios";
import { GraficoReceita } from "../painel/graficos";
import { PixForm } from "./pix-form";

type Busca = Record<string, string | string[] | undefined>;
const ABAS = { inadimplencia: "Inadimplência", vencimentos: "Vencimentos próximos", recebidos: "Pagamentos recebidos", pix: "Pix" } as const;
type Informado = { id: number; aluno_id: number; nome: string; plano_nome: string; parcela: number; meses: number; valor_centavos: number; vencimento: string; informado_em: string };
type Aba = keyof typeof ABAS;

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const usuario = await exigirPermissao("financeiro.ver");
  const busca = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const aba: Aba = um(busca.aba) in ABAS ? (um(busca.aba) as Aba) : "inadimplencia";

  const db = getDb();
  const hoje = hojeISO();
  const mesHoje = hoje.slice(0, 7);
  const mes = /^\d{4}-\d{2}$/.test(um(busca.mes)) && um(busca.mes) <= mesHoje ? um(busca.mes) : mesHoje;
  const receita = receitaPorMes(db, hoje, 12);
  const atual = receita[receita.length - 1];
  const inad = totaisInadimplencia(db, hoje);
  const exportar = pode(usuario.perfil, "relatorios.exportar");

  const lista = aba === "inadimplencia" ? inadimplentes(db, hoje) : [];
  const vencendo = aba === "vencimentos" ? vencimentosProximos(db, hoje) : [];
  const recebidos = aba === "recebidos" ? pagamentosRecebidos(db, mes) : [];
  const totalRecebido = recebidos.reduce((s, p) => s + p.valor_centavos, 0);
  const informados = db
    .prepare(
      `SELECT pg.id, a.id AS aluno_id, a.nome, p.nome AS plano_nome, pg.parcela, p.meses, pg.valor_centavos, pg.vencimento, pg.informado_em
       FROM pagamento pg JOIN matricula m ON m.id = pg.matricula_id JOIN aluno a ON a.id = m.aluno_id JOIN plano p ON p.id = m.plano_id
       WHERE pg.informado_em IS NOT NULL AND pg.pago_em IS NULL ORDER BY pg.informado_em`,
    )
    .all() as Informado[];
  const configPix = Object.fromEntries(
    (db.prepare("SELECT chave, valor FROM config WHERE chave IN ('pix_chave', 'pix_nome', 'pix_cidade')").all() as { chave: string; valor: string }[]).map((r) => [r.chave, r.valor]),
  );
  const editarFinanceiro = pode(usuario.perfil, "financeiro.editar");
  const porForma = Object.entries(
    recebidos.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.forma]: (acc[p.forma] ?? 0) + p.valor_centavos }), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Cabecalho titulo="Financeiro" />

      <section className="kpis" aria-label="Indicadores financeiros">
        <div className="kpi">
          <span className="rotulo">Em atraso</span>
          <span className="num">{brl(inad.devido)}</span>
          <span className="detalhe">{plural(inad.alunos, "aluno", "alunos")}</span>
        </div>
        <div className="kpi">
          <span className="rotulo">Recebido em {rotuloMes(atual.mes)}</span>
          <span className="num">{brl(atual.recebido)}</span>
          <span className="detalhe">de {brl(atual.previsto)} previstos</span>
        </div>
        <div className="kpi">
          <span className="rotulo">Recebido nos últimos 12 meses</span>
          <span className="num">{brl(receita.reduce((s, m) => s + m.recebido, 0))}</span>
        </div>
      </section>

      <div style={{ marginBottom: 32 }}>
        <GraficoReceita meses={receita.map((m) => ({ ...m, rotulo: rotuloMes(m.mes), atual: m.mes === atual.mes }))} />
      </div>

      <nav className="abas" aria-label="Relatórios financeiros">
        {(Object.keys(ABAS) as Aba[]).map((a) => (
          <Link key={a} href={`/financeiro?aba=${a}`} aria-current={a === aba ? "page" : undefined}>
            {ABAS[a]}
            {a === "pix" && informados.length ? ` (${informados.length} a conferir)` : ""}
          </Link>
        ))}
      </nav>

      {aba === "inadimplencia" ? (
        <>
          <div className="secao-head">
            <p className="muted">Alunos com parcela vencida e não paga, do maior atraso para o menor.</p>
            {exportar ? <Exportar relatorio="inadimplencia" /> : null}
          </div>
          <div className="tabela">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Plano</th>
                  <th>Parcelas</th>
                  <th>Dias de atraso</th>
                  <th>Valor devido</th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={5}>
                      Ninguém em atraso.
                    </td>
                  </tr>
                ) : (
                  lista.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Aluno">
                        <Link href={`/alunos/${a.id}#pagamentos`} className="name sublinhado-hover">
                          {a.nome}
                        </Link>
                        <span className="sub">{formatarTelefone(a.telefone)}</span>
                      </td>
                      <td data-label="Plano">{a.plano_nome ?? "—"}</td>
                      <td data-label="Parcelas">{a.parcelas_atrasadas}</td>
                      <td data-label="Dias de atraso" className="mono">
                        {a.dias_atraso}
                      </td>
                      <td data-label="Valor devido" className="mono">
                        <strong>{brl(a.devido)}</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {aba === "vencimentos" ? (
        <>
          <div className="secao-head">
            <p className="muted">Matrículas que terminam nos próximos 7 dias e não têm renovação automática nem renovação agendada.</p>
            {exportar ? <Exportar relatorio="vencimentos" /> : null}
          </div>
          <div className="tabela">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Plano</th>
                  <th>Vence em</th>
                  <th>Telefone</th>
                </tr>
              </thead>
              <tbody>
                {vencendo.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={4}>
                      Nenhuma matrícula vence nos próximos 7 dias.
                    </td>
                  </tr>
                ) : (
                  vencendo.map((v) => (
                    <tr key={v.id}>
                      <td data-label="Aluno">
                        <Link href={`/alunos/${v.id}#matricula`} className="name sublinhado-hover">
                          {v.nome}
                        </Link>
                      </td>
                      <td data-label="Plano">{v.plano_nome}</td>
                      <td data-label="Vence em">
                        {formatarData(v.fim)} <span className="muted small">({v.dias === 0 ? "hoje" : plural(v.dias, "dia", "dias")})</span>
                      </td>
                      <td data-label="Telefone">{formatarTelefone(v.telefone)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {aba === "recebidos" ? (
        <>
          <div className="secao-head">
            <form method="get" action="/financeiro" className="receber">
              <input type="hidden" name="aba" value="recebidos" />
              <label htmlFor="mes" className="muted small" style={{ margin: 0 }}>
                Mês
              </label>
              <input id="mes" type="month" name="mes" defaultValue={mes} max={mesHoje} className="curto" style={{ width: 170 }} />
              <button type="submit" className="btn sm">
                Ver
              </button>
              <Link href={`/financeiro?aba=recebidos&mes=${addMeses(`${mes}-01`, -1).slice(0, 7)}`} className="btn sm">
                ← Anterior
              </Link>
            </form>
            {exportar ? <Exportar relatorio="pagamentos" params={new URLSearchParams({ mes })} /> : null}
          </div>
          <p style={{ marginBottom: 16 }}>
            <strong>{brl(totalRecebido)}</strong> em {plural(recebidos.length, "pagamento", "pagamentos")} em {rotuloMes(mes)}
            {porForma.length ? <span className="muted"> · {porForma.map(([f, v]) => `${FORMA_ROTULO[f]} ${brl(v)}`).join(" · ")}</span> : null}
          </p>
          <div className="tabela">
            <table>
              <thead>
                <tr>
                  <th>Pago em</th>
                  <th>Aluno</th>
                  <th>Parcela</th>
                  <th>Vencimento</th>
                  <th>Forma</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {recebidos.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={6}>
                      Nenhum pagamento recebido nesse mês.
                    </td>
                  </tr>
                ) : (
                  recebidos.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Pago em">{formatarData(p.pago_em)}</td>
                      <td data-label="Aluno">
                        <Link href={`/alunos/${p.aluno_id}#pagamentos`} className="name sublinhado-hover">
                          {p.nome}
                        </Link>
                      </td>
                      <td data-label="Parcela">
                        {p.plano_nome} {p.meses > 1 ? `${p.parcela}/${p.meses}` : ""}
                      </td>
                      <td data-label="Vencimento">{formatarData(p.vencimento)}</td>
                      <td data-label="Forma">{FORMA_ROTULO[p.forma] ?? p.forma}</td>
                      <td data-label="Valor" className="mono">
                        {brl(p.valor_centavos)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {aba === "pix" ? (
        <>
          <p className="muted" style={{ marginBottom: 16 }}>
            Parcelas que o aluno avisou pelo portal que pagou por Pix. Confira no extrato do banco e registre o pagamento; se o Pix não caiu, remova o aviso.
          </p>
          <div className="tabela" style={{ marginBottom: 32 }}>
            <table>
              <thead>
                <tr>
                  <th>Informado em</th>
                  <th>Aluno</th>
                  <th>Parcela</th>
                  <th>Valor</th>
                  <th className="actions">
                    <span className="sr">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {informados.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={5}>
                      Nenhum Pix aguardando conferência.
                    </td>
                  </tr>
                ) : (
                  informados.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Informado em">
                        {formatarData(p.informado_em.slice(0, 10))} <span className="muted small">{p.informado_em.slice(11, 16)}</span>
                      </td>
                      <td data-label="Aluno">
                        <Link href={`/alunos/${p.aluno_id}#pagamentos`} className="name sublinhado-hover">
                          {p.nome}
                        </Link>
                      </td>
                      <td data-label="Parcela">
                        {p.plano_nome} {p.meses > 1 ? `${p.parcela}/${p.meses}` : ""} <span className="muted small">· vence {formatarData(p.vencimento)}</span>
                      </td>
                      <td data-label="Valor" className="mono">
                        {brl(p.valor_centavos)}
                      </td>
                      <td className="actions">
                        {editarFinanceiro ? (
                          <>
                            <ReceberForm acao={receberPagamento.bind(null, p.id)} hoje={hoje} />
                            <BotaoAcao
                              acao={recusarPixInformado.bind(null, p.id)}
                              rotulo="Não caiu"
                              perigo
                              confirmacao={{
                                titulo: "O Pix não caiu?",
                                texto: `O aviso de ${p.nome} é removido e a parcela de ${brl(p.valor_centavos)} continua em aberto.`,
                                botao: "Remover aviso",
                              }}
                            />
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pode(usuario.perfil, "config.editar") ? (
            <section className="panel form-page">
              <h2>Pix da academia</h2>
              <p className="muted small" style={{ marginBottom: 16 }}>
                Usado para gerar o QR code e o &quot;copia e cola&quot; no portal do aluno. O dinheiro vai direto para esta chave.
              </p>
              <PixForm inicial={{ chave: configPix.pix_chave ?? "", nome: configPix.pix_nome ?? "", cidade: configPix.pix_cidade ?? "" }} />
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
