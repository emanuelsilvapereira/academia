"use client";

import { MuscleMap } from "js-rich-body-highlighter/react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { COR_AUXILIAR, COR_PRINCIPAL, NOME_AREA, REGIOES, type Destaque } from "@/lib/corpo";

// Modelo anatômico detalhado (ilustração + áreas destacáveis), da biblioteca js-rich-body-highlighter (MIT).
// Dois usos: mostrar os músculos de um exercício, ou servir de filtro (tocar num músculo filtra a lista).

type Musculo = { id: string; group: string; name: string };

// Área do modelo masculino → grupo (para o modelo feminino, que tem outras áreas, destacamos pelo grupo).
const GRUPO_DA_AREA: Record<string, string> = {
  pectoralis: "chest", deltoids: "shoulders", deltoids_back: "shoulders", biceps: "biceps", triceps: "triceps",
  forearms: "forearms", forearms_back: "forearms", rectus_abdominis: "abs", obliques: "obliques", trapezius: "upper_back",
  upper_back: "upper_back", lats: "lats", lower_back: "lower_back", glutes: "glutes", quadriceps: "quads",
  hamstrings: "hamstrings", calves: "calves", calves_back: "calves",
};

function lerTema(): "light" | "dark" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}
function assinarTema(aviso: () => void) {
  const obs = new MutationObserver(aviso);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

export function CorpoAnatomico({
  destaques = [],
  regiaoAtiva,
  filtrarEm,
  parametrosExtras = "",
}: {
  /** Áreas acesas (modo exercício). */
  destaques?: Destaque[];
  /** Grupo selecionado no filtro (modo filtro). */
  regiaoAtiva?: string;
  /** Página da lista: tocar num músculo leva para `${filtrarEm}?regiao=<grupo>`. */
  filtrarEm?: string;
  /** Outros filtros da URL para manter ao trocar de região (ex.: "q=supino&meus=1"). */
  parametrosExtras?: string;
}) {
  const router = useRouter();
  const tema = useSyncExternalStore(assinarTema, lerTema, () => "dark" as const);
  const [genero, setGenero] = useState<"male" | "female">("male");
  const [sobre, setSobre] = useState<string | null>(null);

  const nomeDe = (m: Musculo) => NOME_AREA[m.id] ?? REGIOES[m.group]?.rotulo ?? m.name;

  // Modelo feminino: converte as áreas do masculino em grupos.
  const realces =
    genero === "male"
      ? destaques
      : [...new Map(destaques.map((d) => [GRUPO_DA_AREA[d.id], d])).entries()].map(([group, d]) => ({ group, intensity: d.intensity, color: d.color }));
  const comFiltro = regiaoAtiva ? [...realces, { group: regiaoAtiva, intensity: 80, color: COR_PRINCIPAL }] : realces;

  const aoClicar = filtrarEm
    ? (m: Musculo) => {
        const extras = parametrosExtras ? `&${parametrosExtras}` : "";
        router.push(m.group === regiaoAtiva ? `${filtrarEm}${parametrosExtras ? `?${parametrosExtras}` : ""}` : `${filtrarEm}?regiao=${m.group}${extras}`, { scroll: false });
      }
    : undefined;

  const comum = {
    gender: genero,
    theme: tema,
    highlights: comFiltro,
    color: COR_PRINCIPAL,
    blendMode: tema === "dark" ? "screen" : "multiply",
    hoverIntensity: filtrarEm ? 45 : 25,
    onMuscleEnter: (m: Musculo) => setSobre(nomeDe(m)),
    onMuscleLeave: () => setSobre(null),
    onMuscleClick: (m: Musculo) => {
      setSobre(nomeDe(m));
      aoClicar?.(m);
    },
    bodySrc: {
      front: `/corpo/${genero}-front-${tema}.webp`,
      back: `/corpo/${genero}-back-${tema}.webp`,
    },
  };

  return (
    <figure className={`corpo${filtrarEm ? " corpo-filtro" : ""}`}>
      <div className="corpo-topo">
        <div className="corpo-genero" role="group" aria-label="Modelo do corpo">
          <button type="button" className={`btn sm${genero === "male" ? " primary" : ""}`} aria-pressed={genero === "male"} onClick={() => setGenero("male")}>
            Masculino
          </button>
          <button type="button" className={`btn sm${genero === "female" ? " primary" : ""}`} aria-pressed={genero === "female"} onClick={() => setGenero("female")}>
            Feminino
          </button>
        </div>
        <p className="corpo-nome" aria-live="polite">
          {sobre ?? (filtrarEm ? "Toque num músculo para ver os exercícios" : "Passe o mouse ou toque num músculo")}
        </p>
      </div>
      <div className="corpo-vistas">
        <div>
          <MuscleMap {...comum} view="front" width="100%" />
          <span className="corpo-rotulo">Frente</span>
        </div>
        <div>
          <MuscleMap {...comum} view="back" width="100%" />
          <span className="corpo-rotulo">Costas</span>
        </div>
      </div>
      {filtrarEm ? null : (
        <figcaption className="mm-legenda">
          <span>
            <i className="mm-chave" style={{ background: COR_PRINCIPAL }} /> Principal
          </span>
          <span>
            <i className="mm-chave" style={{ background: COR_AUXILIAR }} /> Auxiliar
          </span>
        </figcaption>
      )}
    </figure>
  );
}
