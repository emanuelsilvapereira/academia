"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { agoraCompleto, hojeISO } from "@/lib/format";
import { semErros, texto, type FormState, type ResultadoAcao, type ResultadoExclusao } from "@/lib/form";
import { excluirComDesfazer } from "@/lib/lixeira";
import { dataBRparaISO } from "@/lib/validacao";

function atualizarTelas() {
  revalidatePath("/avisos");
  revalidatePath("/aluno", "layout");
}

export async function criarAviso(_estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("avisos.editar");
  const valores = {
    titulo: texto(form, "titulo").replace(/\s+/g, " "),
    texto: texto(form, "texto"),
    expira_em: texto(form, "expira_em"),
    fixado: texto(form, "fixado") === "on" ? "on" : "",
  };
  const erros: Record<string, string> = {};
  if (valores.titulo.length < 3 || valores.titulo.length > 80) erros.titulo = "De 3 a 80 caracteres.";
  if (valores.texto.length < 3 || valores.texto.length > 600) erros.texto = "De 3 a 600 caracteres.";
  const expira = valores.expira_em ? dataBRparaISO(valores.expira_em) : null;
  if (valores.expira_em && !expira) erros.expira_em = "Data no formato dd/mm/aaaa.";
  else if (expira && expira < hojeISO()) erros.expira_em = "A data já passou.";
  if (!semErros(erros)) return { erros, valores };

  const db = getDb();
  const id = Number(
    db
      .prepare("INSERT INTO aviso (titulo, texto, criado_em, expira_em, fixado, autor_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(valores.titulo, valores.texto, agoraCompleto(), expira, valores.fixado ? 1 : 0, usuario.id).lastInsertRowid,
  );
  auditar(db, usuario, "criar", "aviso", id, `Publicou o aviso "${valores.titulo}"`);
  atualizarTelas();
  return { ok: true, mensagem: "Aviso publicado no portal do aluno." };
}

export async function alternarFixado(id: number): Promise<ResultadoAcao> {
  const usuario = await exigirPermissao("avisos.editar");
  const db = getDb();
  const a = db.prepare("SELECT titulo, fixado FROM aviso WHERE id = ?").get(id) as { titulo: string; fixado: number } | undefined;
  if (!a) return { ok: false, mensagem: "Aviso não encontrado." };
  db.prepare("UPDATE aviso SET fixado = ? WHERE id = ?").run(a.fixado ? 0 : 1, id);
  auditar(db, usuario, "editar", "aviso", id, `${a.fixado ? "Desafixou" : "Fixou"} o aviso "${a.titulo}"`);
  atualizarTelas();
  return { ok: true, mensagem: a.fixado ? "Aviso desafixado." : "Aviso fixado no topo." };
}

export async function excluirAviso(id: number): Promise<ResultadoExclusao> {
  const usuario = await exigirPermissao("avisos.editar");
  const db = getDb();
  const a = db.prepare("SELECT titulo FROM aviso WHERE id = ?").get(id) as { titulo: string } | undefined;
  if (!a) return { ok: false, mensagem: "Aviso não encontrado." };
  const desfazer = excluirComDesfazer(db, "aviso", id, a.titulo, usuario.id);
  auditar(db, usuario, "excluir", "aviso", id, `Excluiu o aviso "${a.titulo}"`);
  atualizarTelas();
  return { ok: true, mensagem: "Aviso excluído.", desfazer: desfazer ?? undefined };
}
