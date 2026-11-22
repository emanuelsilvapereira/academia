import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoAcao } from "@/components/botao-excluir";
import { BotaoCopiar } from "@/components/copiar";
import { QrCode } from "@/components/qr";
import { exigirAluno } from "@/lib/auth-aluno";
import { getDb } from "@/lib/db";
import { brl, formatarData, hojeISO } from "@/lib/format";
import { configPix, pixCopiaECola } from "@/lib/pix";
import { informarPix } from "../../../actions";

export const metadata = { title: "Pagar com Pix · Pulso" };

export default async function PagarPixPage({ params }: { params: Promise<{ id: string }> }) {
  const aluno = await exigirAluno();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = getDb();
  const hoje = hojeISO();

  // Só parcelas do próprio aluno.
  const p = db
    .prepare(
      `SELECT pg.id, pg.parcela, pg.valor_centavos, pg.vencimento, pg.pago_em, pg.informado_em, p.nome AS plano_nome, p.meses
       FROM pagamento pg JOIN matricula m ON m.id = pg.matricula_id JOIN plano p ON p.id = m.plano_id
       WHERE pg.id = ? AND m.aluno_id = ?`,
    )
    .get(id, aluno.id) as
    | { id: number; parcela: number; valor_centavos: number; vencimento: string; pago_em: string | null; informado_em: string | null; plano_nome: string; meses: number }
    | undefined;
  if (!p) notFound();

  const ler = (chave: string) => (db.prepare("SELECT valor FROM config WHERE chave = ?").get(chave) as { valor: string } | undefined)?.valor;
  const pix = configPix(ler);
  const codigo = pix
    ? pixCopiaECola({ ...pix, valorCentavos: p.valor_centavos, identificador: `PULSO${p.id}`, descricao: `Mensalidade ${p.plano_nome}` })
    : null;

  return (
    <>
      <header className="head">
        <div>
          <p className="muted small">
            <Link href="/aluno/mensalidade" className="sublinhado-hover">
              Mensalidade
            </Link>{" "}
            / Pagar com Pix
          </p>
          <h1>{brl(p.valor_centavos)}</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Plano {p.plano_nome}
            {p.meses > 1 ? ` · parcela ${p.parcela}/${p.meses}` : ""} · vencimento {formatarData(p.vencimento)}
            {p.vencimento < hoje ? " (atrasada)" : ""}
          </p>
        </div>
      </header>

      {p.pago_em ? (
        <div className="faixa faixa-info" role="status">
          <strong>Parcela paga em {formatarData(p.pago_em)}.</strong> Obrigado!
        </div>
      ) : !pix || !codigo ? (
        <div className="panel">
          <p>A academia ainda não configurou o Pix. Pague na recepção (Pix, cartão, dinheiro ou boleto).</p>
        </div>
      ) : (
        <div className="pix">
          <section className="panel pix-qr">
            <h2>1. Escaneie o QR code no app do seu banco</h2>
            <QrCode texto={codigo} tamanho={220} />
            <p className="muted small">Ou copie o código abaixo e use &quot;Pix copia e cola&quot;.</p>
            <textarea id="pix-codigo" readOnly rows={4} value={codigo} aria-label="Código Pix copia e cola" className="mono" />
            <BotaoCopiar texto={codigo} rotulo="Copiar código Pix" />
          </section>
          <section className="panel">
            <h2>2. Confira antes de pagar</h2>
            <dl className="dados">
              <dt>Recebedor</dt>
              <dd>{pix.nome}</dd>
              <dt>Chave Pix</dt>
              <dd className="mono">{pix.chave}</dd>
              <dt>Valor</dt>
              <dd>{brl(p.valor_centavos)}</dd>
            </dl>
            <p className="hint">No app do banco, confira se o nome do recebedor é o da academia. Nunca pague para outro nome.</p>
            <h2 style={{ marginTop: 28 }}>3. Avise que pagou</h2>
            {p.informado_em ? (
              <p>
                Você avisou o pagamento em {formatarData(p.informado_em.slice(0, 10))} às {p.informado_em.slice(11, 16)}. A recepção confere o extrato e
                registra; aí a parcela aparece como paga.
              </p>
            ) : (
              <>
                <p className="muted" style={{ marginBottom: 12 }}>
                  Depois de pagar, toque no botão para a recepção conferir. A parcela só fica &quot;paga&quot; depois da conferência.
                </p>
                <BotaoAcao
                  acao={informarPix.bind(null, p.id)}
                  rotulo="Já fiz o Pix"
                  classe="btn primary"
                  confirmacao={{
                    titulo: "Você já fez o Pix?",
                    texto: `Confirme só depois de pagar ${brl(p.valor_centavos)} no app do banco. A recepção vai conferir no extrato.`,
                    botao: "Sim, já paguei",
                  }}
                />
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
