import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modelo dinâmico tradicional (sem Cache Components): páginas que leem
  // cookies ou banco de dados rodam a cada requisição.
  serverExternalPackages: ["better-sqlite3"],
  // Move o indicador "N" do modo dev para o canto direito, para não cobrir o botão "Sair" do menu.
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
