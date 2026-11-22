import Link from "next/link";
import { redirect } from "next/navigation";
import { Marca } from "@/components/marca";
import { ThemeToggle } from "@/components/theme-toggle";
import { alunoAtual } from "@/lib/auth-aluno";
import { PrimeiroAcessoForm } from "../formularios-acesso";

export const metadata = { title: "Primeiro acesso · Pulso" };

export default async function PrimeiroAcessoPage() {
  if (await alunoAtual()) redirect("/aluno");
  return (
    <main className="login">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <section className="login-card">
        <Marca sub="Área do aluno" />
        <h1>Primeiro acesso</h1>
        <p className="muted">Confirme seus dados do cadastro da academia e crie uma senha. Depois é só entrar com seu e-mail.</p>
        <PrimeiroAcessoForm />
        <p className="login-links">
          Já tem senha? <Link href="/aluno/entrar">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
