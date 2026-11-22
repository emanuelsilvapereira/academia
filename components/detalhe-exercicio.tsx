import { AnimacaoExercicio } from "@/components/animacao-exercicio";
import { CorpoAnatomico } from "@/components/corpo-anatomico";
import { destaquesDoExercicio } from "@/lib/corpo";
import { GRUPO_ROTULO } from "@/lib/format";
import { lerMusculos, MUSCULOS } from "@/lib/musculos";
import type { ExercicioCompleto } from "@/lib/portal";
import { analisarVideo, buscaNoYoutube } from "@/lib/video";

// Página de um exercício (usada no portal do aluno e na área da equipe):
// animação da execução (fotos sem som), vídeo opcional, o que trabalha, passo a passo, dicas e mapa dos músculos.

export function VideoExercicio({ nome, url }: { nome: string; url: string }) {
  const video = analisarVideo(url);
  if (video?.tipo === "youtube") {
    return (
      <div className="video">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
          title={`Vídeo: como fazer ${nome}`}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }
  if (video?.tipo === "arquivo") {
    return (
      <div className="video">
        <video src={video.url} controls preload="metadata" playsInline aria-label={`Vídeo: como fazer ${nome}`} />
      </div>
    );
  }
  return (
    <div className="video video-vazio">
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <circle cx="12" cy="12" r="10" className="r-line" />
        <path d="M10 8.5v7l6-3.5z" className="r-fill" />
      </svg>
      <p>A academia ainda não cadastrou um vídeo para este exercício.</p>
      <a className="btn sm" href={buscaNoYoutube(nome)} target="_blank" rel="noopener noreferrer">
        Ver vídeos no YouTube ↗
      </a>
    </div>
  );
}

function ListaMusculos({ titulo, ids }: { titulo: string; ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div>
      <h3 className="mini-titulo">{titulo}</h3>
      <ul className="musculos">
        {ids.map((id) => (
          <li key={id}>
            <strong>{MUSCULOS[id].nome}</strong>
            <span className="muted small">{MUSCULOS[id].regiao}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DetalheExercicio({ ex, naFicha }: { ex: ExercicioCompleto; naFicha?: React.ReactNode }) {
  const primarios = lerMusculos(ex.musculos_primarios);
  const secundarios = lerMusculos(ex.musculos_secundarios).filter((m) => !primarios.includes(m));
  const passos = ex.execucao.split("\n").map((s) => s.trim()).filter(Boolean);
  const dicas = ex.dicas.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="exercicio-detalhe">
      <div className="ex-coluna">
        {ex.animacao ? <AnimacaoExercicio pasta={ex.animacao} nome={ex.nome} /> : null}
        {ex.video_url || !ex.animacao ? <VideoExercicio nome={ex.nome} url={ex.video_url} /> : null}
        <p className="ex-tags">
          <span className="tag">{GRUPO_ROTULO[ex.grupo] ?? ex.grupo}</span>
          <span className="tag">{ex.equipamento}</span>
        </p>
        {naFicha}
        {ex.descricao ? (
          <section className="ex-bloco">
            <h2>O que trabalha</h2>
            <p>{ex.descricao}</p>
          </section>
        ) : null}
        {passos.length ? (
          <section className="ex-bloco">
            <h2>Como fazer</h2>
            <ol className="passos">
              {passos.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </section>
        ) : null}
        {dicas.length ? (
          <section className="ex-bloco">
            <h2>Dicas e erros comuns</h2>
            <ul className="dicas">
              {dicas.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {!ex.descricao && !passos.length ? <p className="muted">Ainda não há explicação cadastrada para este exercício.</p> : null}
      </div>

      <aside className="panel ex-musculos">
        <h2>Músculos trabalhados</h2>
        {primarios.length || secundarios.length ? (
          <>
            <CorpoAnatomico destaques={destaquesDoExercicio(primarios, secundarios)} />
            <ListaMusculos titulo="Principais" ids={primarios} />
            <ListaMusculos titulo="Auxiliares" ids={secundarios} />
          </>
        ) : (
          <p className="muted">Os músculos deste exercício ainda não foram cadastrados.</p>
        )}
      </aside>
    </div>
  );
}
