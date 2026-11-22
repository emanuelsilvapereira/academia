import { BotaoAcao, BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/cabecalho";
import { exigirUsuario } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatarData, hojeISO } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { alternarFixado, excluirAviso } from "./actions";
import { AvisoForm } from "./aviso-form";

type Aviso = { id: number; titulo: string; texto: string; criado_em: string; expira_em: string | null; fixado: number; autor: string | null };

export default async function AvisosPage() {
  const usuario = await exigirUsuario();
  const editar = pode(usuario.perfil, "avisos.editar");
  const hoje = hojeISO();
  const avisos = getDb()
    .prepare(
      `SELECT av.id, av.titulo, av.texto, av.criado_em, av.expira_em, av.fixado, u.nome AS autor
       FROM aviso av LEFT JOIN usuario u ON u.id = av.autor_id ORDER BY av.fixado DESC, av.criado_em DESC`,
    )
    .all() as Aviso[];

  return (
    <>
      <Cabecalho titulo="Avisos" />
      <p className="muted" style={{ marginBottom: 24 }}>
        Os avisos aparecem na tela inicial do portal do aluno, os fixados primeiro. Avisos com data de término somem sozinhos depois do dia.
      </p>
      <div className="two">
        {editar ? (
          <section className="panel">
            <h2>Novo aviso</h2>
            <AvisoForm />
          </section>
        ) : null}
        <section>
          {avisos.length === 0 ? (
            <p className="empty">Nenhum aviso publicado.</p>
          ) : (
            <ul className="avisos-lista">
              {avisos.map((a) => {
                const expirado = a.expira_em !== null && a.expira_em < hoje;
                return (
                  <li key={a.id} className={`card${expirado ? " linha-inativa" : ""}`}>
                    <h3>
                      {a.titulo} {a.fixado ? <span className="tag tag-forte">fixado</span> : null}
                      {expirado ? <span className="tag">encerrado</span> : null}
                    </h3>
                    <p>{a.texto}</p>
                    <p className="muted small">
                      {formatarData(a.criado_em.slice(0, 10))}
                      {a.autor ? ` · ${a.autor}` : ""}
                      {a.expira_em ? ` · até ${formatarData(a.expira_em)}` : " · sem data para sair"}
                    </p>
                    {editar ? (
                      <div className="row" style={{ marginTop: 12 }}>
                        <BotaoAcao acao={alternarFixado.bind(null, a.id)} rotulo={a.fixado ? "Desafixar" : "Fixar"} />
                        <BotaoExcluir acao={excluirAviso.bind(null, a.id)} nome={`o aviso "${a.titulo}"`} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
