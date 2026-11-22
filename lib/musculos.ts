// Músculos usados nos exercícios. No modelo do corpo (components/corpo-anatomico.tsx) cada um acende
// as áreas listadas em lib/corpo.ts.
// "vista" diz em qual desenho o músculo aparece: frente, costas ou os dois.

export type Vista = "frente" | "costas" | "ambas";

export const MUSCULOS: Record<string, { nome: string; regiao: string; vista: Vista }> = {
  peitoral: { nome: "Peitoral maior", regiao: "Peito", vista: "frente" },
  deltoide_anterior: { nome: "Deltoide anterior", regiao: "Frente do ombro", vista: "frente" },
  deltoide_lateral: { nome: "Deltoide lateral", regiao: "Lateral do ombro", vista: "ambas" },
  deltoide_posterior: { nome: "Deltoide posterior", regiao: "Parte de trás do ombro", vista: "costas" },
  biceps: { nome: "Bíceps braquial", regiao: "Frente do braço", vista: "frente" },
  triceps: { nome: "Tríceps braquial", regiao: "Parte de trás do braço", vista: "costas" },
  antebraco: { nome: "Antebraço (flexores e braquiorradial)", regiao: "Antebraço", vista: "ambas" },
  abdomen: { nome: "Reto abdominal", regiao: "Abdômen", vista: "frente" },
  obliquos: { nome: "Oblíquos", regiao: "Lateral da cintura", vista: "frente" },
  trapezio: { nome: "Trapézio", regiao: "Pescoço e parte alta das costas", vista: "costas" },
  romboides: { nome: "Romboides", regiao: "Entre as escápulas", vista: "costas" },
  dorsal: { nome: "Latíssimo do dorso", regiao: "Costas (asas)", vista: "costas" },
  lombar: { nome: "Eretores da espinha", regiao: "Lombar", vista: "costas" },
  gluteo_maximo: { nome: "Glúteo máximo", regiao: "Glúteo", vista: "costas" },
  gluteo_medio: { nome: "Glúteo médio", regiao: "Lateral do quadril", vista: "costas" },
  quadriceps: { nome: "Quadríceps", regiao: "Frente da coxa", vista: "frente" },
  adutores: { nome: "Adutores", regiao: "Parte interna da coxa", vista: "frente" },
  isquiotibiais: { nome: "Isquiotibiais", regiao: "Parte de trás da coxa", vista: "costas" },
  panturrilha: { nome: "Gastrocnêmio e sóleo", regiao: "Panturrilha", vista: "costas" },
};

/** "peitoral,triceps" -> ["peitoral", "triceps"] (ignora ids que não existem). */
export function lerMusculos(texto: string | null | undefined): string[] {
  return (texto ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s in MUSCULOS);
}
