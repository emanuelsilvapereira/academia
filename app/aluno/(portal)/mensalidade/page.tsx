import Link from "next/link";
import { exigirAluno } from "@/lib/auth-aluno";
import { buscarAluno } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { addDias, brl, diasEntre, FORMA_ROTULO, formatarData, hojeISO, plural } from "@/lib/format";

export const metadata = { title: "Mensalidade · Pulso" };

type Parcela = { id: number; plano_nome: string; meses: number; parcela: number; valor_centavos: number; vencimento: string; pago_em: string | null; forma: string | null; informado_em: string | null };

export default async function MensalidadePage() {
  const { id } = await exigirAluno();
  const db = getDb();
  const hoje = hojeISO();
  const aluno = buscarAluno(db, id, hoje)!;
  const parcelas = db
    .prepare(
      `SELECT pg.id, p.nome AS plano_nome, p.meses, pg.parcela, pg.valor_centavos, pg.vencimento, pg.pago_em, pg.forma, pg.informado_em
       FROM pagamento pg JOIN matricula m ON m.id = pg.matricula_id JOIN plano p ON p.id = m.plano_id
       WHERE m.aluno_id = ? AND (pg.pago_em IS NULL OR pg.vencimento >= ?)
       ORDER BY (pg.pago_em IS NULL) DESC, pg.vencimento DESC`,
    )
    .all(id, addDias(hoje, -365)) as Parcela[];
  const abertas = parcelas.filter((p) => !p.pago_em).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const pagas = parcelas.filter((p) => p.pago_em);
  const proxima = abertas.find((p) => p.vencimento >= hoje);
  const pagoNoAno = pagas.reduce((s, p) => s + p.valor_centavos, 0);

  return (
    <>
      <header className="head">
        <div>
          <h1>Mensalidade</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Pague pelo Pix aqui mesmo ou na recepção (Pix, cartão, dinheiro ou boleto). O pagamento aparece como pago assim que a recepção registra.
          </p>
        </div>
      </header>

      {aluno.devido ? (
        <div className="faixa" role="status">
          <strong>Você tem {brl(aluno.devido)} em atraso</strong> ({plural(aluno.parcelas_atrasadas, "parcela", "parcelas")}, a mais antiga há{" "}
          {plural(aluno.dias_atraso, "dia", "dias")}). Regularize na recepção para não ter a entrada bloqueada quando a matrícula vencer.
        </div>
      ) : (
        <div className="faixa faixa-info" role="status">
          <strong>Tudo em dia.</strong> Obrigado!
        </div>
      )}

      <div className="kpis">
        <div className="kpi">
          <span className="rotulo">Em atraso</span>
          <span className="num">{brl(aluno.devido)}</span>
        </div>
        <div className="kpi">
          <span className="rotulo">Próxima parcela</span>
          <span className="num">{proxima ? brl(proxima.valor_centavos) : "—"}</span>
          <span className="muted small">
            {proxima ? `vence ${proxima.vencimento === hoje ? "hoje" : `em ${formatarData(proxima.vencimento)} (${plural(diasEntre(hoje, proxima.vencimento), "dia", "dias")})`}` : "nenhuma em aberto"}
          </span>
        </div>
        <div className="kpi">
          <span className="rotulo">Pago nos últimos 12 meses</span>
          <span className="num">{brl(pagoNoAno)}</span>
          <span className="muted small">{plural(pagas.length, "parcela", "parcelas")}</span>
        </div>
      </div>

      <section className="secao">
        <h2 className="secao-titulo">Em aberto ({abertas.length})</h2>
        <div className="tabela">
          <table>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Referente a</th>
                <th>Valor</th>
                <th>Situação</th>
                <th className="actions">
                  <span className="sr">Pagar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {abertas.length === 0 ? (
                <tr>
                  <td className="empty" colSpan={5}>
                    Nenhuma parcela em aberto.
                  </td>
                </tr>
              ) : (
                abertas.map((p) => (
                  <tr key={p.id} className={p.vencimento < hoje ? "linha-alerta" : undefined}>
                    <td data-label="Vencimento">{formatarData(p.vencimento)}</td>
                    <td data-label="Referente a">
                      Plano {p.plano_nome}
                      {p.meses > 1 ? ` · parcela ${p.parcela}/${p.meses}` : ""}
                    </td>
                    <td data-label="Valor">{brl(p.valor_centavos)}</td>
                    <td data-label="Situação">
                      {p.informado_em ? (
                        <span>Pix informado · aguardando conferência</span>
                      ) : p.vencimento < hoje ? (
                        <strong>Atrasada há {plural(diasEntre(p.vencimento, hoje), "dia", "dias")}</strong>
                      ) : p.vencimento === hoje ? (
                        <strong>Vence hoje</strong>
                      ) : (
                        <span className="muted">A vencer</span>
                      )}
                    </td>
                    <td className="actions">
                      <Link href={`/aluno/mensalidade/${p.id}`} className={`btn sm${p.vencimento <= hoje && !p.informado_em ? " primary" : ""}`}>
                        {p.informado_em ? "Ver Pix" : "Pagar com Pix"}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="secao">
        <h2 className="secao-titulo">Pagas nos últimos 12 meses ({pagas.length})</h2>
        <div className="tabela">
          <table>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Referente a</th>
                <th>Valor</th>
                <th>Pago em</th>
              </tr>
            </thead>
            <tbody>
              {pagas.length === 0 ? (
                <tr>
                  <td className="empty" colSpan={4}>
                    Nenhum pagamento nos últimos 12 meses.
                  </td>
                </tr>
              ) : (
                pagas.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Vencimento">{formatarData(p.vencimento)}</td>
                    <td data-label="Referente a">
                      Plano {p.plano_nome}
                      {p.meses > 1 ? ` · parcela ${p.parcela}/${p.meses}` : ""}
                    </td>
                    <td data-label="Valor">{brl(p.valor_centavos)}</td>
                    <td data-label="Pago em">
                      {formatarData(p.pago_em)} · {FORMA_ROTULO[p.forma ?? ""] ?? p.forma}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
