import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { usuarioAtual } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await usuarioAtual()) redirect("/painel");

  return (
    <main className="login">
      <div className="login-theme">
        <ThemeToggle />
      </div>

      <section className="login-card">
        <div className="brand">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="12" cy="12" r="10" className="r-line" />
            <circle cx="12" cy="12" r="5.5" className="r-line" />
            <circle cx="12" cy="12" r="1.8" className="r-fill" />
          </svg>
          <span>Pulso</span>
        </div>

        <h1>Entrar</h1>
        <p className="muted">Acesse o painel da academia.</p>

        <LoginForm />

        <div className="hint">
          <p style={{ marginBottom: 6 }}>Contas de demonstração:</p>
          <p className="mono">admin@pulso.com / admin123 · Administrador</p>
          <p className="mono">recepcao@pulso.com / recepcao123 · Recepção</p>
          <p className="mono">instrutor@pulso.com / instrutor123 · Instrutor</p>
        </div>
      </section>
    </main>
  );
}
