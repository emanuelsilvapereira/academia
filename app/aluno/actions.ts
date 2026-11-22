"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar } from "@/lib/auditoria";
import { ipDaRequisicao } from "@/lib/auth";
import { alunoAtual, criarSessaoAluno, encerrarSessaoAluno, exigirAluno } from "@/lib/auth-aluno";
import { getDb } from "@/lib/db";
import { cancelarReserva, reservarAula } from "@/lib/aulas";
import { agoraCompleto, agoraHora, brl, EMAIL_RE, formatarData, hojeISO } from "@/lib/format";
import { texto, type FormState, type ResultadoAcao } from "@/lib/form";
import { registrarTentativa, segundosDeBloqueio } from "@/lib/login";
import { hashPassword, verifyPassword } from "@/lib/password";
import { cpfValido, dataBRparaISO, paraDecimal, soDigitos } from "@/lib/validacao";

const LETRAS = ["A", "B", "C", "D", "E"];

function mensagemBloqueio(segundos: number): string {
  const minutos = Math.ceil(segundos / 60);
  return `Muitas tentativas sem sucesso. Tente de novo em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`;
}

function validarSenhaNova(senha: string, confirmacao: string, erros: Record<string, string>) {
  if (senha.length < 6) erros.senha = "A senha precisa ter pelo menos 6 caracteres.";
  else if (senha.length > 72) erros.senha = "A senha pode ter no máximo 72 caracteres.";
  else if (senha !== confirmacao) erros.confirmacao = "As senhas não são iguais.";
}

const lerSenha = (dados: FormData, campo: string) => (typeof dados.get(campo) === "string" ? (dados.get(campo) as string) : "");

/** Entrar no portal com e-mail e senha. */
export async function entrarAluno(_estado: FormState, dados: FormData): Promise<FormState> {
  const email = texto(dados, "email").toLowerCase();
  const senha = lerSenha(dados, "senha");
  const erros: Record<string, string> = {};
  if (!EMAIL_RE.test(email)) erros.email = "Digite um e-mail válido.";
  if (!senha) erros.senha = "Informe sua senha.";
  if (Object.keys(erros).length) return { erros, valores: { email } };

  const db = getDb();
  const ip = await ipDaRequisicao();
  const agora = Math.floor(Date.now() / 1000);
  const chave = `aluno:${email}`; // contagem de erros separada da equipe
  const espera = segundosDeBloqueio(db, chave, ip, agora);
  if (espera > 0) return { mensagem: mensagemBloqueio(espera), valores: { email } };

  const aluno = db.prepare("SELECT id, email, ativo, senha_hash FROM aluno WHERE email = ?").get(email) as
    | { id: number; email: string; ativo: number; senha_hash: string | null }
    | undefined;

  if (aluno && aluno.senha_hash === null) {
    return { mensagem: "Você ainda não criou sua senha. Use o primeiro acesso, logo abaixo.", valores: { email } };
  }
  if (!aluno || !verifyPassword(senha, aluno.senha_hash!)) {
    registrarTentativa(db, chave, ip, false, agora);
    auditar(db, { id: null, email }, "login_falhou", "portal", aluno?.id ?? null, `Senha incorreta no portal do aluno (IP ${ip})`);
    return { mensagem: "E-mail ou senha incorretos.", valores: { email } };
  }
  if (!aluno.ativo) return { mensagem: "Seu cadastro está inativo. Fale com a recepção da academia.", valores: { email } };

  registrarTentativa(db, chave, ip, true, agora);
  auditar(db, { id: null, email: aluno.email }, "login", "portal", aluno.id, `Aluno entrou no portal (IP ${ip})`);
  await criarSessaoAluno(aluno.id);
  redirect("/aluno");
}

