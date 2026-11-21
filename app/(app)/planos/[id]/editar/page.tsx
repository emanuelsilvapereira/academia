import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { atualizarPlano } from "../../actions";
import { PlanoForm } from "../../plano-form";

export default async function EditarPlanoPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("planos.editar");
  const { id } = await params;
  const planoId = Number(id);
  if (!Number.isInteger(planoId)) notFound();

  const plano = getDb()
    .prepare("SELECT id, nome, preco_centavos, meses FROM plano WHERE id = ?")
    .get(planoId) as { id: number; nome: string; preco_centavos: number; meses: number } | undefined;
  if (!plano) notFound();

  return (
    <>
      <Cabecalho titulo="Editar plano" />
      <div className="panel form-page">
        <PlanoForm
          acao={atualizarPlano.bind(null, plano.id)}
          inicial={{
            nome: plano.nome,
            preco: (plano.preco_centavos / 100).toFixed(2).replace(".", ","),
            meses: String(plano.meses),
          }}
        />
      </div>
    </>
  );
}
