import Link from "next/link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/cabecalho";
import { exigirUsuario } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { brl, hojeISO } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { excluirPlano } from "./actions";

type LinhaPlano = { id: number; nome: string; preco_centavos: number; meses: number; vigentes: number; total: number };

export default async function PlanosPage() {
  const usuario = await exigirUsuario();
  const editar = pode(usuario.perfil, "planos.editar");
  const planos = getDb()
    .prepare(
      `SELECT p.id, p.nome, p.preco_centavos, p.meses,
              COUNT(DISTINCT CASE WHEN m.cancelada_em IS NULL AND m.inicio <= @hoje AND m.fim >= @hoje THEN m.aluno_id END) AS vigentes,
              COUNT(m.id) AS total
       FROM plano p LEFT JOIN matricula m ON m.plano_id = p.id
       GROUP BY p.id ORDER BY p.meses, p.nome`,
    )
    .all({ hoje: hojeISO() }) as LinhaPlano[];

  return (
    <>
      <Cabecalho titulo="Planos">
        {editar ? (
          <Link href="/planos/novo" className="btn primary">
            Novo plano
          </Link>
        ) : null}
      </Cabecalho>

      {planos.length === 0 ? (
        <p className="empty">Nenhum plano cadastrado.</p>
      ) : (
        <div className="cards">
          {planos.map((p) => (
            <article className="card" key={p.id}>
              <h2>{p.nome}</h2>
              <span className="price">{brl(p.preco_centavos)}</span>
              <span className="muted small">
                a cada {p.meses} {p.meses === 1 ? "mês" : "meses"}
              </span>
              <dl>
                <dt>Parcelas</dt>
                <dd>
                  {p.meses}× {brl(Math.floor(p.preco_centavos / p.meses))}
                </dd>
                <dt>Alunos com o plano hoje</dt>
                <dd>
                  <Link href={`/alunos?plano=${p.id}`} className="sublinhado-hover">
                    {p.vigentes}
                  </Link>
                </dd>
                <dt>Matrículas (histórico)</dt>
                <dd>{p.total}</dd>
              </dl>
              {editar ? (
                <div className="row">
                  <Link href={`/planos/${p.id}/editar`} className="btn sm">
                    Editar
                  </Link>
                  <BotaoExcluir acao={excluirPlano.bind(null, p.id)} nome={`o plano ${p.nome}`} />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
      {editar ? <p className="hint">Mudar o preço de um plano vale só para as próximas matrículas; as já feitas mantêm o valor contratado.</p> : null}
    </>
  );
}
