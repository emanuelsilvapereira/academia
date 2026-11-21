// Testes com um banco SQLite de verdade, em memória (cada teste começa do zero).
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type Database from "better-sqlite3";
import { bancoEmMemoria } from "../lib/banco.ts";
import { alunosEmRisco, buscarAluno, inadimplentes, listarAlunos, POR_PAGINA, vencimentosProximos } from "../lib/consultas.ts";
import { addDias, hojeISO } from "../lib/format.ts";
import { excluirComDesfazer, PRAZO_DESFAZER_SEGUNDOS, restaurar } from "../lib/lixeira.ts";
import { MAX_FALHAS_EMAIL, registrarTentativa, segundosDeBloqueio } from "../lib/login.ts";
import { criarMatricula, renovarAutomaticas } from "../lib/matriculas.ts";

const HOJE = hojeISO();
let db: Database.Database;

function novoAluno(nome = "Teste da Silva", cpf = "52998224725"): number {
  return Number(
    db
      .prepare(
        `INSERT INTO aluno (nome, email, telefone, cpf, nascimento, codigo, cadastro)
         VALUES (?, ?, '11912345678', ?, '1995-05-05', ?, ?)`,
      )
      .run(nome, `${cpf}@teste.com`, cpf, `PUL-T${cpf.slice(0, 5)}`, HOJE).lastInsertRowid,
  );
}
const planoMensal = () => (db.prepare("SELECT id FROM plano WHERE meses = 1").get() as { id: number }).id;

describe("banco com dados de demonstração", () => {
  beforeEach(() => {
    db = bancoEmMemoria();
  });

  it("carrega usuários, alunos e todas as situações", () => {
    const usuarios = db.prepare("SELECT perfil FROM usuario ORDER BY perfil").all() as { perfil: string }[];
    assert.deepEqual(usuarios.map((u) => u.perfil), ["admin", "instrutor", "recepcao"]);
    const { total } = listarAlunos(db, { q: "", situacao: "", plano: 0, instrutor: 0, ordem: "nome", dir: "asc" }, HOJE, 1);
    assert.ok(total >= 40);
    for (const situacao of ["ativo", "pendente", "vencido", "inativo"]) {
      const r = listarAlunos(db, { q: "", situacao, plano: 0, instrutor: 0, ordem: "nome", dir: "asc" }, HOJE, 1);
      assert.ok(r.total > 0, `deveria haver alunos com situação ${situacao}`);
    }
    assert.ok(inadimplentes(db, HOJE).length > 0);
    assert.ok(vencimentosProximos(db, HOJE).length > 0);
    assert.ok(alunosEmRisco(db, HOJE).length > 0);
  });

  it("pagina a lista no banco (LIMIT/OFFSET) sem repetir alunos", () => {
    const f = { q: "", situacao: "", plano: 0, instrutor: 0, ordem: "nome", dir: "asc" as const };
    const p1 = listarAlunos(db, f, HOJE, 1).linhas;
    const p2 = listarAlunos(db, f, HOJE, 2).linhas;
    assert.equal(p1.length, POR_PAGINA);
    assert.equal(new Set([...p1, ...p2].map((a) => a.id)).size, p1.length + p2.length);
    assert.ok(p1[p1.length - 1].nome.localeCompare(p2[0].nome, "pt-BR", { sensitivity: "base" }) <= 0);
  });
});

