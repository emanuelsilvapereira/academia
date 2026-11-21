import Link from "next/link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/cabecalho";
import { Exportar } from "@/components/exportar";
import { Paginacao } from "@/components/paginacao";
import { Status } from "@/components/status";
import { exigirUsuario } from "@/lib/auth";
import { filtrosDaUrl, filtrosParaUrl, listarAlunos, POR_PAGINA } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { formatarData, formatarTelefone, hojeISO, plural, SITUACAO_ROTULO } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { excluirAluno } from "./actions";

type Busca = Record<string, string | string[] | undefined>;

function um(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

// Cabeçalho de coluna que ordena ao clicar (clicar de novo inverte a direção). A ordenação é feita no banco.
function Coluna({ campo, rotulo, base, ordem, dir }: { campo: string; rotulo: string; base: URLSearchParams; ordem: string; dir: string }) {
  const ativa = ordem === campo;
  const p = new URLSearchParams(base);
  p.delete("pagina"); // trocar a ordem volta para a primeira página
  p.set("ordem", campo);
  p.set("dir", ativa && dir === "asc" ? "desc" : "asc");
  return (
    <th aria-sort={ativa ? (dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link href={`/alunos?${p.toString()}`}>
        {rotulo}
        {ativa ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    </th>
  );
}

export default async function AlunosPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const usuario = await exigirUsuario();
  const busca = await searchParams;
  const filtros = filtrosDaUrl((k) => um(busca[k]));
  const pedida = Math.max(1, Math.floor(Number(um(busca.pagina))) || 1);

  const db = getDb();
  const hoje = hojeISO();
  const planos = db.prepare("SELECT id, nome FROM plano ORDER BY meses, nome").all() as { id: number; nome: string }[];
  const instrutores = db.prepare("SELECT id, nome FROM instrutor ORDER BY nome").all() as { id: number; nome: string }[];

  const resultado = listarAlunos(db, filtros, hoje, pedida);
  const total = resultado.total;
  let linhas = resultado.linhas;
  // Se a página pedida passou do fim (ex.: depois de excluir), mostra a última.
  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(pedida, ultimaPagina);
  if (pagina !== pedida) linhas = listarAlunos(db, filtros, hoje, pagina).linhas;

  const base = filtrosParaUrl(filtros);
  const basePagina = new URLSearchParams(base);
  if (pagina > 1) basePagina.set("pagina", String(pagina));
  const coluna = (campo: string, rotulo: string) => (
    <Coluna key={campo} campo={campo} rotulo={rotulo} base={basePagina} ordem={filtros.ordem} dir={filtros.dir} />
  );
  const filtrando = filtros.q || filtros.situacao || filtros.plano || filtros.instrutor;
  const editar = pode(usuario.perfil, "alunos.editar");

  return (
    <>
      <Cabecalho titulo="Alunos">
        <div className="row">
          {pode(usuario.perfil, "relatorios.exportar") ? <Exportar relatorio="alunos" params={base} /> : null}
          {editar ? (
            <Link href="/alunos/novo" className="btn primary">
              Novo aluno
            </Link>
          ) : null}
        </div>
      </Cabecalho>

      <form className="tools" method="get" action="/alunos">
        <input type="search" name="q" placeholder="Buscar por nome, e-mail, CPF ou código" aria-label="Buscar aluno" defaultValue={filtros.q} />
        <select name="situacao" aria-label="Filtrar por situação" defaultValue={filtros.situacao}>
          <option value="">Todas as situações</option>
          {Object.entries(SITUACAO_ROTULO).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
        <select name="plano" aria-label="Filtrar por plano" defaultValue={filtros.plano ? String(filtros.plano) : ""}>
          <option value="">Todos os planos</option>
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <select name="instrutor" aria-label="Filtrar por instrutor" defaultValue={filtros.instrutor ? String(filtros.instrutor) : ""}>
          <option value="">Todos os instrutores</option>
          {instrutores.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
        <input type="hidden" name="ordem" value={filtros.ordem} />
        <input type="hidden" name="dir" value={filtros.dir} />
        <button type="submit" className="btn">
          Filtrar
        </button>
        {filtrando ? (
          <Link href="/alunos" className="link-btn">
            Limpar
          </Link>
        ) : null}
        <span className="count" aria-live="polite">
          {plural(total, "aluno", "alunos")}
        </span>
      </form>

      <div className="tabela">
        <table>
          <thead>
            <tr>
              {coluna("nome", "Aluno")}
              {coluna("plano", "Plano")}
              {coluna("situacao", "Situação")}
              {coluna("fim", "Vence em")}
              {coluna("ultima", "Último treino")}
              <th className="actions">
                <span className="sr">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td className="empty" colSpan={6}>
                  {filtrando ? "Nenhum aluno encontrado com esses filtros." : "Nenhum aluno cadastrado."}
                </td>
              </tr>
            ) : (
              linhas.map((a) => (
                <tr key={a.id}>
                  <td data-label="Aluno">
                    <span>
                      <Link href={`/alunos/${a.id}`} className="name sublinhado-hover">
                        {a.nome}
                      </Link>
                      <span className="sub">
                        {a.email} · {formatarTelefone(a.telefone)}
                      </span>
                    </span>
                  </td>
                  <td data-label="Plano">{a.plano_nome ?? "—"}</td>
                  <td data-label="Situação">
                    <Status status={a.situacao} />
                  </td>
                  <td data-label="Vence em">{formatarData(a.fim)}</td>
                  <td data-label="Último treino">{formatarData(a.ultima_presenca)}</td>
                  <td className="actions">
                    <Link href={`/alunos/${a.id}`} className="btn sm">
                      Perfil
                    </Link>
                    {editar ? (
                      <BotaoExcluir
                        acao={excluirAluno.bind(null, a.id)}
                        nome={a.nome}
                        detalhe="Matrículas, pagamentos, frequência, treinos e avaliações dele também serão removidos."
                      />
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Paginacao caminho="/alunos" base={base} pagina={pagina} total={total} porPagina={POR_PAGINA} />
    </>
  );
}
