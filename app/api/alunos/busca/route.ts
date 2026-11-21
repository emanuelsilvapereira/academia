import { usuarioAtual } from "@/lib/auth";
import { CTE_ALUNOS } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { hojeISO } from "@/lib/format";
import { pode } from "@/lib/permissoes";

// Busca usada pelo check-in rápido: devolve até 8 alunos pelo nome, código da carteirinha ou CPF.
export async function GET(request: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ erro: "Faça login." }, { status: 401 });
  if (!pode(usuario.perfil, "frequencia.registrar")) return Response.json({ erro: "Sem permissão." }, { status: 403 });

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ alunos: [] });

  const hoje = hojeISO();
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const digitos = q.replace(/\D/g, "");
  const alunos = getDb()
    .prepare(
      `${CTE_ALUNOS}
       SELECT av.id, av.nome, av.codigo, av.situacao, av.plano_nome,
              EXISTS (SELECT 1 FROM presenca p WHERE p.aluno_id = av.id AND p.data = @hoje) AS ja_entrou
       FROM av
       WHERE av.nome LIKE @like ESCAPE '\\' OR av.codigo = upper(@q)
          OR (length(@digitos) >= 4 AND av.cpf LIKE @digitos || '%')
       ORDER BY av.situacao = 'inativo', (av.nome LIKE @comeco ESCAPE '\\') DESC, av.nome
       LIMIT 8`,
    )
    .all({ hoje, like, q, digitos, comeco: `${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` });
  return Response.json({ alunos }, { headers: { "Cache-Control": "no-store" } });
}
