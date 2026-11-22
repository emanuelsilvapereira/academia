import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { atualizarAula } from "../../actions";
import { AulaForm } from "../../aula-form";

export default async function EditarAulaPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("aulas.editar");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = getDb();
  const a = db.prepare("SELECT * FROM aula WHERE id = ?").get(id) as
    | { id: number; nome: string; dia_semana: number; hora: string; duracao_min: number; vagas: number; sala: string; instrutor_id: number | null; ativo: number }
    | undefined;
  if (!a) notFound();
  const instrutores = db.prepare("SELECT id, nome FROM instrutor WHERE ativo = 1 OR id = ? ORDER BY nome").all(a.instrutor_id) as { id: number; nome: string }[];
  return (
    <>
      <Cabecalho titulo="Editar aula" />
      <div className="panel form-page">
        <AulaForm
          acao={atualizarAula.bind(null, a.id)}
          instrutores={instrutores}
          inicial={{
            nome: a.nome,
            dia_semana: String(a.dia_semana),
            hora: a.hora,
            duracao_min: String(a.duracao_min),
            vagas: String(a.vagas),
            sala: a.sala,
            instrutor_id: a.instrutor_id ? String(a.instrutor_id) : "",
            ativo: String(a.ativo),
          }}
        />
      </div>
    </>
  );
}