describe("regras de negócio", () => {
  beforeEach(() => {
    db = bancoEmMemoria({ demo: false });
    db.prepare("INSERT INTO plano (nome, preco_centavos, meses) VALUES ('Mensal', 10000, 1), ('Trimestral', 27000, 3)").run();
  });

  it("pagamento pendente é calculado pelas parcelas vencidas", () => {
    const id = novoAluno();
    criarMatricula(db, { aluno_id: id, plano_id: planoMensal(), inicio: addDias(HOJE, -10), renovacao_automatica: false });
    let a = buscarAluno(db, id, HOJE)!;
    assert.equal(a.situacao, "pendente");
    assert.equal(a.devido, 10000);
    assert.equal(a.dias_atraso, 10);

    db.prepare("UPDATE pagamento SET pago_em = ?, forma = 'pix'").run(HOJE);
    a = buscarAluno(db, id, HOJE)!;
    assert.equal(a.situacao, "ativo");
    assert.equal(a.devido, 0);
  });

  it("matrícula vencida e aluno inativo têm situação própria", () => {
    const id = novoAluno();
    criarMatricula(db, { aluno_id: id, plano_id: planoMensal(), inicio: addDias(HOJE, -60), renovacao_automatica: false });
    db.prepare("UPDATE pagamento SET pago_em = vencimento, forma = 'dinheiro'").run();
    assert.equal(buscarAluno(db, id, HOJE)!.situacao, "vencido");
    db.prepare("UPDATE aluno SET ativo = 0 WHERE id = ?").run(id);
    assert.equal(buscarAluno(db, id, HOJE)!.situacao, "inativo");
  });

  it("renovação automática cria a próxima matrícula quando a atual acaba", () => {
    const id = novoAluno();
    criarMatricula(db, { aluno_id: id, plano_id: planoMensal(), inicio: addDias(HOJE, -40), renovacao_automatica: true });
    assert.equal(renovarAutomaticas(db, HOJE), 1);
    assert.equal(renovarAutomaticas(db, HOJE), 0, "não renova duas vezes");
    const a = buscarAluno(db, id, HOJE)!;
    assert.ok(a.inicio! <= HOJE && a.fim! >= HOJE);
  });

  it("o banco exige forma de pagamento quando há data de pagamento", () => {
    const id = novoAluno();
    criarMatricula(db, { aluno_id: id, plano_id: planoMensal(), inicio: HOJE, renovacao_automatica: false });
    assert.throws(() => db.prepare("UPDATE pagamento SET pago_em = ?").run(HOJE), /CHECK/);
  });

  it("não deixa apagar plano usado em matrícula (ON DELETE RESTRICT)", () => {
    const id = novoAluno();
    criarMatricula(db, { aluno_id: id, plano_id: planoMensal(), inicio: HOJE, renovacao_automatica: false });
    assert.throws(() => db.prepare("DELETE FROM plano WHERE id = ?").run(planoMensal()), /FOREIGN KEY/);
  });

  it("um aluno só entra uma vez por dia", () => {
    const id = novoAluno();
    db.prepare("INSERT INTO presenca (aluno_id, data, hora) VALUES (?, ?, '08:00:00')").run(id, HOJE);
    assert.throws(() => db.prepare("INSERT INTO presenca (aluno_id, data, hora) VALUES (?, ?, '09:00:00')").run(id, HOJE), /UNIQUE/);
  });
});

