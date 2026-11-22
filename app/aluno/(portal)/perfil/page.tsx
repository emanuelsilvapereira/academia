import { exigirAluno } from "@/lib/auth-aluno";
import { buscarAluno } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { formatarCpf, formatarData, formatarTelefone, hojeISO } from "@/lib/format";
import { idade } from "@/lib/validacao";
import { AlterarSenhaForm } from "./senha-form";

export const metadata = { title: "Perfil · Pulso" };

export default async function PerfilAlunoPortalPage() {
  const { id } = await exigirAluno();
  const hoje = hojeISO();
  const aluno = buscarAluno(getDb(), id, hoje)!;
  return (
    <>
      <header className="head">
        <div>
          <h1>Perfil</h1>
        </div>
      </header>
      <div className="two-equal">
        <section className="panel">
          <h2>Meus dados</h2>
          <dl className="dados">
            <dt>Nome</dt>
            <dd>{aluno.nome}</dd>
            <dt>E-mail</dt>
            <dd>{aluno.email}</dd>
            <dt>Telefone</dt>
            <dd>{formatarTelefone(aluno.telefone)}</dd>
            <dt>CPF</dt>
            <dd>{formatarCpf(aluno.cpf)}</dd>
            <dt>Nascimento</dt>
            <dd>
              {formatarData(aluno.nascimento)} ({idade(aluno.nascimento, hoje)} anos)
            </dd>
            <dt>Instrutor</dt>
            <dd>{aluno.instrutor_nome ?? "Sem instrutor"}</dd>
            <dt>Aluno desde</dt>
            <dd>{formatarData(aluno.cadastro)}</dd>
          </dl>
          <p className="hint">Algum dado errado? Peça à recepção para corrigir.</p>
        </section>
        <section className="panel">
          <h2>Trocar senha</h2>
          <AlterarSenhaForm />
        </section>
      </div>
    </>
  );
}
