import { auditar } from "@/lib/auditoria";
import { usuarioAtual } from "@/lib/auth";
import { gerarCsv } from "@/lib/csv";
import { getDb } from "@/lib/db";
import { hojeISO } from "@/lib/format";
import { gerarPdf } from "@/lib/pdf";
import { pode } from "@/lib/permissoes";
import { RELATORIOS } from "@/lib/relatorios";

// Baixa um relatório: /exportar/alunos?formato=csv (ou pdf), com os mesmos filtros da tela.
export async function GET(request: Request, ctx: { params: Promise<{ relatorio: string }> }) {
  const usuario = await usuarioAtual();
  if (!usuario) return new Response("Faça login para exportar.", { status: 401 });

  const { relatorio } = await ctx.params;
  const def = Object.hasOwn(RELATORIOS, relatorio) ? RELATORIOS[relatorio] : undefined;
  if (!def) return new Response("Relatório não encontrado.", { status: 404 });
  if (!pode(usuario.perfil, "relatorios.exportar") && !pode(usuario.perfil, "auditoria.ver")) {
    return new Response("Sem permissão para exportar.", { status: 403 });
  }
  if (!pode(usuario.perfil, def.permissao)) return new Response("Sem permissão para este relatório.", { status: 403 });

  const params = new URL(request.url).searchParams;
  const formato = params.get("formato") === "pdf" ? "pdf" : "csv";
  const db = getDb();
  const hoje = hojeISO();
  const r = def.montar(db, params, hoje);
  auditar(db, usuario, "exportar", "relatorio", null, `Exportou "${r.titulo}" em ${formato.toUpperCase()} (${r.linhas.length} linhas)`);

  const nome = `pulso-${r.arquivo}-${hoje}.${formato}`;
  const cabecalhos = {
    "Content-Disposition": `attachment; filename="${nome}"`,
    "Cache-Control": "no-store",
  };
  if (formato === "pdf") {
    const pdf = gerarPdf({ titulo: r.titulo, subtitulo: r.subtitulo, colunas: r.colunas, linhas: r.linhas });
    return new Response(pdf as BodyInit, { headers: { ...cabecalhos, "Content-Type": "application/pdf" } });
  }
  return new Response(gerarCsv(r.colunas.map((c) => c.titulo), r.linhas), {
    headers: { ...cabecalhos, "Content-Type": "text/csv; charset=utf-8" },
  });
}
