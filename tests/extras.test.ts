// Pix copia e cola, reservas de aulas coletivas, avisos e cargas.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cancelarReserva, horaFim, jaComecou, proximasOcorrencias, reservarAula } from "../lib/aulas.ts";
import { bancoEmMemoria } from "../lib/banco.ts";
import { addDias, diaDaSemana } from "../lib/format.ts";
import { excluirComDesfazer, restaurar } from "../lib/lixeira.ts";
import { crc16, limparTexto, pixCopiaECola } from "../lib/pix.ts";

describe("Pix copia e cola", () => {
  it("CRC16-CCITT bate com o valor de referência", () => {
    assert.equal(crc16("123456789"), "29B1");
  });

  it("monta o BR Code com chave, valor, nome, cidade e CRC válido", () => {
    const codigo = pixCopiaECola({ chave: "financeiro@academia.com", nome: "Academia Pulsô", cidade: "São Paulo", valorCentavos: 9990, identificador: "PULSO-42" });
    assert.ok(codigo.startsWith("000201"));
    assert.ok(codigo.includes("0014br.gov.bcb.pix"));
    assert.ok(codigo.includes("0123financeiro@academia.com"));
    assert.ok(codigo.includes("540599.90"));
    assert.ok(codigo.includes("5802BR"));
    assert.ok(codigo.includes("5914ACADEMIA PULSO"));
    assert.ok(codigo.includes("6009SAO PAULO"));
    assert.ok(codigo.includes("62110507PULSO42"));
    // Os 4 últimos caracteres são o CRC de todo o resto (incluindo "6304").
    assert.equal(codigo.slice(-4), crc16(codigo.slice(0, -4)));
  });

  it("limpa acentos e limita o tamanho", () => {
    assert.equal(limparTexto("Ação & Cia Ltda.", 25), "ACAO  CIA LTDA.");
    assert.equal(limparTexto("Florianópolis", 5), "FLORI");
  });
});

