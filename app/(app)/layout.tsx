import { Avisos } from "@/components/avisos";
import { ThemeToggle } from "@/components/theme-toggle";
import { exigirUsuario } from "@/lib/auth";
import { PERFIL_ROTULO, pode } from "@/lib/permissoes";
import { sair } from "../login/actions";
import { Menu } from "./menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();

  // O menu só mostra o que o perfil pode abrir.
  const itens = [
    { href: "/painel", rotulo: "Painel" },
    { href: "/alunos", rotulo: "Alunos" },
    { href: "/frequencia", rotulo: "Frequência" },
    ...(pode(usuario.perfil, "financeiro.ver") ? [{ href: "/financeiro", rotulo: "Financeiro" }] : []),
    { href: "/exercicios", rotulo: "Exercícios" },
    { href: "/planos", rotulo: "Planos" },
    { href: "/instrutores", rotulo: "Instrutores" },
    ...(pode(usuario.perfil, "usuarios.gerenciar") ? [{ href: "/usuarios", rotulo: "Usuários" }] : []),
    ...(pode(usuario.perfil, "auditoria.ver") ? [{ href: "/auditoria", rotulo: "Auditoria" }] : []),
  ];

  return (
    <Avisos>
      <header className="bar">
        <div className="brand">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="12" cy="12" r="10" className="r-line" />
            <circle cx="12" cy="12" r="5.5" className="r-line" />
            <circle cx="12" cy="12" r="1.8" className="r-fill" />
          </svg>
          <span>Pulso</span>
        </div>
        <Menu itens={itens} />
        <div className="bar-end">
          <span className="muted small email" title={usuario.email}>
            {usuario.nome} · {PERFIL_ROTULO[usuario.perfil]}
          </span>
          <ThemeToggle />
          <form action={sair}>
            <button type="submit" className="link-btn">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="main">{children}</main>
    </Avisos>
  );
}
