import Link from "next/link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/cabecalho";
import { horaFim, listarAulas, proximasOcorrencias } from "@/lib/aulas";
import { exigirUsuario } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatarData, hojeISO, plural } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { DIAS_LONGOS } from "@/lib/rotina";
import { excluirAula } from "./actions";

export default async function AulasPage() {
  const usuario = await exigirUsuario();
  const db = getDb();
  const hoje = hojeISO();
  const editar = pode(usuario.perfil, "aulas.editar");
  const aulas = listarAulas(db);
  const proximas = proximasOcorrencias(db, hoje, 7, null);
  const proximaDe = (id: number) => proximas.find((o) => o.id === id);
  const reservasSemana = proximas.reduce((s, o) => s + o.reservadas, 0);
  const vagasSemana = proximas.reduce((s, o) => s + o.vagas, 0);

  return (
    <>
      <Cabecalho titulo="Aulas coletivas">
        {editar ? (
          <Link href="/aulas/nova" className="btn primary">
            Nova aula
          </Link>
        ) : null}
      </Cabecalho>

      <section className="kpis" aria-label="Resumo das aulas">
        <div className="kpi">
          <span className="rotulo">Aulas na grade</span>
          <span className="num">{aulas.filter((a) => a.ativo).length}</span>
          <span className="detalhe">por semana</span>
        </div>
        <div className="kpi">
          <span className="rotulo">Reservas nos próximos 7 dias</span>
          <span className="num">{reservasSemana}</span>
          <span className="detalhe">de {vagasSemana} vagas ({vagasSemana ? Math.round((reservasSemana / vagasSemana) * 100) : 0}%)</span>
        </div>
      </section>

      <div className="tabela">
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th>Horário</th>
              <th>Aula</th>
              <th>Instrutor</th>
              <th>Próxima</th>
              {editar ? (
                <th className="actions">
                  <span className="sr">Ações</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {aulas.length === 0 ? (
              <tr>
                <td className="empty" colSpan={6}>
                  Nenhuma aula cadastrada.
                </td>
              </tr>
            ) : (
              aulas.map((a) => {
                const prox = proximaDe(a.id);
                return (
                  <tr key={a.id} className={a.ativo ? undefined : "linha-inativa"}>
                    <td data-label="Dia">{DIAS_LONGOS[a.dia_semana]}</td>
                    <td data-label="Horário" className="mono">
                      {a.hora}–{horaFim(a.hora, a.duracao_min)}
                    </td>
                    <td data-label="Aula">
                      <span>
                        <Link href={`/aulas/${a.id}`} className="name sublinhado-hover">
                          {a.nome}
                        </Link>
                        <span className="sub">
                          {[a.sala, plural(a.vagas, "vaga", "vagas"), a.ativo ? null : "desativada"].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </td>
                    <td data-label="Instrutor">{a.instrutor_nome ?? "—"}</td>
                    <td data-label="Próxima">
                      {prox ? (
                        <span>
                          {formatarData(prox.data)}{" "}
                          <span className={prox.reservadas >= prox.vagas ? "" : "muted"}>
                            · {prox.reservadas}/{prox.vagas}
                            {prox.reservadas >= prox.vagas ? " (lotada)" : ""}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    {editar ? (
                      <td className="actions">
                        <Link href={`/aulas/${a.id}/editar`} className="btn sm">
                          Editar
                        </Link>
                        <BotaoExcluir acao={excluirAula.bind(null, a.id)} nome={`a aula ${a.nome} de ${DIAS_LONGOS[a.dia_semana]}`} detalhe="As reservas dela também saem." />
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
