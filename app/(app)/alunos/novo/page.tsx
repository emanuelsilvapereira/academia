import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hojeISO } from "@/lib/format";
import { criarAluno } from "../actions";
import { AlunoForm } from "../aluno-form";

export default async function NovoAlunoPage() {
  await exigirPermissao("alunos.editar");
  const db = getDb();
  const planos = db.prepare("SELECT id, nome, preco_centavos, meses FROM plano ORDER BY meses, nome").all() as {
    id: number;
    nome: string;
    preco_centavos: number;
    meses: number;
  }[];
  const instrutores = db.prepare("SELECT id, nome FROM instrutor WHERE ativo = 1 ORDER BY nome").all() as { id: number; nome: string }[];

  return (
    <>
      <Cabecalho titulo="Novo aluno" />
      <div className="panel form-page">
        {planos.length === 0 ? (
          <p>
            Cadastre um plano antes de adicionar alunos.{" "}
            <Link href="/planos/novo" className="sublinhado">
              Criar plano
            </Link>
          </p>
        ) : (
          <AlunoForm
            acao={criarAluno}
            planos={planos}
            instrutores={instrutores}
            novo
            voltar="/alunos"
            inicial={{
              nome: "",
              email: "",
              telefone: "",
              cpf: "",
              nascimento: "",
              instrutor_id: "",
              ativo: "on",
              plano_id: String(planos[0].id),
              inicio: hojeISO(),
              renovacao_automatica: "",
              pagar_agora: "on",
              forma: "pix",
            }}
          />
        )}
      </div>
    </>
  );
}
