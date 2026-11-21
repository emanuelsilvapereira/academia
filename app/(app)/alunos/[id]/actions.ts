"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { brl, FORMA_ROTULO, formatarData, hojeISO } from "@/lib/format";
import { ehViolacaoUnica, semErros, texto, type FormState, type ResultadoAcao, type ResultadoExclusao } from "@/lib/form";
import { excluirComDesfazer } from "@/lib/lixeira";
import { renovarMatricula } from "@/lib/matriculas";
import { dataBRparaISO, dataISOValida, paraDecimal } from "@/lib/validacao";

function atualizar(alunoId: number) {
  revalidatePath(`/alunos/${alunoId}`);
  revalidatePath("/", "layout");
}

// ---------- Matrícula ----------

export async function renovar(alunoId: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("alunos.editar");
  const db = getDb();
  const planoId = Number(texto(form, "plano_id"));
  const auto = texto(form, "renovacao_automatica") === "on";
  const plano = db.prepare("SELECT nome FROM plano WHERE id = ?").get(planoId) as { nome: string } | undefined;
  if (!plano) return { erros: { plano_id: "Escolha um plano." } };
  const aluno = db.prepare("SELECT nome, ativo FROM aluno WHERE id = ?").get(alunoId) as { nome: string; ativo: number } | undefined;
  if (!aluno) return { mensagem: "Esse aluno não existe mais." };
  if (!aluno.ativo) return { mensagem: "Reative o aluno (em Editar) antes de renovar." };

  const hoje = hojeISO();
  const futura = db
    .prepare("SELECT 1 FROM matricula WHERE aluno_id = ? AND cancelada_em IS NULL AND inicio > ?")
    .get(alunoId, hoje);
  if (futura) return { mensagem: "Já existe uma renovação agendada para este aluno." };

  db.transaction(() => {
    const id = renovarMatricula(db, alunoId, planoId, auto, hoje);
    const m = db.prepare("SELECT inicio, fim FROM matricula WHERE id = ?").get(id) as { inicio: string; fim: string };
    auditar(db, usuario, "renovar", "matricula", id, `Renovou ${aluno.nome}: ${plano.nome}, de ${formatarData(m.inicio)} a ${formatarData(m.fim)}`);
  })();
  atualizar(alunoId);
  return { ok: true, mensagem: "Matrícula renovada. As novas parcelas já aparecem em Pagamentos." };
}

export async function cancelarMatricula(alunoId: number, matriculaId: number): Promise<ResultadoAcao> {
  const usuario = await exigirPermissao("alunos.editar");
  const db = getDb();
  const hoje = hojeISO();
  const m = db
    .prepare("SELECT m.id, a.nome FROM matricula m JOIN aluno a ON a.id = m.aluno_id WHERE m.id = ? AND m.aluno_id = ? AND m.cancelada_em IS NULL")
    .get(matriculaId, alunoId) as { id: number; nome: string } | undefined;
  if (!m) return { ok: false, mensagem: "Essa matrícula não está ativa." };

  db.transaction(() => {
    // Parcelas que ainda não venceram deixam de existir; as atrasadas continuam como dívida.
    const r = db.prepare("DELETE FROM pagamento WHERE matricula_id = ? AND pago_em IS NULL AND vencimento >= ?").run(matriculaId, hoje);
    db.prepare("UPDATE matricula SET cancelada_em = ?, renovacao_automatica = 0 WHERE id = ?").run(hoje, matriculaId);
    auditar(db, usuario, "cancelar", "matricula", matriculaId, `Cancelou a matrícula de ${m.nome} (${r.changes} parcelas futuras removidas)`);
  })();
  atualizar(alunoId);
  return { ok: true, mensagem: "Matrícula cancelada." };
}

export async function alternarRenovacaoAutomatica(alunoId: number, matriculaId: number): Promise<ResultadoAcao> {
  const usuario = await exigirPermissao("alunos.editar");
  const db = getDb();
  const m = db
    .prepare("SELECT renovacao_automatica AS r FROM matricula WHERE id = ? AND aluno_id = ? AND cancelada_em IS NULL")
    .get(matriculaId, alunoId) as { r: number } | undefined;
  if (!m) return { ok: false, mensagem: "Essa matrícula não está ativa." };
  db.prepare("UPDATE matricula SET renovacao_automatica = ? WHERE id = ?").run(m.r ? 0 : 1, matriculaId);
  auditar(db, usuario, "editar", "matricula", matriculaId, `${m.r ? "Desligou" : "Ligou"} a renovação automática`);
  atualizar(alunoId);
  return { ok: true, mensagem: m.r ? "Renovação automática desligada." : "Renovação automática ligada." };
}

// ---------- Pagamentos ----------

type Parcela = { id: number; aluno_id: number; nome: string; parcela: number; valor_centavos: number; pago_em: string | null };

function buscarParcela(id: number): Parcela | undefined {
  return getDb()
    .prepare(
      `SELECT pg.id, m.aluno_id, a.nome, pg.parcela, pg.valor_centavos, pg.pago_em
       FROM pagamento pg JOIN matricula m ON m.id = pg.matricula_id JOIN aluno a ON a.id = m.aluno_id
       WHERE pg.id = ?`,
    )
    .get(id) as Parcela | undefined;
}

