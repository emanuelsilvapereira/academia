import Link from "next/link";
import { InstalarApp } from "@/components/instalar-app";
import { QrCode } from "@/components/qr";
import { Status } from "@/components/status";
import { exigirAluno } from "@/lib/auth-aluno";
import { buscarAluno } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { horaFim, jaComecou, proximasOcorrencias } from "@/lib/aulas";
import { addDias, agoraHora, brl, diasEntre, formatarData, hojeISO, plural } from "@/lib/format";
import { fichasDoAluno, treinoSugerido, treinosFeitos } from "@/lib/portal";
import { conquistas, DIAS_LONGOS, semanasSeguidas } from "@/lib/rotina";
import { BotaoTreinoFeito } from "./botao-treino";
import { SemanaRotina } from "./semana";

export default async function InicioAlunoPage() {
  const { id } = await exigirAluno();
  const db = getDb();
  const hoje = hojeISO();
  const aluno = buscarAluno(db, id, hoje)!;

  const fichas = fichasDoAluno(db, id);
  const sugestao = treinoSugerido(db, id, fichas, hoje);
  const feitos = treinosFeitos(db, id, addDias(hoje, -7));
  const feitasHoje = new Set(feitos.filter((f) => f.data === hoje).map((f) => f.letra));

  const proxima = db
    .prepare(
      `SELECT pg.valor_centavos, pg.vencimento FROM pagamento pg JOIN matricula m ON m.id = pg.matricula_id
       WHERE m.aluno_id = ? AND pg.pago_em IS NULL AND m.cancelada_em IS NULL AND pg.vencimento >= ?
       ORDER BY pg.vencimento LIMIT 1`,
    )
    .get(id, hoje) as { valor_centavos: number; vencimento: string } | undefined;

  const presencas = (db.prepare("SELECT data FROM presenca WHERE aluno_id = ? ORDER BY data").all(id) as { data: string }[]).map((p) => p.data);
  const noMes = presencas.filter((d) => d.slice(0, 7) === hoje.slice(0, 7)).length;
  const sequencia = semanasSeguidas(presencas, hoje);
  const avaliacoes = db.prepare("SELECT gordura_pct FROM avaliacao WHERE aluno_id = ? ORDER BY data").all(id) as { gordura_pct: number | null }[];
  const medalhas = conquistas({
    totalTreinos: presencas.length,
    semanasSeguidas: sequencia,
    avaliacoes,
    mesesDeCasa: Math.floor(diasEntre(aluno.cadastro, hoje) / 30),
  });
  const fichaHoje = sugestao.tipo === "treino" ? fichas.find((f) => f.letra === sugestao.letra) : undefined;
  const agora = agoraHora();
  const proximaAula = proximasOcorrencias(db, hoje, 7, id).find((o) => o.minha && !jaComecou(o.data, o.hora, hoje, agora));
  const avisos = db
    .prepare(
      `SELECT id, titulo, texto, criado_em, fixado FROM aviso WHERE expira_em IS NULL OR expira_em >= ?
       ORDER BY fixado DESC, criado_em DESC LIMIT 4`,
    )
    .all(hoje) as { id: number; titulo: string; texto: string; criado_em: string; fixado: number }[];

  return (
    <>
      <header className="head">
        <div>
          <p className="muted small">{formatarData(hoje)}</p>
          <h1>Olá, {aluno.nome.split(" ")[0]}!</h1>
          <div className="row" style={{ marginTop: 12 }}>
            <Status status={aluno.situacao} />
            {aluno.plano_nome ? <span className="muted small">· Plano {aluno.plano_nome}</span> : null}
          </div>
        </div>
      </header>

      {aluno.situacao === "pendente" ? (
        <div className="faixa" role="status">
          <strong>Mensalidade em atraso:</strong> {brl(aluno.devido)} em {plural(aluno.parcelas_atrasadas, "parcela", "parcelas")}.{" "}
          <Link href="/aluno/mensalidade" className="sublinhado">
            Ver detalhes
          </Link>
        </div>
      ) : aluno.situacao === "vencido" ? (
        <div className="faixa" role="status">
          <strong>Sua matrícula venceu.</strong> Fale com a recepção para renovar e continuar treinando.{" "}
          <Link href="/aluno/plano" className="sublinhado">
            Ver planos
          </Link>
        </div>
      ) : null}

      <InstalarApp />

      {avisos.length ? (
        <section className="avisos-portal" aria-label="Avisos da academia">
          {avisos.map((a) => (
            <article key={a.id} className={`aviso-portal${a.fixado ? " fixado" : ""}`}>
              <h2>
                {a.titulo} <span className="muted small">· {formatarData(a.criado_em.slice(0, 10))}</span>
              </h2>
              <p>{a.texto}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="hoje-treino panel" aria-labelledby="titulo-hoje">
        <p className="muted small">Treino de hoje</p>
        {sugestao.tipo === "sem_ficha" ? (
          <>
            <h2 id="titulo-hoje" className="destaque">Sem ficha ainda</h2>
            <p className="muted">Peça ao seu instrutor para montar seu treino. Enquanto isso, explore a <Link href="/aluno/exercicios" className="sublinhado">biblioteca de exercícios</Link>.</p>
          </>
        ) : sugestao.tipo === "descanso" ? (
          <>
            <h2 id="titulo-hoje" className="destaque">Dia de descanso</h2>
            <p className="muted">
              {sugestao.proxima
                ? `Próximo treino: ficha ${sugestao.proxima.letra} ${sugestao.proxima.emDias === 1 ? "amanhã" : `na ${DIAS_LONGOS[sugestao.proxima.dia]}`}.`
                : "Aproveite para descansar."}
            </p>
          </>
        ) : (
          <>
            <h2 id="titulo-hoje" className="destaque">
              Ficha {sugestao.letra} {fichaHoje?.objetivo ? <span className="muted">· {fichaHoje.objetivo}</span> : null}
            </h2>
            <p className="muted">
              {plural(fichaHoje?.itens.length ?? 0, "exercício", "exercícios")}
              {sugestao.motivo === "sequencia" ? " · próxima da sua sequência" : ""}
            </p>
            <div className="row" style={{ marginTop: 16 }}>
              <BotaoTreinoFeito letra={sugestao.letra} feito={feitasHoje.has(sugestao.letra)} />
              <Link href={`/aluno/treino#ficha-${sugestao.letra}`} className="btn">
                Ver exercícios
              </Link>
            </div>
          </>
        )}
        {fichas.length ? <SemanaRotina fichas={fichas} hoje={hoje} feitos={feitos} /> : null}
      </section>

      <div className="kpis">
        <Link href="/aluno/mensalidade" className="kpi kpi-link">
          <span className="rotulo">{aluno.devido ? "Em atraso" : "Próxima mensalidade"}</span>
          <span className="num">{aluno.devido ? brl(aluno.devido) : proxima ? brl(proxima.valor_centavos) : "—"}</span>
          <span className="muted small">
            {aluno.devido ? `${plural(aluno.dias_atraso, "dia", "dias")} de atraso` : proxima ? `vence em ${formatarData(proxima.vencimento)}` : "nada em aberto"}
          </span>
        </Link>
        <Link href="/aluno/plano" className="kpi kpi-link">
          <span className="rotulo">Plano {aluno.plano_nome ?? ""}</span>
          <span className="num">{aluno.fim ? (aluno.fim >= hoje ? plural(diasEntre(hoje, aluno.fim), "dia", "dias") : "Vencido") : "—"}</span>
          <span className="muted small">{aluno.fim ? `até ${formatarData(aluno.fim)}` : "sem matrícula"}</span>
        </Link>
        <Link href="/aluno/aulas" className="kpi kpi-link">
          <span className="rotulo">Próxima aula</span>
          <span className="num">{proximaAula ? proximaAula.nome : "—"}</span>
          <span className="muted small">
            {proximaAula
              ? `${proximaAula.data === hoje ? "hoje" : formatarData(proximaAula.data)}, ${proximaAula.hora}–${horaFim(proximaAula.hora, proximaAula.duracao_min)}`
              : "reserve uma aula coletiva"}
          </span>
        </Link>
        <Link href="/aluno/frequencia" className="kpi kpi-link">
          <span className="rotulo">Treinos neste mês</span>
          <span className="num">{noMes}</span>
          <span className="muted small">{plural(sequencia, "semana seguida", "semanas seguidas")}</span>
        </Link>
      </div>

      <div className="two-equal">
        <section className="panel">
          <h2>Conquistas</h2>
          <ul className="conquistas">
            {medalhas.map((m) => (
              <li key={m.id} className={m.ganhou ? "ganhou" : ""}>
                <span className="medalha" aria-hidden="true">
                  {m.ganhou ? "★" : "☆"}
                </span>
                <span>
                  <strong>{m.titulo}</strong>
                  <span className="muted small">
                    {m.descricao}
                    {!m.ganhou && m.progresso ? ` · ${m.progresso}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <Link href="/aluno/carteirinha" className="panel carteirinha kpi-link">
          <h2>Carteirinha</h2>
          <QrCode texto={aluno.codigo} tamanho={128} />
          <p className="mono codigo">{aluno.codigo}</p>
          <p className="hint">Mostre na recepção para registrar sua entrada. Toque para abrir em tela cheia.</p>
        </Link>
      </div>
    </>
  );
}
