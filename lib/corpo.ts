// Ligação entre os músculos do sistema (lib/musculos.ts) e as áreas do modelo anatômico
// (biblioteca js-rich-body-highlighter, licença MIT). Sem React aqui: usado no servidor e no navegador.

/** Áreas (máscaras) do modelo masculino que cada músculo do sistema acende. */
export const MASCARAS: Record<string, string[]> = {
  peitoral: ["pectoralis"],
  deltoide_anterior: ["deltoids"],
  deltoide_lateral: ["deltoids", "deltoids_back"],
  deltoide_posterior: ["deltoids_back"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  antebraco: ["forearms", "forearms_back"],
  abdomen: ["rectus_abdominis"],
  obliquos: ["obliques"],
  trapezio: ["trapezius", "upper_back"],
  romboides: ["upper_back"],
  dorsal: ["lats"],
  lombar: ["lower_back"],
  gluteo_maximo: ["glutes"],
  gluteo_medio: ["glutes"],
  quadriceps: ["quadriceps"],
  adutores: ["quadriceps"], // o modelo não separa a parte interna da coxa
  isquiotibiais: ["hamstrings"],
  panturrilha: ["calves", "calves_back"],
};

/** Nome em português de cada área do modelo (aparece ao passar o mouse ou tocar). */
export const NOME_AREA: Record<string, string> = {
  pectoralis: "Peitoral maior",
  deltoids: "Deltoides (frente e lateral do ombro)",
  deltoids_back: "Deltoide posterior",
  biceps: "Bíceps braquial",
  triceps: "Tríceps braquial",
  forearms: "Antebraço (flexores)",
  forearms_back: "Antebraço (extensores)",
  rectus_abdominis: "Reto abdominal",
  obliques: "Oblíquos",
  trapezius: "Trapézio",
  upper_back: "Trapézio médio e romboides",
  lats: "Latíssimo do dorso",
  lower_back: "Eretores da espinha (lombar)",
  glutes: "Glúteos (máximo e médio)",
  quadriceps: "Quadríceps e adutores",
  hamstrings: "Isquiotibiais (posterior de coxa)",
  calves: "Panturrilha (gastrocnêmio e sóleo)",
  calves_back: "Panturrilha (gastrocnêmio e sóleo)",
};

/** Regiões clicáveis no filtro da biblioteca: grupo do modelo → músculos do sistema. */
export const REGIOES: Record<string, { rotulo: string; musculos: string[] }> = {
  chest: { rotulo: "Peito", musculos: ["peitoral"] },
  shoulders: { rotulo: "Ombros", musculos: ["deltoide_anterior", "deltoide_lateral", "deltoide_posterior"] },
  biceps: { rotulo: "Bíceps", musculos: ["biceps"] },
  triceps: { rotulo: "Tríceps", musculos: ["triceps"] },
  forearms: { rotulo: "Antebraços", musculos: ["antebraco"] },
  abs: { rotulo: "Abdômen", musculos: ["abdomen"] },
  obliques: { rotulo: "Oblíquos", musculos: ["obliquos"] },
  upper_back: { rotulo: "Trapézio e meio das costas", musculos: ["trapezio", "romboides"] },
  lats: { rotulo: "Dorsais", musculos: ["dorsal"] },
  lower_back: { rotulo: "Lombar", musculos: ["lombar"] },
  glutes: { rotulo: "Glúteos", musculos: ["gluteo_maximo", "gluteo_medio"] },
  quads: { rotulo: "Coxas (frente e parte interna)", musculos: ["quadriceps", "adutores"] },
  hamstrings: { rotulo: "Posterior de coxa", musculos: ["isquiotibiais"] },
  calves: { rotulo: "Panturrilhas", musculos: ["panturrilha"] },
};

export type Destaque = { id: string; intensity: number; color: string };

export const COR_PRINCIPAL = "#e11d48";
export const COR_AUXILIAR = "#f59e0b";

/** Converte músculos principais/auxiliares do exercício em áreas acesas no modelo (principal vence auxiliar). */
export function destaquesDoExercicio(primarios: string[], secundarios: string[]): Destaque[] {
  const mapa = new Map<string, Destaque>();
  for (const m of secundarios) for (const id of MASCARAS[m] ?? []) mapa.set(id, { id, intensity: 45, color: COR_AUXILIAR });
  for (const m of primarios) for (const id of MASCARAS[m] ?? []) mapa.set(id, { id, intensity: 85, color: COR_PRINCIPAL });
  return [...mapa.values()];
}
