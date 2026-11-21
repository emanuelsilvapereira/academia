import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { Exportar } from "@/components/exportar";
import { exigirUsuario } from "@/lib/auth";
import {
  alunosEmRisco,
  capacidadeMaxima,
  contar,
  CTE_ALUNOS,
  DIAS_RISCO,
  DIAS_VENCIMENTO,
  entradasPorDia,
  inadimplentes,
  quemEstaDentro,
  receitaPorMes,
  totaisInadimplencia,
  vencimentosProximos,
} from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { brl, formatarData, formatarTelefone, hojeISO, plural, rotuloMes } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { GraficoDiario, GraficoHorario, GraficoReceita, GraficoSemana, inicioPeriodoLongo } from "./graficos";

function Indicador({ rotulo, valor, detalhe, href }: { rotulo: string; valor: string | number; detalhe?: string; href?: string }) {
  const conteudo = (
    <>
      <span className="rotulo">{rotulo}</span>
      <span className="num">{valor}</span>
      {detalhe ? <span className="detalhe">{detalhe}</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className="kpi kpi-link">
      {conteudo}
    </Link>
  ) : (
    <div className="kpi">{conteudo}</div>
  );
}

function Lista({
  titulo,
  descricao,
  vazio,
  verTodos,
  exportar,
  children,
}: {
  titulo: string;
  descricao: string;
  vazio: boolean;
  verTodos?: string;
  exportar?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel lista-painel">
      <div className="secao-head">
        <div>
          <h2>{titulo}</h2>
          <p className="muted small">{descricao}</p>
        </div>
        {exportar ? <Exportar relatorio={exportar} /> : null}
      </div>
      {vazio ? <p className="muted">Nada por aqui.</p> : <ul className="lista-simples">{children}</ul>}
      {verTodos && !vazio ? (
        <Link href={verTodos} className="link-btn">
          Ver todos
        </Link>
      ) : null}
    </section>
  );
}

export default async function PainelPage() {
  const usuario = await exigirUsuario();
  const db = getDb();
  const hoje = hojeISO();
  const financeiro = pode(usuario.perfil, "financeiro.ver");
  const exportar = pode(usuario.perfil, "relatorios.exportar");

  const ativos = contar(db, `${CTE_ALUNOS} SELECT COUNT(*) AS n FROM av WHERE situacao IN ('ativo', 'pendente')`, { hoje });
  const entradasHoje = contar(db, "SELECT COUNT(*) AS n FROM presenca WHERE data = ?", hoje);
  const dentro = quemEstaDentro(db, hoje).length;
  const capacidade = capacidadeMaxima(db);
  const inad = totaisInadimplencia(db, hoje);
  const receita = receitaPorMes(db, hoje, 12);
  const mesAtual = receita[receita.length - 1];

  const listaInad = financeiro ? inadimplentes(db, hoje, 5) : [];
  const vencendo = vencimentosProximos(db, hoje);
  const risco = alunosEmRisco(db, hoje);

  // Os gráficos de frequência usam o período de 12 semanas; o diário só mostra os últimos 30 dias dele.
  const inicio = inicioPeriodoLongo();
  const porDia = entradasPorDia(db, inicio);
  const horas = db
    .prepare(
      `SELECT CAST(substr(hora, 1, 2) AS INTEGER) AS h, COUNT(*) AS n
       FROM presenca WHERE data >= ? GROUP BY h`,
    )
    .all(inicio) as { h: number; n: number }[];
  const porHora = Object.fromEntries(horas.map((l) => [l.h, l.n]));

  const ultimas = db
    .prepare(
      `SELECT pr.id, pr.data, pr.hora, pr.saida, a.id AS aluno_id, a.nome
       FROM presenca pr JOIN aluno a ON a.id = pr.aluno_id
       ORDER BY pr.data DESC, pr.hora DESC, pr.id DESC LIMIT 8`,
    )
    .all() as { id: number; data: string; hora: string; saida: string | null; aluno_id: number; nome: string }[];

  return (
    <>
      <Cabecalho titulo="Painel" />

      <section className="kpis" aria-label="Indicadores">
        <Indicador rotulo="Alunos com matrícula" valor={ativos} href="/alunos?situacao=ativo" />
        <Indicador rotulo="Na academia agora" valor={`${dentro}/${capacidade}`} detalhe={`${entradasHoje} entradas hoje`} href="/frequencia" />
        {financeiro ? (
          <>
            <Indicador rotulo="Inadimplentes" valor={inad.alunos} detalhe={`${brl(inad.devido)} em atraso`} href="/financeiro" />
            <Indicador
              rotulo={`Recebido em ${rotuloMes(mesAtual.mes)}`}
              valor={brl(mesAtual.recebido)}
              detalhe={`de ${brl(mesAtual.previsto)} previstos`}
              href="/financeiro?aba=recebidos"
            />
          </>
        ) : (
          <>
            <Indicador rotulo="Vencem em 7 dias" valor={vencendo.length} />
            <Indicador rotulo={`Sem treinar há +${DIAS_RISCO} dias`} valor={risco.length} href="/painel/risco" />
          </>
        )}
      </section>

      <div className={financeiro ? "listas-tres" : "listas-dois"}>
        {financeiro ? (
          <Lista
            titulo="Inadimplência"
            descricao="Maiores atrasos primeiro."
            vazio={listaInad.length === 0}
            verTodos="/financeiro"
            exportar={exportar ? "inadimplencia" : undefined}
          >
            {listaInad.map((a) => (
              <li key={a.id}>
                <span>
                  <Link href={`/alunos/${a.id}#pagamentos`} className="name sublinhado-hover">
                    {a.nome}
                  </Link>
                  <span className="sub">{plural(a.dias_atraso, "dia", "dias")} de atraso</span>
                </span>
                <strong className="mono">{brl(a.devido)}</strong>
              </li>
            ))}
          </Lista>
        ) : null}

        <Lista
          titulo="Vencimentos próximos"
          descricao={`Matrículas que acabam em até ${DIAS_VENCIMENTO} dias, sem renovação automática. Ligue antes de perder o aluno.`}
          vazio={vencendo.length === 0}
          verTodos={financeiro ? "/financeiro?aba=vencimentos" : undefined}
          exportar={exportar ? "vencimentos" : undefined}
        >
          {vencendo.slice(0, 5).map((v) => (
            <li key={v.id}>
              <span>
                <Link href={`/alunos/${v.id}#matricula`} className="name sublinhado-hover">
                  {v.nome}
                </Link>
                <span className="sub">
                  {v.plano_nome} · {formatarTelefone(v.telefone)}
                </span>
              </span>
              <span className="muted small">{v.dias === 0 ? "vence hoje" : `em ${plural(v.dias, "dia", "dias")}`}</span>
            </li>
          ))}
        </Lista>

        <Lista
          titulo="Alunos em risco"
          descricao={`Com matrícula válida, mas sem treinar há mais de ${DIAS_RISCO} dias.`}
          vazio={risco.length === 0}
          verTodos="/painel/risco"
          exportar={exportar ? "risco" : undefined}
        >
          {risco.slice(0, 5).map((r) => (
            <li key={r.id}>
              <span>
                <Link href={`/alunos/${r.id}#frequencia`} className="name sublinhado-hover">
                  {r.nome}
                </Link>
                <span className="sub">{r.ultima_presenca ? `último treino ${formatarData(r.ultima_presenca)}` : "nunca veio"}</span>
              </span>
              <span className="muted small">{r.dias_sem_treinar} dias</span>
            </li>
          ))}
        </Lista>
      </div>

      <section className="graficos" aria-label="Gráficos">
        {financeiro ? (
          <div style={{ marginBottom: 16 }}>
            <GraficoReceita meses={receita.map((m) => ({ ...m, rotulo: rotuloMes(m.mes), atual: m.mes === mesAtual.mes }))} />
          </div>
        ) : null}
        <GraficoDiario porDia={porDia} />
        <div className="graficos-dois">
          <GraficoSemana porDia={porDia} />
          <GraficoHorario porHora={porHora} />
        </div>
      </section>

      <h2 style={{ marginBottom: 16 }}>Últimas entradas</h2>
      {ultimas.length ? (
        <table>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Data</th>
              <th>Entrada</th>
              <th>Saída</th>
            </tr>
          </thead>
          <tbody>
            {ultimas.map((u) => (
              <tr key={u.id}>
                <td data-label="Aluno">
                  <Link href={`/alunos/${u.aluno_id}`} className="name sublinhado-hover">
                    {u.nome}
                  </Link>
                </td>
                <td data-label="Data">{formatarData(u.data)}</td>
                <td data-label="Entrada" className="mono">
                  {u.hora}
                </td>
                <td data-label="Saída" className="mono">
                  {u.saida ?? <span className="muted">na academia</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty">Nenhuma entrada registrada.</p>
      )}
    </>
  );
}
