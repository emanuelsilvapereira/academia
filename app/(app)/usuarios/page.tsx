import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DESCRICAO_PERMISSAO, PERFIL_ROTULO, PERFIS, pode, type Perfil, type Permissao } from "@/lib/permissoes";

type Linha = { id: number; nome: string; email: string; perfil: Perfil; ativo: number; instrutor_nome: string | null; ultimo_login: string | null };

export default async function UsuariosPage() {
  const eu = await exigirPermissao("usuarios.gerenciar");
  const usuarios = getDb()
    .prepare(
      `SELECT u.id, u.nome, u.email, u.perfil, u.ativo, i.nome AS instrutor_nome,
              (SELECT MAX(quando) FROM auditoria a WHERE a.usuario_id = u.id AND a.acao = 'login') AS ultimo_login
       FROM usuario u LEFT JOIN instrutor i ON i.id = u.instrutor_id
       ORDER BY u.ativo DESC, u.perfil, u.nome`,
    )
    .all() as Linha[];

  return (
    <>
      <Cabecalho titulo="Usuários">
        <Link href="/usuarios/novo" className="btn primary">
          Novo usuário
        </Link>
      </Cabecalho>

      <div className="tabela">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Último acesso</th>
              <th>Situação</th>
              <th className="actions">
                <span className="sr">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td data-label="Usuário">
                  <span>
                    <span className="name">
                      {u.nome} {u.id === eu.id ? <span className="muted small">(você)</span> : null}
                    </span>
                    <span className="sub">{u.email}</span>
                  </span>
                </td>
                <td data-label="Perfil">
                  {PERFIL_ROTULO[u.perfil]}
                  {u.instrutor_nome ? <span className="sub">{u.instrutor_nome}</span> : null}
                </td>
                <td data-label="Último acesso" className="mono">
                  {u.ultimo_login ? u.ultimo_login.slice(0, 16).split(" ").map((p, i) => (i ? p : p.split("-").reverse().join("/"))).join(" ") : "—"}
                </td>
                <td data-label="Situação">{u.ativo ? "Ativo" : "Bloqueado"}</td>
                <td className="actions">
                  <Link href={`/usuarios/${u.id}/editar`} className="btn sm">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ margin: "48px 0 16px" }}>O que cada perfil pode fazer</h2>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Todos os perfis podem ver o painel, alunos, planos, instrutores, exercícios e treinos. A tabela mostra o que muda.
      </p>
      <div className="tabela">
        <table className="matriz">
          <thead>
            <tr>
              <th>Permissão</th>
              {PERFIS.map((p) => (
                <th key={p}>{PERFIL_ROTULO[p]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(DESCRICAO_PERMISSAO) as Permissao[]).map((perm) => (
              <tr key={perm}>
                <td data-label="Permissão">{DESCRICAO_PERMISSAO[perm]}</td>
                {PERFIS.map((p) => (
                  <td key={p} data-label={PERFIL_ROTULO[p]}>
                    {pode(p, perm) ? "Sim" : <span className="muted">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
