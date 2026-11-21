"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { brl } from "@/lib/format";
import { ehViolacaoChave, ehViolacaoUnica, semErros, texto, type FormState, type ResultadoExclusao } from "@/lib/form";
import { excluirComDesfazer } from "@/lib/lixeira";
import { paraCentavos } from "@/lib/validacao";

function ler(dados: FormData) {
  return { nome: texto(dados, "nome"), preco: texto(dados, "preco"), meses: texto(dados, "meses") };
}
type Valores = ReturnType<typeof ler>;

function validar(v: Valores, idAtual: number) {
  const erros: Record<string, string> = {};
  if (v.nome.length < 3) erros.nome = "O nome precisa ter pelo menos 3 letras.";
  else if (v.nome.length > 30) erros.nome = "O nome pode ter no máximo 30 caracteres.";
  else if (getDb().prepare("SELECT id FROM plano WHERE nome = ? AND id <> ?").get(v.nome, idAtual)) {
    erros.nome = "Já existe um plano com esse nome.";
  }

  const centavos = paraCentavos(v.preco);
  if (centavos === null || centavos <= 0) erros.preco = "Informe um valor maior que zero (ex.: 99,90).";
  else if (centavos > 10_000_000) erros.preco = "Valor alto demais.";

  const meses = Number(v.meses);
  if (!Number.isInteger(meses) || meses < 1 || meses > 24) erros.meses = "A duração deve ser de 1 a 24 meses.";

  return { erros, centavos: centavos ?? 0, meses };
}

export async function criarPlano(_estado: FormState, dados: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("planos.editar");
  const v = ler(dados);
  const { erros, centavos, meses } = validar(v, 0);
  if (!semErros(erros)) return { erros, valores: v };

  const db = getDb();
  try {
    const id = Number(db.prepare("INSERT INTO plano (nome, preco_centavos, meses) VALUES (?, ?, ?)").run(v.nome, centavos, meses).lastInsertRowid);
    auditar(db, usuario, "criar", "plano", id, `Criou o plano ${v.nome} (${brl(centavos)}, ${meses} meses)`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { erros: { nome: "Já existe um plano com esse nome." }, valores: v };
    return { mensagem: "Não foi possível salvar agora. Tente novamente.", valores: v };
  }
  revalidatePath("/planos");
  redirect("/planos");
}

export async function atualizarPlano(id: number, _estado: FormState, dados: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("planos.editar");
  const v = ler(dados);
  const { erros, centavos, meses } = validar(v, id);
  if (!semErros(erros)) return { erros, valores: v };

  const db = getDb();
  const antes = db.prepare("SELECT nome, preco_centavos, meses FROM plano WHERE id = ?").get(id) as { nome: string; preco_centavos: number; meses: number } | undefined;
  if (!antes) return { mensagem: "Esse plano não existe mais.", valores: v };
  try {
    // Matrículas já feitas guardam o próprio valor: mudar o preço vale só para as próximas.
    db.prepare("UPDATE plano SET nome = ?, preco_centavos = ?, meses = ? WHERE id = ?").run(v.nome, centavos, meses, id);
    auditar(db, usuario, "editar", "plano", id,
      `Editou o plano ${antes.nome}: ${brl(antes.preco_centavos)}/${antes.meses}m → ${v.nome} ${brl(centavos)}/${meses}m`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { erros: { nome: "Já existe um plano com esse nome." }, valores: v };
    return { mensagem: "Não foi possível salvar agora. Tente novamente.", valores: v };
  }
  revalidatePath("/", "layout");
  redirect("/planos");
}

export async function excluirPlano(id: number): Promise<ResultadoExclusao> {
  const usuario = await exigirPermissao("planos.editar");
  const db = getDb();
  const plano = db.prepare("SELECT nome FROM plano WHERE id = ?").get(id) as { nome: string } | undefined;
  if (!plano) return { ok: false, mensagem: "Esse plano não existe mais." };
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM matricula WHERE plano_id = ?").get(id) as { n: number };
  if (n > 0) {
    return { ok: false, mensagem: `Não dá para excluir: o plano aparece em ${n} ${n === 1 ? "matrícula" : "matrículas"} (inclusive antigas).` };
  }
  try {
    const desfazer = excluirComDesfazer(db, "plano", id, plano.nome, usuario.id);
    auditar(db, usuario, "excluir", "plano", id, `Excluiu o plano ${plano.nome}`);
    revalidatePath("/planos");
    return { ok: true, mensagem: `Plano ${plano.nome} excluído.`, desfazer: desfazer ?? undefined };
  } catch (e) {
    // A chave estrangeira (ON DELETE RESTRICT) também protege caso alguém passe pela checagem acima.
    if (ehViolacaoChave(e)) return { ok: false, mensagem: "Não dá para excluir: o plano está em uso." };
    return { ok: false, mensagem: "Não foi possível excluir este plano." };
  }
}
