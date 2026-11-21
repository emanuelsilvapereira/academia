import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { atualizarExercicio } from "../../actions";
import { ExercicioForm } from "../../exercicio-form";

export default async function EditarExercicioPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("exercicios.editar");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const ex = getDb().prepare("SELECT id, nome, grupo, equipamento FROM exercicio WHERE id = ?").get(id) as
    | { id: number; nome: string; grupo: string; equipamento: string }
    | undefined;
  if (!ex) notFound();
  return (
    <>
      <Cabecalho titulo="Editar exercício" />
      <div className="panel form-page">
        <ExercicioForm acao={atualizarExercicio.bind(null, ex.id)} inicial={ex} />
      </div>
    </>
  );
}
