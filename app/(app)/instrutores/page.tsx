import Link from "next/link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/cabecalho";
import { exigirUsuario } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatarTelefone, plural } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { excluirInstrutor } from "./actions";

type Linha = { id: number; nome: string; email: string; telefone: string; especialidade: string; ativo: number; alunos: number; fichas: number };

export default async function InstrutoresPage() {
  const usuario = await exigirUsuario();
  const editar = pode(usuario.perfil, "instrutores.editar");
  const instrutores = getDb()
    .prepare(
      `SELECT i.id, i.nome, i.email, i.telefone, i.especialidade, i.ativo,
              (SELECT COUNT(*) FROM aluno a WHERE a.instrutor_id = i.id AND a.ativo = 1) AS alunos,
              (SELECT COUNT(*) FROM ficha f WHERE f.instrutor_id = i.id) AS fichas
       FROM instrutor i ORDER BY i.ativo DESC, i.nome COLLATE NOCASE`,
    )
    .all() as Linha[];

  return (
    <>
      <Cabecalho titulo="Instrutores">
        {editar ? (
          <Link href="/instrutores/novo" className="btn primary">
            Novo instrutor
          </Link>
        ) : null}
      </Cabecalho>

      {instrutores.length === 0 ? (
        <p className="empty">Nenhum instrutor cadastrado.</p>
      ) : (
        <div className="cards">
          {instrutores.map((i) => (
            <article className={`card${i.ativo ? "" : " apagado"}`} key={i.id}>
              <h2>{i.nome}</h2>
              <span className="muted small">{i.especialidade || "—"}{i.ativo ? "" : " · inativo"}</span>
              <dl>
                <dt>Alunos</dt>
                <dd>
                  <Link href={`/alunos?instrutor=${i.id}`} className="sublinhado-hover">
                    {plural(i.alunos, "aluno", "alunos")}
                  </Link>
                </dd>
                <dt>Fichas montadas</dt>
                <dd>{i.fichas}</dd>
                <dt>Telefone</dt>
                <dd>{formatarTelefone(i.telefone)}</dd>
                <dt>E-mail</dt>
                <dd className="quebra">{i.email}</dd>
              </dl>
              {editar ? (
                <div className="row">
                  <Link href={`/instrutores/${i.id}/editar`} className="btn sm">
                    Editar
                  </Link>
                  <BotaoExcluir
                    acao={excluirInstrutor.bind(null, i.id)}
                    nome={i.nome}
                    detalhe={i.alunos ? `${plural(i.alunos, "aluno ficará", "alunos ficarão")} sem instrutor.` : undefined}
                  />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
