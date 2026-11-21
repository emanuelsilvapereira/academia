import Link from "next/link";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/cabecalho";
import { exigirUsuario } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { GRUPO_ROTULO, plural } from "@/lib/format";
import { pode } from "@/lib/permissoes";
import { excluirExercicio } from "./actions";

type Linha = { id: number; nome: string; grupo: string; equipamento: string; fichas: number };
type Busca = Record<string, string | string[] | undefined>;

export default async function ExerciciosPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const usuario = await exigirUsuario();
  const busca = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = um(busca.q).trim().slice(0, 60);
  const grupo = um(busca.grupo) in GRUPO_ROTULO ? um(busca.grupo) : "";
  const editar = pode(usuario.perfil, "exercicios.editar");

  const exercicios = getDb()
    .prepare(
      `SELECT e.id, e.nome, e.grupo, e.equipamento, COUNT(DISTINCT fi.ficha_id) AS fichas
       FROM exercicio e LEFT JOIN ficha_item fi ON fi.exercicio_id = e.id
       WHERE (@q = '' OR e.nome LIKE '%' || @q || '%' OR e.equipamento LIKE '%' || @q || '%')
         AND (@grupo = '' OR e.grupo = @grupo)
       GROUP BY e.id ORDER BY e.grupo, e.nome COLLATE NOCASE`,
    )
    .all({ q, grupo }) as Linha[];

  return (
    <>
      <Cabecalho titulo="Exercícios">
        {editar ? (
          <Link href="/exercicios/novo" className="btn primary">
            Novo exercício
          </Link>
        ) : null}
      </Cabecalho>

      <form className="tools" method="get" action="/exercicios">
        <input type="search" name="q" placeholder="Buscar por nome ou equipamento" aria-label="Buscar exercício" defaultValue={q} />
        <select name="grupo" aria-label="Filtrar por grupo muscular" defaultValue={grupo}>
          <option value="">Todos os grupos</option>
          {Object.entries(GRUPO_ROTULO).map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" className="btn">
          Filtrar
        </button>
        {q || grupo ? (
          <Link href="/exercicios" className="link-btn">
            Limpar
          </Link>
        ) : null}
        <span className="count">{plural(exercicios.length, "exercício", "exercícios")}</span>
      </form>

      <div className="tabela">
        <table>
          <thead>
            <tr>
              <th>Exercício</th>
              <th>Grupo muscular</th>
              <th>Equipamento</th>
              <th>Em uso</th>
              {editar ? (
                <th className="actions">
                  <span className="sr">Ações</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {exercicios.length === 0 ? (
              <tr>
                <td className="empty" colSpan={5}>
                  Nenhum exercício encontrado.
                </td>
              </tr>
            ) : (
              exercicios.map((e) => (
                <tr key={e.id}>
                  <td data-label="Exercício">
                    <span className="name">{e.nome}</span>
                  </td>
                  <td data-label="Grupo muscular">{GRUPO_ROTULO[e.grupo]}</td>
                  <td data-label="Equipamento">{e.equipamento}</td>
                  <td data-label="Em uso">{e.fichas ? plural(e.fichas, "ficha", "fichas") : "—"}</td>
                  {editar ? (
                    <td className="actions">
                      <Link href={`/exercicios/${e.id}/editar`} className="btn sm">
                        Editar
                      </Link>
                      <BotaoExcluir acao={excluirExercicio.bind(null, e.id)} nome={e.nome} />
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
