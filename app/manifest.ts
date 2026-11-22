import type { MetadataRoute } from "next";

// Permite instalar o portal do aluno no celular ("Adicionar à tela inicial"): abre em tela cheia,
// com ícone próprio, direto na área do aluno.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pulso · Área do aluno",
    short_name: "Pulso",
    description: "Seu treino, suas aulas, sua mensalidade e sua evolução na academia.",
    start_url: "/aluno",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08090a",
    theme_color: "#08090a",
    lang: "pt-BR",
    icons: [
      { src: "/icone/192", sizes: "192x192", type: "image/png" },
      { src: "/icone/512", sizes: "512x512", type: "image/png" },
      { src: "/icone/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Meu treino", url: "/aluno/treino" },
      { name: "Carteirinha", url: "/aluno/carteirinha" },
      { name: "Aulas", url: "/aluno/aulas" },
    ],
  };
}