export async function receberPagamento(pagamentoId: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("financeiro.editar");
  const forma = texto(form, "forma");
  const data = texto(form, "data") || hojeISO();
  const p = buscarParcela(pagamentoId);
  if (!p) return { mensagem: "Parcela não encontrada." };
  if (p.pago_em) return { mensagem: "Essa parcela já foi paga." };
  if (!(forma in FORMA_ROTULO)) return { erros: { forma: "Escolha a forma." } };
  if (!dataISOValida(data) || data > hojeISO()) return { erros: { data: "Data inválida." } };

  const db = getDb();
  db.prepare("UPDATE pagamento SET pago_em = ?, forma = ? WHERE id = ? AND pago_em IS NULL").run(data, forma, pagamentoId);
  auditar(db, usuario, "pagar", "pagamento", pagamentoId, `Recebeu a parcela ${p.parcela} de ${p.nome}: ${brl(p.valor_centavos)} (${FORMA_ROTULO[forma]})`);
  atualizar(p.aluno_id);
  return { ok: true, mensagem: "Pagamento registrado." };
}

export async function estornarPagamento(pagamentoId: number): Promise<ResultadoAcao> {
  const usuario = await exigirPermissao("financeiro.editar");
  const p = buscarParcela(pagamentoId);
  if (!p || !p.pago_em) return { ok: false, mensagem: "Essa parcela não está paga." };
  const db = getDb();
  db.prepare("UPDATE pagamento SET pago_em = NULL, forma = NULL WHERE id = ?").run(pagamentoId);
  auditar(db, usuario, "estornar", "pagamento", pagamentoId, `Estornou a parcela ${p.parcela} de ${p.nome}: ${brl(p.valor_centavos)}`);
  atualizar(p.aluno_id);
  return { ok: true, mensagem: "Pagamento estornado: a parcela voltou a ficar em aberto." };
}

// ---------- Avaliação física ----------

const MEDIDAS = {
  peso_kg: { rotulo: "Peso", min: 20, max: 300, obrigatorio: true },
  altura_cm: { rotulo: "Altura", min: 100, max: 250, obrigatorio: true },
  gordura_pct: { rotulo: "% de gordura", min: 2, max: 70, obrigatorio: false },
  cintura_cm: { rotulo: "Cintura", min: 30, max: 250, obrigatorio: false },
  quadril_cm: { rotulo: "Quadril", min: 30, max: 250, obrigatorio: false },
  braco_cm: { rotulo: "Braço", min: 10, max: 80, obrigatorio: false },
  coxa_cm: { rotulo: "Coxa", min: 20, max: 120, obrigatorio: false },
} as const;

export async function criarAvaliacao(alunoId: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("avaliacoes.editar");
  const db = getDb();
  const valores: Record<string, string> = { data: texto(form, "data") };
  const erros: Record<string, string> = {};
  const numeros: Record<string, number | null> = {};

  for (const [campo, regra] of Object.entries(MEDIDAS)) {
    valores[campo] = texto(form, campo);
    const n = paraDecimal(valores[campo]);
    if (n === null) {
      if (regra.obrigatorio) erros[campo] = `Informe ${regra.rotulo.toLowerCase()}.`;
      numeros[campo] = null;
    } else if (Number.isNaN(n) || n < regra.min || n > regra.max) {
      erros[campo] = `Entre ${regra.min} e ${regra.max}.`;
    } else numeros[campo] = Math.round(n * 10) / 10;
  }
  const data = dataBRparaISO(valores.data);
  if (!data || data > hojeISO()) erros.data = "Informe uma data até hoje.";
  if (!semErros(erros)) return { erros, valores };

  const aluno = db.prepare("SELECT nome, instrutor_id FROM aluno WHERE id = ?").get(alunoId) as { nome: string; instrutor_id: number | null } | undefined;
  if (!aluno) return { mensagem: "Esse aluno não existe mais." };

  try {
    const id = Number(
      db
        .prepare(
          `INSERT INTO avaliacao (aluno_id, data, peso_kg, altura_cm, gordura_pct, cintura_cm, quadril_cm, braco_cm, coxa_cm, instrutor_id)
           VALUES (@aluno_id, @data, @peso_kg, @altura_cm, @gordura_pct, @cintura_cm, @quadril_cm, @braco_cm, @coxa_cm, @instrutor_id)`,
        )
        .run({ ...numeros, aluno_id: alunoId, data, instrutor_id: usuario.instrutor_id ?? aluno.instrutor_id }).lastInsertRowid,
    );
    auditar(db, usuario, "criar", "avaliacao", id, `Registrou avaliação física de ${aluno.nome} (${formatarData(data!)})`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { erros: { data: "Já existe uma avaliação nessa data." }, valores };
    return { mensagem: "Não foi possível salvar agora.", valores };
  }
  atualizar(alunoId);
  return { ok: true, mensagem: "Avaliação registrada." };
}

export async function excluirAvaliacao(alunoId: number, avaliacaoId: number): Promise<ResultadoExclusao> {
  const usuario = await exigirPermissao("avaliacoes.editar");
  const db = getDb();
  const a = db.prepare("SELECT data FROM avaliacao WHERE id = ? AND aluno_id = ?").get(avaliacaoId, alunoId) as { data: string } | undefined;
  if (!a) return { ok: false, mensagem: "Avaliação não encontrada." };
  const desfazer = excluirComDesfazer(db, "avaliacao", avaliacaoId, `avaliação de ${formatarData(a.data)}`, usuario.id);
  auditar(db, usuario, "excluir", "avaliacao", avaliacaoId, `Excluiu a avaliação de ${formatarData(a.data)}`);
  atualizar(alunoId);
  return { ok: true, mensagem: "Avaliação excluída.", desfazer: desfazer ?? undefined };
}
