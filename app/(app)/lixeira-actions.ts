"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "@/lib/auditoria";
import { exigirUsuario } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { ResultadoAcao } from "@/lib/form";
import { restaurar } from "@/lib/lixeira";

/** Botão "Desfazer" dos avisos: recoloca o que acabou de ser excluído. */
export async function desfazerExclusao(lixeiraId: number): Promise<ResultadoAcao> {
  const usuario = await exigirUsuario();
  const db = getDb();

  // Só quem excluiu (ou um administrador) pode desfazer.
  const item = db.prepare("SELECT usuario_id FROM lixeira WHERE id = ?").get(lixeiraId) as { usuario_id: number | null } | undefined;
  if (!item || (item.usuario_id !== usuario.id && usuario.perfil !== "admin")) {
    return { ok: false, mensagem: "Não há nada para desfazer." };
  }

  const r = restaurar(db, lixeiraId);
  if (!r.ok) return { ok: false, mensagem: r.motivo };

  auditar(db, usuario, "desfazer", r.entidade, r.entidadeId, `Desfez a exclusão: ${r.descricao}`);
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Exclusão desfeita." };
}