/** Primeiro acesso: o aluno confirma CPF e data de nascimento (que estão no cadastro) e cria a senha. */
export async function primeiroAcesso(_estado: FormState, dados: FormData): Promise<FormState> {
  const cpf = soDigitos(texto(dados, "cpf"));
  const nascimentoBR = texto(dados, "nascimento");
  const senha = lerSenha(dados, "senha");
  const confirmacao = lerSenha(dados, "confirmacao");
  const valores = { cpf, nascimento: nascimentoBR };

  const erros: Record<string, string> = {};
  if (!cpfValido(cpf)) erros.cpf = "Digite um CPF válido.";
  const nascimento = dataBRparaISO(nascimentoBR);
  if (!nascimento) erros.nascimento = "Digite a data no formato dd/mm/aaaa.";
  validarSenhaNova(senha, confirmacao, erros);
  if (Object.keys(erros).length) return { erros, valores };

  const db = getDb();
  const ip = await ipDaRequisicao();
  const agora = Math.floor(Date.now() / 1000);
  const chave = `aluno-cpf:${cpf}`;
  const espera = segundosDeBloqueio(db, chave, ip, agora);
  if (espera > 0) return { mensagem: mensagemBloqueio(espera), valores };

  const aluno = db.prepare("SELECT id, email, ativo, nascimento, senha_hash FROM aluno WHERE cpf = ?").get(cpf) as
    | { id: number; email: string; ativo: number; nascimento: string; senha_hash: string | null }
    | undefined;

  // Mensagem genérica: não revela se o CPF está cadastrado.
  if (!aluno || aluno.nascimento !== nascimento) {
    registrarTentativa(db, chave, ip, false, agora);
    return { mensagem: "CPF ou data de nascimento não conferem com o cadastro. Confira ou fale com a recepção.", valores };
  }
  if (!aluno.ativo) return { mensagem: "Seu cadastro está inativo. Fale com a recepção da academia.", valores };
  if (aluno.senha_hash !== null) {
    return { mensagem: "Você já criou sua senha. Entre com seu e-mail e senha (ou peça à recepção para redefinir o acesso).", valores };
  }

  registrarTentativa(db, chave, ip, true, agora);
  db.prepare("UPDATE aluno SET senha_hash = ? WHERE id = ?").run(hashPassword(senha), aluno.id);
  auditar(db, { id: null, email: aluno.email }, "criar", "portal", aluno.id, "Aluno criou a senha do portal (primeiro acesso)");
  await criarSessaoAluno(aluno.id);
  redirect("/aluno");
}

export async function sairAluno(): Promise<void> {
  const aluno = await alunoAtual();
  if (aluno) auditar(getDb(), { id: null, email: aluno.email }, "logout", "portal", aluno.id, "Aluno saiu do portal");
  await encerrarSessaoAluno();
  redirect("/aluno/entrar");
}

export async function alterarSenhaAluno(_estado: FormState, dados: FormData): Promise<FormState> {
  const aluno = await exigirAluno();
  const atual = lerSenha(dados, "atual");
  const senha = lerSenha(dados, "senha");
  const confirmacao = lerSenha(dados, "confirmacao");
  const erros: Record<string, string> = {};
  const db = getDb();
  const { senha_hash } = db.prepare("SELECT senha_hash FROM aluno WHERE id = ?").get(aluno.id) as { senha_hash: string };
  if (!verifyPassword(atual, senha_hash)) erros.atual = "A senha atual está incorreta.";
  validarSenhaNova(senha, confirmacao, erros);
  if (Object.keys(erros).length) return { erros };

  db.prepare("UPDATE aluno SET senha_hash = ? WHERE id = ?").run(hashPassword(senha), aluno.id);
  auditar(db, { id: null, email: aluno.email }, "editar", "portal", aluno.id, "Aluno trocou a senha do portal");
  return { ok: true, mensagem: "Senha alterada." };
}

/** O aluno marca (ou desmarca) que fez a ficha hoje. */
export async function alternarTreinoFeito(letra: string): Promise<ResultadoAcao> {
  const aluno = await exigirAluno();
  if (!LETRAS.includes(letra)) return { ok: false, mensagem: "Ficha inválida." };
  const db = getDb();
  const ficha = db.prepare("SELECT 1 FROM ficha WHERE aluno_id = ? AND letra = ?").get(aluno.id, letra);
  if (!ficha) return { ok: false, mensagem: "Você não tem essa ficha." };
  const hoje = hojeISO();
  const apagou = db.prepare("DELETE FROM treino_feito WHERE aluno_id = ? AND data = ? AND letra = ?").run(aluno.id, hoje, letra).changes;
  if (!apagou) db.prepare("INSERT INTO treino_feito (aluno_id, data, letra) VALUES (?, ?, ?)").run(aluno.id, hoje, letra);
  revalidatePath("/aluno", "layout");
  return { ok: true, mensagem: apagou ? `Ficha ${letra} desmarcada.` : `Ficha ${letra} concluída. Bom treino!` };
}

