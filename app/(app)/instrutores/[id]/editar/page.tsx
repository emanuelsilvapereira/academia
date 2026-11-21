import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { atualizarInstrutor } from "../../actions";
import { InstrutorForm } from "../../instrutor-form";

export default async function EditarInstrutorPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("instrutores.editar");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const i = getDb().prepare("SELECT * FROM instrutor WHERE id = ?").get(id) as
    | { id: number; nome: string; email: string; telefone: string; especialidade: string; ativo: number }
    | undefined;
  if (!i) notFound();
  return (
    <>
      <Cabecalho titulo="Editar instrutor" />
      <div className="panel form-page">
        <InstrutorForm
          acao={atualizarInstrutor.bind(null, i.id)}
          editar
          inicial={{ nome: i.nome, email: i.email, telefone: i.telefone, especialidade: i.especialidade, ativo: i.ativo ? "on" : "" }}
        />
      </div>
    </>
  );
}
