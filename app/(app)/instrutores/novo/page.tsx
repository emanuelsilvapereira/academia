import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { criarInstrutor } from "../actions";
import { InstrutorForm } from "../instrutor-form";

export default async function NovoInstrutorPage() {
  await exigirPermissao("instrutores.editar");
  return (
    <>
      <Cabecalho titulo="Novo instrutor" />
      <div className="panel form-page">
        <InstrutorForm acao={criarInstrutor} editar={false} inicial={{ nome: "", email: "", telefone: "", especialidade: "", ativo: "on" }} />
      </div>
    </>
  );
}
