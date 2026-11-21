import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulso · Gestão de Academia",
  description: "Sistema de gestão de alunos, planos e frequência.",
};

// Roda antes da página aparecer: usa o tema salvo ou, na primeira visita, o tema do sistema.
const SCRIPT_TEMA = `try{var t=localStorage.getItem('pulso_tema');if(t!=='light'&&t!=='dark'){t='dark'}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
