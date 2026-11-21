import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { criarPlano } from "../actions";
import { PlanoForm } from "../plano-form";

export default async function NovoPlanoPage() {
  await exigirPermissao("planos.editar");
  return (
    <>
      <Cabecalho titulo="Novo plano" />
      <div className="panel form-page">
        <PlanoForm acao={criarPlano} inicial={{ nome: "", preco: "", meses: "1" }} />
      </div>
    </>
  );
}
