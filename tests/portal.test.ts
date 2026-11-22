// Portal do aluno: rotina de treino, vídeos, músculos e dados de demonstração.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bancoEmMemoria } from "../lib/banco.ts";
import fs from "node:fs";
import { ANIMACOES, CATALOGO } from "../lib/catalogo-exercicios.ts";
import { addDias } from "../lib/format.ts";
import { excluirComDesfazer, restaurar } from "../lib/lixeira.ts";
import { lerMusculos, MUSCULOS } from "../lib/musculos.ts";
import { verifyPassword } from "../lib/password.ts";
import { fichasDoAluno } from "../lib/portal.ts";
import { conquistas, lerDias, semanasSeguidas, treinoDeHoje } from "../lib/rotina.ts";
import { SENHA_ALUNO_DEMO } from "../lib/seed.ts";
import { analisarVideo } from "../lib/video.ts";

// 2026-11-23 é uma segunda-feira.
const SEGUNDA = "2026-11-23";

describe("rotina de treino", () => {
  it("lê os dias da semana sem repetir e em ordem", () => {
    assert.deepEqual(lerDias("4,0,2,2,9,x"), [0, 2, 4]);
    assert.deepEqual(lerDias(""), []);
  });

  it("usa a ficha marcada para o dia da semana", () => {
    const fichas = [
      { letra: "A", dias: [0, 3] },
      { letra: "B", dias: [1, 4] },
    ];
    assert.deepEqual(treinoDeHoje(fichas, SEGUNDA, null), { tipo: "treino", letra: "A", motivo: "dia" });
    assert.deepEqual(treinoDeHoje(fichas, addDias(SEGUNDA, 1), "A"), { tipo: "treino", letra: "B", motivo: "dia" });
  });

  it("em dia sem ficha, é descanso e mostra o próximo treino", () => {
    const fichas = [{ letra: "A", dias: [0] }, { letra: "B", dias: [3] }];
    const quarta = addDias(SEGUNDA, 1); // terça
    assert.deepEqual(treinoDeHoje(fichas, quarta, null), { tipo: "descanso", proxima: { letra: "B", dia: 3, emDias: 2 } });
  });

  it("sem dias fixos, segue a sequência A → B → C → A", () => {
    const fichas = [{ letra: "B", dias: [] }, { letra: "A", dias: [] }, { letra: "C", dias: [] }];
    assert.equal((treinoDeHoje(fichas, SEGUNDA, null) as { letra: string }).letra, "A");
    assert.equal((treinoDeHoje(fichas, SEGUNDA, "A") as { letra: string }).letra, "B");
    assert.equal((treinoDeHoje(fichas, SEGUNDA, "C") as { letra: string }).letra, "A");
    assert.deepEqual(treinoDeHoje([], SEGUNDA, null), { tipo: "sem_ficha" });
  });

  it("conta semanas seguidas sem quebrar a sequência no começo da semana", () => {
    const datas = [addDias(SEGUNDA, -7), addDias(SEGUNDA, -12), addDias(SEGUNDA, -20)];
    assert.equal(semanasSeguidas(datas, SEGUNDA), 3);
    assert.equal(semanasSeguidas([...datas, SEGUNDA], SEGUNDA), 4);
    assert.equal(semanasSeguidas([addDias(SEGUNDA, -30)], SEGUNDA), 0);
  });

  it("calcula conquistas a partir do histórico", () => {
    const c = conquistas({ totalTreinos: 12, semanasSeguidas: 2, avaliacoes: [{ gordura_pct: 25 }, { gordura_pct: 22 }], mesesDeCasa: 3 });
    const ganhou = (id: string) => c.find((x) => x.id === id)!;
    assert.equal(ganhou("dez").ganhou, true);
    assert.equal(ganhou("cinquenta").progresso, "12/50");
    assert.equal(ganhou("evolucao").ganhou, true);
    assert.equal(ganhou("constancia").ganhou, false);
  });
});

