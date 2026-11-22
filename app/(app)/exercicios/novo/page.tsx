import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { criarExercicio } from "../actions";
import { ExercicioForm } from "../exercicio-form";

export default async function NovoExercicioPage() {
  await exigirPermissao("exercicios.editar");
  return (
    <>
      <Cabecalho titulo="Novo exercício" />
      <div className="panel form-page">
        <ExercicioForm acao={criarExercicio} inicial={{ nome: "", grupo: "peito", equipamento: "", descricao: "", execucao: "", dicas: "", musculos_primarios: "", musculos_secundarios: "", video_url: "" }} />
      </div>
    </>
  );
}
