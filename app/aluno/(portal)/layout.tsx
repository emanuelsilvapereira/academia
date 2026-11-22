import { Menu } from "@/app/(app)/menu";
import { Avisos } from "@/components/avisos";
import { Marca } from "@/components/marca";
import { ThemeToggle } from "@/components/theme-toggle";
import { exigirAluno } from "@/lib/auth-aluno";
import { sairAluno } from "../actions";

export const metadata = { title: "Área do aluno · Pulso" };

const ITENS = [
  { href: "/aluno", rotulo: "Início", exato: true },
  { href: "/aluno/treino", rotulo: "Meu treino" },
  { href: "/aluno/aulas", rotulo: "Aulas" },
  { href: "/aluno/exercicios", rotulo: "Exercícios" },
  { href: "/aluno/mensalidade", rotulo: "Mensalidade" },
  { href: "/aluno/plano", rotulo: "Plano" },
  { href: "/aluno/frequencia", rotulo: "Frequência" },
  { href: "/aluno/evolucao", rotulo: "Evolução" },
  { href: "/aluno/carteirinha", rotulo: "Carteirinha" },
  { href: "/aluno/perfil", rotulo: "Perfil" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const aluno = await exigirAluno();
  return (
    <Avisos>
      <header className="bar">
        <Marca sub="Aluno" />
        <Menu itens={ITENS} />
        <div className="bar-end">
          <span className="muted small email">{aluno.nome.split(" ")[0]}</span>
          <ThemeToggle />
          <form action={sairAluno}>
            <button type="submit" className="link-btn">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="main portal">{children}</main>
    </Avisos>
  );
}
