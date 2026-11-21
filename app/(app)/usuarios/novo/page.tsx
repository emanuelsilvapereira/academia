import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { criarUsuario } from "../actions";
import { UsuarioForm } from "../usuario-form";

export default async function NovoUsuarioPage() {
  await exigirPermissao("usuarios.gerenciar");
  const instrutores = getDb().prepare("SELECT id, nome FROM instrutor WHERE ativo = 1 ORDER BY nome").all() as { id: number; nome: string }[];
  return (
    <>
      <Cabecalho titulo="Novo usuário" />
      <div className="panel form-page">
        <UsuarioForm acao={criarUsuario} novo instrutores={instrutores} inicial={{ nome: "", email: "", perfil: "recepcao", instrutor_id: "", ativo: "on" }} />
      </div>
    </>
  );
}
