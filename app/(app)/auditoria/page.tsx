import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { Exportar } from "@/components/exportar";
import { Paginacao } from "@/components/paginacao";
import { ACAO_ROTULO, ENTIDADE_ROTULO, type Acao } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { consultarAuditoria, filtrosAuditoria, POR_PAGINA_AUDITORIA } from "@/lib/relatorio-auditoria";
import { getDb } from "@/lib/db";
import { formatarData, plural } from "@/lib/format";

type Busca = Record<string, string | string[] | undefined>;

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<Busca> }) {
  await exigirPermissao("auditoria.ver");
  const busca = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const f = filtrosAuditoria((k) => um(busca[k]));
  const pagina = Math.max(1, Math.floor(Number(um(busca.pagina))) || 1);
  const { total, linhas } = consultarAuditoria(getDb(), f, pagina);

  const base = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) base.set(k, v);
  const filtrando = Object.values(f).some(Boolean);

  return (
    <>
      <Cabecalho titulo="Auditoria">
        <Exportar relatorio="auditoria" params={base} />
      </Cabecalho>
      <p className="muted" style={{ marginTop: -20, marginBottom: 28 }}>
        Registro de quem fez o quê e quando: logins (inclusive recusados), cadastros, alterações, exclusões e pagamentos.
      </p>

      <form className="tools" method="get" action="/auditoria">
        <input type="search" name="q" placeholder="Buscar na descrição ou e-mail" aria-label="Buscar" defaultValue={f.q} />
        <select name="acao" aria-label="Filtrar por ação" defaultValue={f.acao}>
          <option value="">Todas as ações</option>
          {(Object.keys(ACAO_ROTULO) as Acao[]).map((a) => (
            <option key={a} value={a}>
              {ACAO_ROTULO[a]}
            </option>
          ))}
        </select>
        <select name="entidade" aria-label="Filtrar por área" defaultValue={f.entidade}>
          <option value="">Todas as áreas</option>
          {Object.entries(ENTIDADE_ROTULO)
            .filter(([k]) => k !== "ficha_item")
            .map(([k, r]) => (
              <option key={k} value={k}>
                {r}
              </option>
            ))}
        </select>
        <input type="date" name="de" aria-label="De" defaultValue={f.de} className="curto" style={{ width: 160 }} />
        <input type="date" name="ate" aria-label="Até" defaultValue={f.ate} className="curto" style={{ width: 160 }} />
        <button type="submit" className="btn">
          Filtrar
        </button>
        {filtrando ? (
          <Link href="/auditoria" className="link-btn">
            Limpar
          </Link>
        ) : null}
        <span className="count">{plural(total, "registro", "registros")}</span>
      </form>

      <div className="tabela">
        <table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Quem</th>
              <th>Ação</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td className="empty" colSpan={4}>
                  Nenhum registro.
                </td>
              </tr>
            ) : (
              linhas.map((l) => (
                <tr key={l.id}>
                  <td data-label="Quando" className="mono" style={{ whiteSpace: "nowrap" }}>
                    {formatarData(l.quando)} {l.quando.slice(11, 19)}
                  </td>
                  <td data-label="Quem">{l.usuario_email}</td>
                  <td data-label="Ação">
                    {ACAO_ROTULO[l.acao as Acao] ?? l.acao}
                    <span className="sub">{ENTIDADE_ROTULO[l.entidade] ?? l.entidade}</span>
                  </td>
                  <td data-label="Descrição">{l.descricao}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Paginacao caminho="/auditoria" base={base} pagina={pagina} total={total} porPagina={POR_PAGINA_AUDITORIA} />
    </>
  );
}
