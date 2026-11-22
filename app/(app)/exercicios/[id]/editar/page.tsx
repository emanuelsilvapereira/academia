import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buscarExercicio } from "@/lib/portal";
import { atualizarExercicio } from "../../actions";
import { ExercicioForm } from "../../exercicio-form";

export default async function EditarExercicioPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("exercicios.editar");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const ex = buscarExercicio(getDb(), id);
  if (!ex) notFound();
  return (
    <>
      <Cabecalho titulo="Editar exercício" />
      <div className="panel form-page">
        <ExercicioForm acao={atualizarExercicio.bind(null, ex.id)} inicial={ex} voltar={`/exercicios/${ex.id}`} />
      </div>
    </>
  );
}
