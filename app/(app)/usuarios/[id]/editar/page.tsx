import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { atualizarUsuario } from "../../actions";
import { UsuarioForm } from "../../usuario-form";

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("usuarios.gerenciar");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const db = getDb();
  const u = db.prepare("SELECT id, nome, email, perfil, instrutor_id, ativo FROM usuario WHERE id = ?").get(id) as
    | { id: number; nome: string; email: string; perfil: string; instrutor_id: number | null; ativo: number }
    | undefined;
  if (!u) notFound();
  const instrutores = db.prepare("SELECT id, nome FROM instrutor ORDER BY nome").all() as { id: number; nome: string }[];
  return (
    <>
      <Cabecalho titulo="Editar usuário" />
      <div className="panel form-page">
        <UsuarioForm
          acao={atualizarUsuario.bind(null, u.id)}
          novo={false}
          instrutores={instrutores}
          inicial={{ nome: u.nome, email: u.email, perfil: u.perfil, instrutor_id: u.instrutor_id ? String(u.instrutor_id) : "", ativo: u.ativo ? "on" : "" }}
        />
      </div>
    </>
  );
}
