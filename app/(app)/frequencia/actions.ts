"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { buscarAluno, capacidadeMaxima, quemEstaDentro } from "@/lib/consultas";
import { getDb } from "@/lib/db";
import { agoraHora, hojeISO } from "@/lib/format";
import { ehViolacaoUnica, texto, type FormState, type ResultadoAcao, type ResultadoExclusao } from "@/lib/form";
import { excluirComDesfazer } from "@/lib/lixeira";

export type ResultadoCheckin = ResultadoAcao & { nome?: string; aviso?: string };

function atualizar() {
  revalidatePath("/frequencia");
  revalidatePath("/painel");
}

/** Check-in rápido: pelo id (lista de busca) ou pelo código da carteirinha (QR code / leitor). */
export async function registrarEntrada(alvo: { alunoId?: number; codigo?: string }): Promise<ResultadoCheckin> {
  const usuario = await exigirPermissao("frequencia.registrar");
  const db = getDb();
  const hoje = hojeISO();

  let alunoId = alvo.alunoId ?? 0;
  if (!alunoId && alvo.codigo) {
    const r = db.prepare("SELECT id FROM aluno WHERE codigo = ?").get(alvo.codigo.trim().toUpperCase()) as { id: number } | undefined;
    if (!r) return { ok: false, mensagem: `Nenhum aluno com o código ${alvo.codigo.trim().toUpperCase()}.` };
    alunoId = r.id;
  }
  const aluno = buscarAluno(db, alunoId, hoje);
  if (!aluno) return { ok: false, mensagem: "Aluno não encontrado." };
  if (aluno.situacao === "inativo") return { ok: false, mensagem: `${aluno.nome} está inativo. Reative o cadastro para liberar a entrada.` };
  if (aluno.situacao === "vencido") return { ok: false, mensagem: `A matrícula de ${aluno.nome} está vencida. Renove para liberar a entrada.` };

  const dentro = quemEstaDentro(db, hoje).length;
  const capacidade = capacidadeMaxima(db);
  if (dentro >= capacidade) return { ok: false, mensagem: `Academia lotada (${dentro} de ${capacidade}). Registre saídas antes de novas entradas.` };

  try {
    // A restrição UNIQUE (aluno_id, data) garante uma entrada por dia, mesmo com cliques duplos.
    const id = Number(db.prepare("INSERT INTO presenca (aluno_id, data, hora) VALUES (?, ?, ?)").run(aluno.id, hoje, agoraHora()).lastInsertRowid);
    auditar(db, usuario, "entrada", "presenca", id, `Entrada de ${aluno.nome}`);
  } catch (e) {
    if (ehViolacaoUnica(e)) return { ok: false, mensagem: `${aluno.nome} já registrou entrada hoje.` };
    return { ok: false, mensagem: "Não foi possível registrar agora. Tente novamente." };
  }

  atualizar();
  return {
    ok: true,
    nome: aluno.nome,
    mensagem: `Entrada de ${aluno.nome} registrada.`,
    aviso: aluno.situacao === "pendente" ? `Atenção: ${aluno.nome} tem pagamento pendente.` : undefined,
  };
}

export async function registrarSaida(presencaId: number): Promise<ResultadoAcao> {
  const usuario = await exigirPermissao("frequencia.registrar");
  const db = getDb();
  const p = db
    .prepare("SELECT pr.id, pr.hora, a.nome FROM presenca pr JOIN aluno a ON a.id = pr.aluno_id WHERE pr.id = ? AND pr.saida IS NULL")
    .get(presencaId) as { id: number; hora: string; nome: string } | undefined;
  if (!p) return { ok: false, mensagem: "Essa entrada já tem saída registrada." };
  const agora = agoraHora();
  db.prepare("UPDATE presenca SET saida = ? WHERE id = ?").run(agora < p.hora ? p.hora : agora, presencaId);
  auditar(db, usuario, "saida", "presenca", presencaId, `Saída de ${p.nome}`);
  atualizar();
  return { ok: true, mensagem: `Saída de ${p.nome} registrada.` };
}

export async function removerEntrada(id: number): Promise<ResultadoExclusao> {
  const usuario = await exigirPermissao("frequencia.registrar");
  const db = getDb();
  const p = db.prepare("SELECT a.nome FROM presenca pr JOIN aluno a ON a.id = pr.aluno_id WHERE pr.id = ?").get(id) as { nome: string } | undefined;
  if (!p) return { ok: false, mensagem: "Essa entrada não existe mais." };
  const desfazer = excluirComDesfazer(db, "presenca", id, `entrada de ${p.nome}`, usuario.id);
  auditar(db, usuario, "excluir", "presenca", id, `Removeu a entrada de ${p.nome}`);
  atualizar();
  return { ok: true, mensagem: `Entrada de ${p.nome} removida.`, desfazer: desfazer ?? undefined };
}

export async function salvarCapacidade(_estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("config.editar");
  const n = Number(texto(form, "capacidade"));
  if (!Number.isInteger(n) || n < 1 || n > 2000) return { erros: { capacidade: "De 1 a 2000 pessoas." }, valores: { capacidade: texto(form, "capacidade") } };
  const db = getDb();
  db.prepare("INSERT INTO config (chave, valor) VALUES ('capacidade_maxima', ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor").run(String(n));
  auditar(db, usuario, "editar", "config", null, `Capacidade máxima alterada para ${n}`);
  atualizar();
  return { ok: true, mensagem: "Capacidade salva." };
}