describe("vídeos e músculos dos exercícios", () => {
  it("reconhece links do YouTube e arquivos de vídeo", () => {
    assert.deepEqual(analisarVideo("https://www.youtube.com/watch?v=abcdefghijk&t=10"), { tipo: "youtube", id: "abcdefghijk" });
    assert.deepEqual(analisarVideo("https://youtu.be/abcdefghijk"), { tipo: "youtube", id: "abcdefghijk" });
    assert.deepEqual(analisarVideo("https://youtube.com/shorts/abcdefghijk"), { tipo: "youtube", id: "abcdefghijk" });
    assert.deepEqual(analisarVideo("https://cdn.exemplo.com/supino.mp4"), { tipo: "arquivo", url: "https://cdn.exemplo.com/supino.mp4" });
  });

  it("recusa links que não são vídeo ou não usam https", () => {
    assert.equal(analisarVideo("http://youtu.be/abcdefghijk"), null);
    assert.equal(analisarVideo("javascript:alert(1)"), null);
    assert.equal(analisarVideo("https://exemplo.com/pagina"), null);
    assert.equal(analisarVideo("https://www.youtube.com/watch?v=curto"), null);
    assert.equal(analisarVideo(""), null);
  });

  it("todo músculo do catálogo existe no mapa do corpo", () => {
    for (const [nome, info] of Object.entries(CATALOGO)) {
      for (const m of [...info.primarios, ...info.secundarios]) assert.ok(m in MUSCULOS, `${nome}: músculo desconhecido ${m}`);
      assert.ok(info.primarios.length > 0, `${nome} sem músculo principal`);
    }
    assert.deepEqual(lerMusculos("peitoral, inventado ,triceps"), ["peitoral", "triceps"]);
  });

  it("cada exercício do catálogo (menos o burpee) tem animação com as duas fotos", () => {
    for (const nome of Object.keys(CATALOGO)) {
      if (nome === "Burpee") continue;
      const pasta = ANIMACOES[nome];
      assert.ok(pasta, `${nome} sem animação`);
      for (const arq of ["0.jpg", "1.jpg", "animacao.gif"]) assert.ok(fs.existsSync(`public/exercicios/${pasta}/${arq}`), `${nome}: falta ${arq}`);
      assert.equal(fs.readFileSync(`public/exercicios/${pasta}/animacao.gif`).subarray(0, 6).toString(), "GIF89a", `${nome}: GIF inválido`);
    }
    const db = bancoEmMemoria();
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM exercicio WHERE animacao = '' AND nome <> 'Burpee'").get() as { n: number };
    assert.equal(n, 0, "os exercícios de demonstração vêm com animação");
    const { v } = db.prepare("SELECT COUNT(*) AS v FROM exercicio WHERE video_url <> ''").get() as { v: number };
    assert.equal(v, 0, "sem vídeos do YouTube por padrão");
  });});

describe("portal com dados de demonstração", () => {
  it("cria um aluno de demonstração com senha, fichas com dias e exercícios explicados", () => {
    const db = bancoEmMemoria();
    const { valor: email } = db.prepare("SELECT valor FROM config WHERE chave = 'aluno_demo_email'").get() as { valor: string };
    const aluno = db.prepare("SELECT id, senha_hash FROM aluno WHERE email = ?").get(email) as { id: number; senha_hash: string };
    assert.ok(verifyPassword(SENHA_ALUNO_DEMO, aluno.senha_hash));
    const fichas = fichasDoAluno(db, aluno.id);
    assert.ok(fichas.length >= 3);
    assert.ok(fichas.every((f) => f.dias.length > 0 && f.itens.length > 0));
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM exercicio WHERE descricao = '' OR musculos_primarios = ''").get() as { n: number };
    assert.equal(n, 0);
  });

  it("excluir o aluno e desfazer devolve também os treinos concluídos", () => {
    const db = bancoEmMemoria();
    const { aluno_id } = db.prepare("SELECT aluno_id FROM treino_feito LIMIT 1").get() as { aluno_id: number };
    const contar = () => (db.prepare("SELECT COUNT(*) AS n FROM treino_feito WHERE aluno_id = ?").get(aluno_id) as { n: number }).n;
    const antes = contar();
    const lixeira = excluirComDesfazer(db, "aluno", aluno_id, "demo", null)!;
    assert.equal(contar(), 0);
    assert.equal(restaurar(db, lixeira).ok, true);
    assert.equal(contar(), antes);
  });
});
