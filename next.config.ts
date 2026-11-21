import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modelo dinâmico tradicional (sem Cache Components): páginas que leem
  // cookies ou banco de dados rodam a cada requisição.
  serverExternalPackages: ["better-sqlite3"],
  // O schema.sql é lido do disco em tempo de execução; sem isto ele não vai junto no deploy (Vercel).
  outputFileTracingIncludes: {
    "/*": ["./db/schema.sql", "./node_modules/better-sqlite3/prebuilds/linux-*.node"],
  },
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