describe("excluir e desfazer", () => {
  beforeEach(() => {
    db = bancoEmMemoria({ demo: false });
    db.prepare("INSERT INTO plano (nome, preco_centavos, meses) VALUES ('Trimestral', 27000, 3)").run();
    db.prepare("INSERT INTO instrutor (nome, email, telefone) VALUES ('Prof Teste', 'prof@t.com', '11912345678')").run();
    db.prepare("INSERT INTO exercicio (nome, grupo, equipamento) VALUES ('Supino', 'peito', 'Barra')").run();
  });

  it("restaura o aluno com matrículas, pagamentos, presenças, fichas e avaliações", () => {
    const id = novoAluno();
    criarMatricula(db, { aluno_id: id, plano_id: 1, inicio: HOJE, renovacao_automatica: false });
    db.prepare("INSERT INTO presenca (aluno_id, data, hora) VALUES (?, ?, '07:00:00')").run(id, HOJE);
    const ficha = Number(db.prepare("INSERT INTO ficha (aluno_id, letra, atualizada_em) VALUES (?, 'A', ?)").run(id, HOJE).lastInsertRowid);
    db.prepare("INSERT INTO ficha_item (ficha_id, exercicio_id, ordem, series, repeticoes) VALUES (?, 1, 1, 3, '12')").run(ficha);
    db.prepare("INSERT INTO avaliacao (aluno_id, data, peso_kg, altura_cm) VALUES (?, ?, 80, 175)").run(id, HOJE);
    const contar = () =>
      ["aluno", "matricula", "pagamento", "presenca", "ficha", "ficha_item", "avaliacao"].map(
        (t) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n,
      );
    const antes = contar();

    const lixeira = excluirComDesfazer(db, "aluno", id, "Teste", null)!;
    assert.deepEqual(contar(), [0, 0, 0, 0, 0, 0, 0], "CASCADE apagou tudo");

    const r = restaurar(db, lixeira);
    assert.equal(r.ok, true);
    assert.deepEqual(contar(), antes);
    assert.equal(restaurar(db, lixeira).ok, false, "não desfaz duas vezes");
  });

  it("religa os alunos ao instrutor restaurado (SET NULL)", () => {
    const id = novoAluno();
    db.prepare("UPDATE aluno SET instrutor_id = 1 WHERE id = ?").run(id);
    const lixeira = excluirComDesfazer(db, "instrutor", 1, "Prof", null)!;
    assert.equal((db.prepare("SELECT instrutor_id FROM aluno WHERE id = ?").get(id) as { instrutor_id: number | null }).instrutor_id, null);
    assert.equal(restaurar(db, lixeira).ok, true);
    assert.equal((db.prepare("SELECT instrutor_id FROM aluno WHERE id = ?").get(id) as { instrutor_id: number }).instrutor_id, 1);
  });

  it("não desfaz depois do prazo", () => {
    const id = novoAluno();
    const agora = 1_000_000;
    const lixeira = excluirComDesfazer(db, "aluno", id, "Teste", null, agora)!;
    const r = restaurar(db, lixeira, agora + PRAZO_DESFAZER_SEGUNDOS + 1);
    assert.equal(r.ok, false);
  });

  it("não restaura se outro aluno ocupou o e-mail/CPF", () => {
    const id = novoAluno();
    const lixeira = excluirComDesfazer(db, "aluno", id, "Teste", null)!;
    novoAluno("Outra Pessoa", "52998224725");
    assert.equal(restaurar(db, lixeira).ok, false);
  });
});

describe("bloqueio de login", () => {
  beforeEach(() => {
    db = bancoEmMemoria({ demo: false });
  });

  it(`bloqueia depois de ${MAX_FALHAS_EMAIL} erros seguidos e libera depois de 15 minutos`, () => {
    const t = 1_700_000_000;
    for (let i = 0; i < MAX_FALHAS_EMAIL - 1; i++) registrarTentativa(db, "a@b.com", "1.1.1.1", false, t + i);
    assert.equal(segundosDeBloqueio(db, "a@b.com", "1.1.1.1", t + 10), 0);
    registrarTentativa(db, "a@b.com", "1.1.1.1", false, t + 10);
    assert.ok(segundosDeBloqueio(db, "a@b.com", "1.1.1.1", t + 11) > 0);
    assert.ok(segundosDeBloqueio(db, "outro@b.com", "2.2.2.2", t + 11) === 0, "não afeta outro e-mail");
    assert.equal(segundosDeBloqueio(db, "a@b.com", "1.1.1.1", t + 15 * 60 + 11), 0);
  });

  it("um login certo zera a contagem de erros", () => {
    const t = 1_700_000_000;
    for (let i = 0; i < 3; i++) registrarTentativa(db, "a@b.com", "ip", false, t + i);
    registrarTentativa(db, "a@b.com", "ip", true, t + 5);
    for (let i = 0; i < 3; i++) registrarTentativa(db, "a@b.com", "ip", false, t + 10 + i);
    assert.equal(segundosDeBloqueio(db, "a@b.com", "ip", t + 20), 0);
  });
});