/** O aluno avisa que pagou a parcela por Pix. A recepção confere no extrato e registra o pagamento. */
export async function informarPix(pagamentoId: number): Promise<ResultadoAcao> {
  const aluno = await exigirAluno();
  const db = getDb();
  const p = db
    .prepare(
      `SELECT pg.id, pg.parcela, pg.valor_centavos, pg.pago_em, pg.informado_em FROM pagamento pg JOIN matricula m ON m.id = pg.matricula_id
       WHERE pg.id = ? AND m.aluno_id = ?`,
    )
    .get(pagamentoId, aluno.id) as { id: number; parcela: number; valor_centavos: number; pago_em: string | null; informado_em: string | null } | undefined;
  if (!p) return { ok: false, mensagem: "Parcela não encontrada." };
  if (p.pago_em) return { ok: false, mensagem: "Essa parcela já está paga." };
  if (p.informado_em) return { ok: true, mensagem: "Você já avisou esse pagamento. A recepção vai confirmar." };
  db.prepare("UPDATE pagamento SET informado_em = ? WHERE id = ? AND pago_em IS NULL").run(agoraCompleto(), p.id);
  auditar(db, { id: null, email: aluno.email }, "editar", "pagamento", p.id, `Aluno informou pagamento por Pix da parcela ${p.parcela} (${brl(p.valor_centavos)})`);
  revalidatePath("/aluno", "layout");
  revalidatePath("/financeiro");
  return { ok: true, mensagem: "Pagamento informado. Assim que a recepção conferir, a parcela aparece como paga." };
}

/** Reservar ou cancelar a vaga numa aula coletiva. */
export async function alternarReserva(aulaId: number, data: string, reservar: boolean): Promise<ResultadoAcao> {
  const aluno = await exigirAluno();
  const db = getDb();
  const hoje = hojeISO();
  const agora = agoraHora();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { ok: false, mensagem: "Data inválida." };
  const nome = (db.prepare("SELECT nome FROM aula WHERE id = ?").get(aulaId) as { nome: string } | undefined)?.nome ?? "aula";

  if (reservar) {
    // Matrícula vencida ou cadastro inativo não reservam (a entrada seria bloqueada na recepção).
    const situacao = db
      .prepare(
        `SELECT EXISTS (SELECT 1 FROM matricula m WHERE m.aluno_id = ? AND m.cancelada_em IS NULL AND m.inicio <= ? AND m.fim >= ?) AS ok`,
      )
      .get(aluno.id, data, data) as { ok: number };
    if (!situacao.ok) return { ok: false, mensagem: "Sua matrícula não cobre essa data. Renove o plano na recepção para reservar." };
    const r = reservarAula(db, aluno.id, aulaId, data, hoje, agora, agoraCompleto());
    if (!r.ok) return { ok: false, mensagem: r.motivo };
    revalidatePath("/aluno", "layout");
    return { ok: true, mensagem: `Vaga reservada: ${nome} em ${formatarData(data)}.` };
  }
  const r = cancelarReserva(db, aluno.id, aulaId, data, hoje, agora);
  if (!r.ok) return { ok: false, mensagem: r.motivo };
  revalidatePath("/aluno", "layout");
  return { ok: true, mensagem: `Reserva cancelada: ${nome} em ${formatarData(data)}.` };
}

/** O aluno anota a carga que usou hoje num exercício (uma anotação por exercício por dia; anotar de novo substitui). */
export async function registrarCarga(exercicioId: number, _estado: FormState, dados: FormData): Promise<FormState> {
  const aluno = await exigirAluno();
  const valores = { carga_kg: texto(dados, "carga_kg"), repeticoes: texto(dados, "repeticoes") };
  const erros: Record<string, string> = {};
  const carga = paraDecimal(valores.carga_kg);
  if (carga === null || Number.isNaN(carga) || carga < 0 || carga > 500) erros.carga_kg = "Informe a carga em kg (0 a 500).";
  const reps = valores.repeticoes ? Number(valores.repeticoes) : null;
  if (reps !== null && (!Number.isInteger(reps) || reps < 1 || reps > 100)) erros.repeticoes = "De 1 a 100.";
  if (Object.keys(erros).length) return { erros, valores };

  const db = getDb();
  if (!db.prepare("SELECT 1 FROM exercicio WHERE id = ?").get(exercicioId)) return { mensagem: "Exercício não encontrado." };
  db.prepare(
    `INSERT INTO carga_registro (aluno_id, exercicio_id, data, carga_kg, repeticoes) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (aluno_id, exercicio_id, data) DO UPDATE SET carga_kg = excluded.carga_kg, repeticoes = excluded.repeticoes`,
  ).run(aluno.id, exercicioId, hojeISO(), carga, reps);
  revalidatePath("/aluno", "layout");
  return { ok: true, mensagem: `Carga de hoje anotada: ${String(carga).replace(".", ",")} kg.` };
}

/** Apaga uma anotação de carga do próprio aluno. */
export async function apagarCarga(registroId: number): Promise<ResultadoAcao> {
  const aluno = await exigirAluno();
  const r = getDb().prepare("DELETE FROM carga_registro WHERE id = ? AND aluno_id = ?").run(registroId, aluno.id);
  revalidatePath("/aluno", "layout");
  return r.changes ? { ok: true, mensagem: "Anotação apagada." } : { ok: false, mensagem: "Anotação não encontrada." };
}