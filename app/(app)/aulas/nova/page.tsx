import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { criarAula } from "../actions";
import { AulaForm } from "../aula-form";

export default async function NovaAulaPage() {
  await exigirPermissao("aulas.editar");
  const instrutores = getDb().prepare("SELECT id, nome FROM instrutor WHERE ativo = 1 ORDER BY nome").all() as { id: number; nome: string }[];
  return (
    <>
      <Cabecalho titulo="Nova aula" />
      <div className="panel form-page">
        <AulaForm
          acao={criarAula}
          instrutores={instrutores}
          inicial={{ nome: "", dia_semana: "0", hora: "18:00", duracao_min: "50", vagas: "15", sala: "", instrutor_id: "", ativo: "1" }}
        />
      </div>
    </>
  );
}
