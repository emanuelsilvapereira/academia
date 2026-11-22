import Link from "next/link";
import { notFound } from "next/navigation";
import { DetalheExercicio } from "@/components/detalhe-exercicio";
import { exigirUsuario } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { plural } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { buscarExercicio } from "@/lib/portal";

export default async function ExercicioPage({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = getDb();
  const ex = buscarExercicio(db, id);
  if (!ex) notFound();
  const { n } = db.prepare("SELECT COUNT(DISTINCT ficha_id) AS n FROM ficha_item WHERE exercicio_id = ?").get(id) as { n: number };

  return (
    <>
      <header className="head">
        <div>
          <p className="muted small">
            <Link href="/exercicios" className="sublinhado-hover">
              Exercícios
            </Link>{" "}
            / {ex.nome}
          </p>
          <h1>{ex.nome}</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {n ? `Está em ${plural(n, "ficha", "fichas")} de treino.` : "Ainda não está em nenhuma ficha."} É assim que o aluno vê este exercício no portal.
          </p>
        </div>
        {pode(usuario.perfil, "exercicios.editar") ? (
          <Link href={`/exercicios/${ex.id}/editar`} className="btn primary">
            Editar
          </Link>
        ) : null}
      </header>
      <DetalheExercicio ex={ex} />
    </>
  );
}
