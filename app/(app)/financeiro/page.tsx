import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { Exportar } from "@/components/exportar";
import { exigirPermissao } from "@/lib/auth";
import { inadimplentes, pagamentosRecebidos, receitaPorMes, totaisInadimplencia, vencimentosProximos } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { addMeses, brl, FORMA_ROTULO, formatarData, formatarTelefone, hojeISO, plural, rotuloMes } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { GraficoReceita } from "../painel/graficos";

type Busca = Record<string, string | string[] | undefined>;
const ABAS = { inadimplencia: "Inadimplência", vencimentos: "Vencimentos próximos", recebidos: "Pagamentos recebidos" } as const;
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
    </>
  );
}
