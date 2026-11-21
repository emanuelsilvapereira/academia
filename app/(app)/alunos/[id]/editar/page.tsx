import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatarData } from "@/lib/format";
import { atualizarAluno } from "../../actions";
import { AlunoForm } from "../../aluno-form";

type Aluno = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  nascimento: string;
  instrutor_id: number | null;
  ativo: number;
};

export default async function EditarAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("alunos.editar");
  const { id } = await params;
  const alunoId = Number(id);
  if (!Number.isInteger(alunoId)) notFound();

  const db = getDb();
  const aluno = db.prepare("SELECT * FROM aluno WHERE id = ?").get(alunoId) as Aluno | undefined;
  if (!aluno) notFound();
  // Mostra os instrutores ativos e também o atual (mesmo que tenha sido desativado).
  const instrutores = db
    .prepare("SELECT id, nome FROM instrutor WHERE ativo = 1 OR id = ? ORDER BY nome")
    .all(aluno.instrutor_id ?? 0) as { id: number; nome: string }[];

  return (
    <>
      <Cabecalho titulo="Editar aluno" />
      <div className="panel form-page">
        <AlunoForm
          acao={atualizarAluno.bind(null, aluno.id)}
          planos={[]}
          instrutores={instrutores}
          novo={false}
          voltar={`/alunos/${aluno.id}`}
          inicial={{
            nome: aluno.nome,
            email: aluno.email,
            telefone: aluno.telefone,
            cpf: aluno.cpf,
            nascimento: formatarData(aluno.nascimento),
            instrutor_id: aluno.instrutor_id ? String(aluno.instrutor_id) : "",
            ativo: aluno.ativo ? "on" : "",
            plano_id: "",
            inicio: "",
            renovacao_automatica: "",
            pagar_agora: "",
            forma: "",
          }}
        />
      </div>
    </>
  );
}
