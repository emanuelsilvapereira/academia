import { QrCode } from "@/components/qr";
import { Status } from "@/components/status";
import { exigirAluno } from "@/lib/auth-aluno";
import { buscarAluno } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { formatarData, hojeISO } from "@/lib/format";

export const metadata = { title: "Carteirinha · Pulso" };

export default async function CarteirinhaPage() {
  const { id } = await exigirAluno();
  const hoje = hojeISO();
  const aluno = buscarAluno(getDb(), id, hoje)!;
  return (
    <div className="carteirinha-cheia">
      <div className="carteirinha-cartao">
        <p className="muted small">Pulso · Carteirinha digital</p>
        <h1>{aluno.nome}</h1>
        <QrCode texto={aluno.codigo} tamanho={240} />
        <p className="mono codigo">{aluno.codigo}</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Status status={aluno.situacao} />
          {aluno.plano_nome && aluno.fim ? (
            <span className="muted small">
              · {aluno.plano_nome} até {formatarData(aluno.fim)}
            </span>
          ) : null}
        </div>
        <p className="hint">Mostre o QR code no leitor da recepção ou diga o código acima para registrar sua entrada.</p>
      </div>
    </div>
  );
}