describe("aulas coletivas", () => {
  it("calcula o fim e se a aula já começou", () => {
    assert.equal(horaFim("23:30", 45), "00:15");
    assert.equal(jaComecou("2026-11-23", "07:00", "2026-11-23", "07:00:01"), true);
    assert.equal(jaComecou("2026-11-23", "19:00", "2026-11-23", "18:59:00"), false);
    assert.equal(jaComecou("2026-11-22", "19:00", "2026-11-23", "06:00:00"), true);
  });

  function cenario() {
    const db = bancoEmMemoria({ demo: false });
    const hoje = "2026-11-23"; // segunda
    const amanha = addDias(hoje, 1);
    const aula = Number(
      db.prepare("INSERT INTO aula (nome, dia_semana, hora, duracao_min, vagas) VALUES ('Spinning', ?, '19:00', 45, 2)").run(diaDaSemana(amanha)).lastInsertRowid,
    );
    const outra = Number(db.prepare("INSERT INTO aula (nome, dia_semana, hora, duracao_min, vagas) VALUES ('Yoga', ?, '19:00', 60, 10)").run(diaDaSemana(amanha)).lastInsertRowid);
    const alunos = [1, 2, 3].map((i) =>
      Number(
        db
          .prepare("INSERT INTO aluno (nome, email, telefone, cpf, nascimento, codigo, cadastro) VALUES (?, ?, '11912345678', ?, '1990-01-01', ?, ?)")
          .run(`Aluno ${i}`, `a${i}@t.com`, `0000000000${i}`, `PUL-${i}`, hoje).lastInsertRowid,
      ),
    );
    return { db, hoje, amanha, aula, outra, alunos };
  }

  it("respeita o limite de vagas e não deixa reservar duas vezes", () => {
    const { db, hoje, amanha, aula, alunos } = cenario();
    const reservar = (aluno: number) => reservarAula(db, aluno, aula, amanha, hoje, "08:00:00", `${hoje} 08:00:00`);
    assert.deepEqual(reservar(alunos[0]), { ok: true });
    assert.equal(reservar(alunos[0]).ok, false, "mesmo aluno duas vezes");
    assert.deepEqual(reservar(alunos[1]), { ok: true });
    const lotada = reservar(alunos[2]);
    assert.equal(lotada.ok, false);
    assert.match((lotada as { motivo: string }).motivo, /vagas/);
    const ocorrencia = proximasOcorrencias(db, hoje, 7, alunos[0]).find((o) => o.id === aula)!;
    assert.equal(ocorrencia.reservadas, 2);
    assert.equal(ocorrencia.minha, true);
  });

  it("não deixa reservar duas aulas no mesmo horário, nem dia errado ou aula que já começou", () => {
    const { db, hoje, amanha, aula, outra, alunos } = cenario();
    assert.equal(reservarAula(db, alunos[0], aula, amanha, hoje, "08:00:00", "x").ok, true);
    assert.equal(reservarAula(db, alunos[0], outra, amanha, hoje, "08:00:00", "x").ok, false, "conflito de horário");
    assert.equal(reservarAula(db, alunos[1], aula, hoje, hoje, "08:00:00", "x").ok, false, "a aula não é hoje");
    assert.equal(reservarAula(db, alunos[1], aula, amanha, amanha, "19:30:00", "x").ok, false, "já começou");
    assert.equal(reservarAula(db, alunos[1], aula, addDias(amanha, 7), hoje, "08:00:00", "x").ok, false, "antecedência de 7 dias");
  });

  it("cancelar libera a vaga, mas não depois que a aula começou", () => {
    const { db, hoje, amanha, aula, alunos } = cenario();
    reservarAula(db, alunos[0], aula, amanha, hoje, "08:00:00", "x");
    assert.equal(cancelarReserva(db, alunos[0], aula, amanha, amanha, "19:10:00").ok, false);
    assert.equal(cancelarReserva(db, alunos[0], aula, amanha, hoje, "08:00:00").ok, true);
    assert.equal(cancelarReserva(db, alunos[0], aula, amanha, hoje, "08:00:00").ok, false, "já cancelada");
  });
});

describe("dados de demonstração da versão 4", () => {
  it("tem Pix, grade de aulas sem lotar, avisos e cargas do aluno de demonstração", () => {
    const db = bancoEmMemoria();
    assert.ok(db.prepare("SELECT valor FROM config WHERE chave = 'pix_chave'").get());
    const lotadas = db
      .prepare(
        `SELECT COUNT(*) AS n FROM (SELECT r.aula_id, r.data, COUNT(*) AS c, a.vagas FROM aula_reserva r JOIN aula a ON a.id = r.aula_id
         GROUP BY r.aula_id, r.data HAVING c > a.vagas)`,
      )
      .get() as { n: number };
    assert.equal(lotadas.n, 0);
    assert.ok((db.prepare("SELECT COUNT(*) AS n FROM aviso").get() as { n: number }).n > 0);
    const demo = db.prepare("SELECT a.id FROM aluno a JOIN config c ON c.chave = 'aluno_demo_email' AND c.valor = a.email").get() as { id: number };
    assert.ok((db.prepare("SELECT COUNT(*) AS n FROM carga_registro WHERE aluno_id = ?").get(demo.id) as { n: number }).n > 0);
  });

  it("excluir uma aula e desfazer devolve as reservas", () => {
    const db = bancoEmMemoria();
    const { aula_id, n } = db.prepare("SELECT aula_id, COUNT(*) AS n FROM aula_reserva GROUP BY aula_id ORDER BY n DESC LIMIT 1").get() as { aula_id: number; n: number };
    const lixeira = excluirComDesfazer(db, "aula", aula_id, "aula", null)!;
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM aula_reserva WHERE aula_id = ?").get(aula_id) as { n: number }).n, 0);
    assert.equal(restaurar(db, lixeira).ok, true);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM aula_reserva WHERE aula_id = ?").get(aula_id) as { n: number }).n, n);
  });
});
