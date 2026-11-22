import Link from "next/link";
import { MiniaturaExercicio } from "@/components/animacao-exercicio";
import { CorpoAnatomico } from "@/components/corpo-anatomico";
import { exigirAluno } from "@/lib/auth-aluno";
import { REGIOES } from "@/lib/corpo";
import { getDb } from "@/lib/db";
import { GRUPO_ROTULO, plural } from "@/lib/format";
import { lerMusculos, MUSCULOS } from "@/lib/musculos";

export const metadata = { title: "Exercícios · Pulso" };

type Busca = Record<string, string | string[] | undefined>;
type Linha = { id: number; nome: string; grupo: string; equipamento: string; descricao: string; musculos_primarios: string; musculos_secundarios: string; video_url: string; animacao: string; na_ficha: number };

export default async function ExerciciosAlunoPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const { id: alunoId } = await exigirAluno();
  const busca = await searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = um(busca.q).trim().slice(0, 60);
  const grupo = um(busca.grupo) in GRUPO_ROTULO ? um(busca.grupo) : "";
  const musculo = um(busca.musculo) in MUSCULOS ? um(busca.musculo) : "";
  const meus = um(busca.meus) === "1";
  const regiao = um(busca.regiao) in REGIOES ? um(busca.regiao) : "";

  const exercicios = getDb()
    .prepare(
      `SELECT e.id, e.nome, e.grupo, e.equipamento, e.descricao, e.musculos_primarios, e.musculos_secundarios, e.video_url, e.animacao,
              EXISTS (SELECT 1 FROM ficha_item fi JOIN ficha f ON f.id = fi.ficha_id WHERE fi.exercicio_id = e.id AND f.aluno_id = @aluno) AS na_ficha
       FROM exercicio e
       WHERE (@q = '' OR e.nome LIKE '%' || @q || '%' OR e.equipamento LIKE '%' || @q || '%')
         AND (@grupo = '' OR e.grupo = @grupo)
         AND (@musculo = '' OR (',' || e.musculos_primarios || ',' || e.musculos_secundarios || ',') LIKE '%,' || @musculo || ',%')
       ORDER BY na_ficha DESC, e.grupo, e.nome COLLATE NOCASE`,
    )
    .all({ aluno: alunoId, q, grupo, musculo }) as Linha[];
  // Região tocada no modelo do corpo: exercícios em que algum músculo dela é principal ou auxiliar
  // (os que têm a região como principal aparecem primeiro).
  const daRegiao = regiao ? new Set(REGIOES[regiao].musculos) : null;
  const principal = (e: Linha) => (daRegiao ? lerMusculos(e.musculos_primarios).some((m) => daRegiao.has(m)) : false);
  const lista = exercicios
    .filter((e) => !meus || e.na_ficha)
    .filter((e) => !daRegiao || [...lerMusculos(e.musculos_primarios), ...lerMusculos(e.musculos_secundarios)].some((m) => daRegiao.has(m)))
    .sort((a, b) => Number(principal(b)) - Number(principal(a)));
  const extras = new URLSearchParams(Object.entries({ q, grupo, musculo, meus: meus ? "1" : "" }).filter(([, v]) => v)).toString();

  return (
    <>
      <header className="head">
        <div>
          <h1>Exercícios</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Como fazer cada exercício, o que ele trabalha e os músculos envolvidos.
          </p>
        </div>
      </header>

      <section className="panel corpo-painel" aria-label="Escolha um músculo no corpo">
        <div>
          <h2>Escolha pelo corpo</h2>
          <p className="muted small">
            {regiao ? (
              <>
                Mostrando exercícios para <strong>{REGIOES[regiao].rotulo.toLowerCase()}</strong>.{" "}
                <Link href={`/aluno/exercicios${extras ? `?${extras}` : ""}`} className="sublinhado" scroll={false}>
                  Ver todos
                </Link>
              </>
            ) : (
              "Toque num músculo da ilustração para ver os exercícios que trabalham ele."
            )}
          </p>
        </div>
        <CorpoAnatomico regiaoAtiva={regiao || undefined} filtrarEm="/aluno/exercicios" parametrosExtras={extras} />
      </section>

      <form className="tools" method="get" action="/aluno/exercicios">
        {regiao ? <input type="hidden" name="regiao" value={regiao} /> : null}
        <input type="search" name="q" placeholder="Buscar exercício" aria-label="Buscar exercício" defaultValue={q} />
        <select name="grupo" aria-label="Grupo muscular" defaultValue={grupo}>
          <option value="">Todos os grupos</option>
          {Object.entries(GRUPO_ROTULO).map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
        <select name="musculo" aria-label="Músculo" defaultValue={musculo}>
          <option value="">Qualquer músculo</option>
          {Object.entries(MUSCULOS).map(([v, m]) => (
            <option key={v} value={v}>
              {m.regiao} ({m.nome})
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" name="meus" value="1" defaultChecked={meus} /> Só os do meu treino
        </label>
        <button type="submit" className="btn">
          Filtrar
        </button>
        {q || grupo || musculo || meus || regiao ? (
          <Link href="/aluno/exercicios" className="link-btn">
            Limpar
          </Link>
        ) : null}
        <span className="count">{plural(lista.length, "exercício", "exercícios")}</span>
      </form>

      {lista.length === 0 ? (
        <p className="empty">Nenhum exercício encontrado.</p>
      ) : (
        <div className="cards">
          {lista.map((e) => (
            <Link key={e.id} href={`/aluno/exercicios/${e.id}`} className="card card-exercicio">
              {e.animacao ? <MiniaturaExercicio pasta={e.animacao} /> : null}
              <p className="ex-tags">
                <span className="tag">{GRUPO_ROTULO[e.grupo]}</span>
                {e.na_ficha ? <span className="tag tag-forte">no meu treino</span> : null}
                {e.video_url ? <span className="tag">vídeo</span> : null}
              </p>
              <h3>{e.nome}</h3>
              <p className="muted small">{e.equipamento}</p>
              {e.descricao ? <p className="small resumo">{e.descricao}</p> : null}
              <p className="small musculos-linha">
                {lerMusculos(e.musculos_primarios)
                  .map((m) => MUSCULOS[m].regiao)
                  .join(" · ")}
                {daRegiao && !principal(e) ? <span className="muted"> · trabalha como auxiliar</span> : null}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
