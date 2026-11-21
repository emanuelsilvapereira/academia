import Link from "next/link";
import { Cabecalho } from "@/components/cabecalho";
import { Exportar } from "@/components/exportar";
import { exigirUsuario } from "@/lib/auth";
import { alunosEmRisco, DIAS_RISCO } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { formatarData, formatarTelefone, hojeISO, plural } from "@/lib/format";
import { pode } from "@/lib/permissoes";

export default async function RiscoPage() {
  const usuario = await exigirUsuario();
  const risco = alunosEmRisco(getDb(), hojeISO());

  return (
    <>
      <Cabecalho titulo="Alunos em risco">
        {pode(usuario.perfil, "relatorios.exportar") ? <Exportar relatorio="risco" /> : null}
      </Cabecalho>
      <p className="muted" style={{ marginTop: -20, marginBottom: 28 }}>
        Têm matrícula válida, mas não treinam há mais de {DIAS_RISCO} dias. Quem para de vir costuma cancelar: vale
        uma mensagem do instrutor. {plural(risco.length, "aluno", "alunos")}.
      </p>
      <div className="tabela">
        <table>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Último treino</th>
              <th>Dias sem treinar</th>
              <th>Instrutor</th>
              <th>Telefone</th>
            </tr>
          </thead>
          <tbody>
            {risco.length === 0 ? (
              <tr>
                <td className="empty" colSpan={5}>
                  Nenhum aluno em risco agora.
                </td>
              </tr>
            ) : (
              risco.map((r) => (
                <tr key={r.id}>
                  <td data-label="Aluno">
                    <Link href={`/alunos/${r.id}#frequencia`} className="name sublinhado-hover">
                      {r.nome}
                    </Link>
                    <span className="sub">{r.plano_nome}</span>
                  </td>
                  <td data-label="Último treino">{r.ultima_presenca ? formatarData(r.ultima_presenca) : "Nunca veio"}</td>
                  <td data-label="Dias sem treinar" className="mono">
                    {r.dias_sem_treinar}
                  </td>
                  <td data-label="Instrutor">{r.instrutor_nome ?? "—"}</td>
                  <td data-label="Telefone">{formatarTelefone(r.telefone)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
