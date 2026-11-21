"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type Database from "better-sqlite3";
import { auditar } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addDias, EMAIL_RE, FORMA_ROTULO, hojeISO } from "@/lib/format";
import { ehViolacaoUnica, semErros, texto, type FormState, type ResultadoExclusao } from "@/lib/form";
import { excluirComDesfazer } from "@/lib/lixeira";
import { criarMatricula } from "@/lib/matriculas";
import { cpfValido, dataBRparaISO, dataISOValida, idade, soDigitos, telefoneValido } from "@/lib/validacao";

function lerCadastro(dados: FormData) {
  return {
    nome: texto(dados, "nome").replace(/\s+/g, " "),
    email: texto(dados, "email").toLowerCase(),
    telefone: texto(dados, "telefone"),
    cpf: texto(dados, "cpf"),
    nascimento: texto(dados, "nascimento"),
    instrutor_id: texto(dados, "instrutor_id"),
    ativo: texto(dados, "ativo"),
  };
}
type Cadastro = ReturnType<typeof lerCadastro>;

// Toda validação roda no servidor, mesmo que o navegador já tenha conferido.
function validarCadastro(db: Database.Database, v: Cadastro, idAtual: number, hoje: string) {
  const erros: Record<string, string> = {};

  if (v.nome.length < 3) erros.nome = "Informe o nome completo (mínimo 3 letras).";
  else if (v.nome.length > 80) erros.nome = "O nome pode ter no máximo 80 caracteres.";
  else if (!/^[\p{L}][\p{L}' .-]*$/u.test(v.nome)) erros.nome = "Use apenas letras no nome.";

  if (!EMAIL_RE.test(v.email) || v.email.length > 80) erros.email = "Digite um e-mail válido.";
  else if (db.prepare("SELECT id FROM aluno WHERE email = ? AND id <> ?").get(v.email, idAtual)) {
    erros.email = "Já existe um aluno com esse e-mail.";
  }

  if (!telefoneValido(v.telefone)) erros.telefone = "Telefone com DDD: (11) 91234-5678 ou (11) 3123-4567.";

  const cpf = soDigitos(v.cpf);
  if (!cpfValido(cpf)) erros.cpf = "CPF inválido (confira os dígitos).";
  else if (db.prepare("SELECT id FROM aluno WHERE cpf = ? AND id <> ?").get(cpf, idAtual)) {
    erros.cpf = "Já existe um aluno com esse CPF.";
  }

  const nascimento = dataBRparaISO(v.nascimento);
  if (!nascimento) erros.nascimento = "Data de nascimento no formato dd/mm/aaaa.";
  else if (nascimento > hoje) erros.nascimento = "A data de nascimento não pode estar no futuro.";
  else if (idade(nascimento, hoje) < 12) erros.nascimento = "O aluno precisa ter pelo menos 12 anos.";
  else if (idade(nascimento, hoje) > 110) erros.nascimento = "Confira o ano de nascimento.";

  const instrutorId = v.instrutor_id ? Number(v.instrutor_id) : null;
  if (instrutorId !== null && !db.prepare("SELECT id FROM instrutor WHERE id = ? AND ativo = 1").get(instrutorId)) {
    erros.instrutor_id = "Escolha um instrutor da lista.";
  }

  return {
    erros,
    dados: { nome: v.nome, email: v.email, telefone: soDigitos(v.telefone), cpf, nascimento: nascimento ?? "", instrutor_id: instrutorId },
  };
}

function novoCodigo(db: Database.Database): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O e 1/I, para não confundir
  for (;;) {
    const codigo = `PUL-${Array.from({ length: 6 }, () => alfabeto[randomInt(alfabeto.length)]).join("")}`;
    if (!db.prepare("SELECT 1 FROM aluno WHERE codigo = ?").get(codigo)) return codigo;
  }
}

export async function criarAluno(_estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("alunos.editar");
  const db = getDb();
  const hoje = hojeISO();
  const v = lerCadastro(form);
  const extra = {
    plano_id: texto(form, "plano_id"),
    inicio: texto(form, "inicio"),
    renovacao_automatica: texto(form, "renovacao_automatica"),
    pagar_agora: texto(form, "pagar_agora"),
    forma: texto(form, "forma"),
  };
  const valores = { ...v, ...extra };

  const { erros, dados } = validarCadastro(db, v, 0, hoje);
  if (!db.prepare("SELECT id FROM plano WHERE id = ?").get(Number(extra.plano_id))) erros.plano_id = "Escolha um plano.";
  if (!dataISOValida(extra.inicio)) erros.inicio = "Informe a data de início.";
  else if (extra.inicio < addDias(hoje, -90)) erros.inicio = "O início pode ser no máximo 90 dias atrás.";
  else if (extra.inicio > addDias(hoje, 60)) erros.inicio = "O início pode ser no máximo 60 dias à frente.";
  if (extra.pagar_agora && !(extra.forma in FORMA_ROTULO)) erros.forma = "Escolha a forma de pagamento.";
  if (!semErros(erros)) return { erros, valores };

  let alunoId = 0;
  try {
    db.transaction(() => {
      alunoId = Number(
        db
          .prepare(
            `INSERT INTO aluno (nome, email, telefone, cpf, nascimento, instrutor_id, ativo, codigo, cadastro)
             VALUES (@nome, @email, @telefone, @cpf, @nascimento, @instrutor_id, 1, @codigo, @cadastro)`,
          )
          .run({ ...dados, codigo: novoCodigo(db), cadastro: hoje }).lastInsertRowid,
      );
      const matriculaId = criarMatricula(db, {
        aluno_id: alunoId,
        plano_id: Number(extra.plano_id),
        inicio: extra.inicio,
        renovacao_automatica: extra.renovacao_automatica === "on",
      });
      if (extra.pagar_agora) {
        db.prepare("UPDATE pagamento SET pago_em = ?, forma = ? WHERE matricula_id = ? AND parcela = 1").run(hoje, extra.forma, matriculaId);
      }
      auditar(db, usuario, "criar", "aluno", alunoId, `Cadastrou ${dados.nome} com matrícula a partir de ${extra.inicio}`);
    })();
  } catch (e) {
    if (ehViolacaoUnica(e)) return { mensagem: "E-mail ou CPF já cadastrado.", valores };
    console.error(e);
    return { mensagem: "Não foi possível salvar agora. Tente novamente.", valores };
  }

  revalidatePath("/", "layout");
  redirect(`/alunos/${alunoId}`);
}

export async function atualizarAluno(id: number, _estado: FormState, form: FormData): Promise<FormState> {
  const usuario = await exigirPermissao("alunos.editar");
  const db = getDb();
  const v = lerCadastro(form);
  const { erros, dados } = validarCadastro(db, v, id, hojeISO());
  if (!semErros(erros)) return { erros, valores: v };

  const antes = db.prepare("SELECT * FROM aluno WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!antes) return { mensagem: "Esse aluno não existe mais.", valores: v };
  const ativo = v.ativo === "on" ? 1 : 0;

  try {
    db.prepare(
      `UPDATE aluno SET nome = @nome, email = @email, telefone = @telefone, cpf = @cpf, nascimento = @nascimento,
              instrutor_id = @instrutor_id, ativo = @ativo
       WHERE id = @id`,
    ).run({ ...dados, ativo, id });
  } catch (e) {
    if (ehViolacaoUnica(e)) return { mensagem: "E-mail ou CPF já cadastrado.", valores: v };
    return { mensagem: "Não foi possível salvar agora. Tente novamente.", valores: v };
  }

  // Auditoria com o que mudou (sem guardar dados pessoais completos no log).
  const novo: Record<string, unknown> = { ...dados, ativo };
  const mudou = Object.keys(novo).filter((k) => String(antes[k] ?? "") !== String(novo[k] ?? ""));
  if (mudou.length) auditar(db, usuario, "editar", "aluno", id, `Alterou ${mudou.join(", ")} de ${dados.nome}`);

  revalidatePath("/", "layout");
  redirect(`/alunos/${id}`);
}

export async function excluirAluno(id: number): Promise<ResultadoExclusao> {
  const usuario = await exigirPermissao("alunos.editar");
  const db = getDb();
  const aluno = db.prepare("SELECT nome FROM aluno WHERE id = ?").get(id) as { nome: string } | undefined;
  if (!aluno) return { ok: false, mensagem: "Esse aluno não existe mais." };
  try {
    const desfazer = excluirComDesfazer(db, "aluno", id, aluno.nome, usuario.id);
    auditar(db, usuario, "excluir", "aluno", id, `Excluiu ${aluno.nome} (com matrículas, pagamentos, frequência, treinos e avaliações)`);
    revalidatePath("/", "layout");
    return { ok: true, mensagem: `${aluno.nome} foi excluído.`, desfazer: desfazer ?? undefined };
  } catch (e) {
    console.error(e);
    return { ok: false, mensagem: "Não foi possível excluir agora." };
  }
}

