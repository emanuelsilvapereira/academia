"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { EMAIL_RE } from "@/lib/format";
import { texto, type FormState } from "@/lib/form";
import { limparTexto } from "@/lib/pix";
import { soDigitos } from "@/lib/validacao";

/** Aceita os tipos de chave Pix: CPF/CNPJ, celular (+55...), e-mail ou chave aleatória. */
function chaveValida(chave: string): boolean {
  if (EMAIL_RE.test(chave) && chave.length <= 77) return true;
  if (/^\+55\d{10,11}$/.test(chave)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)) return true;
  const d = soDigitos(chave);
  return d === chave && (d.length === 11 || d.length === 14);
}

export async function salvarPix(_estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("config.editar");
  const valores = { chave: texto(form, "chave"), nome: texto(form, "nome"), cidade: texto(form, "cidade") };
  const erros: Record<string, string> = {};
  if (!chaveValida(valores.chave)) erros.chave = "Use CPF/CNPJ (só números), celular (+5511...), e-mail ou chave aleatória.";
  if (limparTexto(valores.nome, 25).length < 3) erros.nome = "Nome do recebedor (como aparece no banco), até 25 letras.";
  if (limparTexto(valores.cidade, 15).length < 2) erros.cidade = "Cidade da conta, até 15 letras.";
  if (Object.keys(erros).length) return { erros, valores };

  const db = getDb();
  const salvar = db.prepare("INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor");
  db.transaction(() => {
    salvar.run("pix_chave", valores.chave);
    salvar.run("pix_nome", limparTexto(valores.nome, 25));
    salvar.run("pix_cidade", limparTexto(valores.cidade, 15));
  })();
  auditar(db, usuario, "editar", "config", null, `Alterou a chave Pix da academia para ${valores.chave}`);
  revalidatePath("/financeiro");
  revalidatePath("/aluno", "layout");
  return { ok: true, mensagem: "Pix da academia salvo." };
}
