import Link from "next/link";
import { redirect } from "next/navigation";
import { Marca } from "@/components/marca";
import { ThemeToggle } from "@/components/theme-toggle";
import { alunoAtual } from "@/lib/auth-aluno";
import { getDb } from "@/lib/db";
import { SENHA_ALUNO_DEMO } from "@/lib/seed";
import { EntrarAlunoForm } from "../formularios-acesso";

export const metadata = { title: "Área do aluno · Pulso" };

export default async function EntrarAlunoPage() {
  if (await alunoAtual()) redirect("/aluno");
  const demo = getDb().prepare("SELECT valor FROM config WHERE chave = 'aluno_demo_email'").get() as { valor: string } | undefined;

  return (
    <main className="login">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <section className="login-card">
        <Marca sub="Área do aluno" />
        <h1>Entrar</h1>
        <p className="muted">Veja seu treino, seus pagamentos e sua evolução.</p>

        <EntrarAlunoForm />

        <p className="login-links">
          Primeira vez aqui? <Link href="/aluno/primeiro-acesso">Criar meu acesso</Link>
        </p>

        {demo ? (
          <div className="hint">
            <p style={{ marginBottom: 6 }}>Aluno de demonstração:</p>
            <p className="mono">
              {demo.valor} / {SENHA_ALUNO_DEMO}
            </p>
          </div>
        ) : null}
        <p className="login-links muted small">
          É da equipe da academia? <Link href="/login">Entrar no painel</Link>
        </p>
      </section>
    </main>
  );
}
