// Links de vídeo dos exercícios: aceita YouTube (watch, youtu.be, shorts, embed) ou arquivo .mp4/.webm.

export type Video = { tipo: "youtube"; id: string } | { tipo: "arquivo"; url: string };

export function analisarVideo(entrada: string | null | undefined): Video | null {
  const texto = (entrada ?? "").trim();
  if (!texto) return null;
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  const ID = /^[A-Za-z0-9_-]{11}$/;

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return ID.test(id) ? { tipo: "youtube", id } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (url.pathname === "/watch" && v && ID.test(v)) return { tipo: "youtube", id: v };
    const m = /^\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/.exec(url.pathname);
    return m ? { tipo: "youtube", id: m[2] } : null;
  }
  if (/\.(mp4|webm)$/i.test(url.pathname)) return { tipo: "arquivo", url: url.toString() };
  return null;
}

/** Link de busca no YouTube, usado quando o exercício ainda não tem vídeo cadastrado. */
export function buscaNoYoutube(nomeExercicio: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nomeExercicio} execução correta`)}`;
}
