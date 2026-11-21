// Dados 100% fictícios de demonstração, gerados na primeira execução.
// Usa um gerador pseudoaleatório com semente fixa: os dados são sempre parecidos (as datas acompanham o dia de hoje).
import type Database from "better-sqlite3";
import { addDias, addMeses, agoraHora, diaDaSemana, hojeISO } from "./format.ts";
import { criarMatricula } from "./matriculas.ts";
import { hashPassword } from "./password.ts";
import { completarCpf } from "./validacao.ts";

function criarRng(semente: number) {
  return () => {
    semente |= 0;
    semente = (semente + 0x6d2b79f5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, ".");
}

const dois = (n: number) => String(n).padStart(2, "0");

function somarMinutos(hora: string, minutos: number): string {
  const [h, m, s] = hora.split(":").map(Number);
  const total = Math.max(0, Math.min(h * 60 + m + minutos, 23 * 60 + 59));
  return `${dois(Math.floor(total / 60))}:${dois(total % 60)}:${dois(s)}`;
}

// Horários de pico da academia (manhã cedo, almoço e fim da tarde); fim de semana é mais tranquilo.
const HORAS_SEMANA = [6, 6, 7, 7, 7, 8, 9, 11, 12, 12, 13, 17, 18, 18, 19, 19, 19, 20, 21];
const HORAS_FIM_DE_SEMANA = [8, 9, 9, 10, 10, 11, 12, 15, 16];

const PRIMEIROS = [
  "Ana", "Bruno", "Camila", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João",
  "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Paulo", "Rafaela", "Samuel", "Tatiane", "Vinícius",
  "Larissa", "Thiago", "Beatriz", "Gustavo", "Letícia", "Matheus", "Fernanda", "Rodrigo", "Juliana", "Caio",
  "Priscila", "André", "Renata", "Leonardo", "Aline", "Pedro", "Vanessa", "Daniel", "Sofia", "Igor",
  "Helena", "Murilo",
];
const SOBRENOMES = [
  "Souza", "Carvalho", "Ferreira", "Martins", "Lima", "Araújo", "Nunes", "Barros", "Rocha", "Alves",
  "Mendes", "Teixeira", "Duarte", "Pereira", "Ribeiro", "Moreira", "Cardoso", "Freitas", "Castro", "Pinto",
];

const EXERCICIOS: [string, string, string][] = [
  ["Supino reto", "peito", "Banco e barra"],
  ["Supino inclinado com halteres", "peito", "Halteres"],
  ["Crucifixo na máquina", "peito", "Peck deck"],
  ["Flexão de braço", "peito", "Peso do corpo"],
  ["Puxada frontal", "costas", "Polia alta"],
  ["Remada baixa", "costas", "Polia baixa"],
  ["Remada curvada", "costas", "Barra"],
  ["Barra fixa", "costas", "Barra fixa"],
  ["Desenvolvimento com halteres", "ombros", "Halteres"],
  ["Elevação lateral", "ombros", "Halteres"],
  ["Elevação frontal", "ombros", "Anilha"],
  ["Rosca direta", "biceps", "Barra W"],
  ["Rosca alternada", "biceps", "Halteres"],
  ["Rosca martelo", "biceps", "Halteres"],
  ["Tríceps na polia", "triceps", "Polia alta"],
  ["Tríceps testa", "triceps", "Barra W"],
  ["Mergulho no banco", "triceps", "Banco"],
  ["Agachamento livre", "pernas", "Barra e rack"],
  ["Leg press 45°", "pernas", "Leg press"],
  ["Cadeira extensora", "pernas", "Extensora"],
  ["Mesa flexora", "pernas", "Flexora"],
  ["Panturrilha em pé", "pernas", "Máquina de panturrilha"],
  ["Afundo com halteres", "pernas", "Halteres"],
  ["Elevação pélvica", "gluteos", "Barra e banco"],
  ["Cadeira abdutora", "gluteos", "Abdutora"],
  ["Glúteo na polia", "gluteos", "Polia baixa"],
  ["Abdominal supra", "abdomen", "Colchonete"],
  ["Prancha", "abdomen", "Colchonete"],
  ["Abdominal infra na paralela", "abdomen", "Paralela"],
  ["Esteira", "cardio", "Esteira"],
  ["Bicicleta ergométrica", "cardio", "Bicicleta"],
  ["Burpee", "corpo_todo", "Peso do corpo"],
];

// Grupos de cada ficha: A = empurrar, B = puxar, C = pernas.
const FICHAS: { letra: string; objetivo: string; grupos: string[] }[] = [
  { letra: "A", objetivo: "Peito, ombros e tríceps", grupos: ["peito", "peito", "ombros", "ombros", "triceps", "abdomen"] },
  { letra: "B", objetivo: "Costas e bíceps", grupos: ["costas", "costas", "costas", "biceps", "biceps", "cardio"] },
  { letra: "C", objetivo: "Pernas e glúteos", grupos: ["pernas", "pernas", "pernas", "gluteos", "pernas", "abdomen"] },
];

const FORMAS = ["pix", "pix", "pix", "cartao", "cartao", "dinheiro", "boleto"];

type Perfil = "normal" | "vencendo" | "vencido" | "pendente" | "risco" | "inativo";

export function seedDatabase(db: Database.Database): void {
  const rng = criarRng(7);
  const sortear = <T,>(lista: T[]) => lista[Math.floor(rng() * lista.length)];
  const entre = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  const hoje = hojeISO();
  const agora = agoraHora();

  db.prepare("INSERT INTO config (chave, valor) VALUES ('capacidade_maxima', '40')").run();

  // ---------- Instrutores e usuários ----------
  const inserirInstrutor = db.prepare(
    "INSERT INTO instrutor (nome, email, telefone, especialidade) VALUES (?, ?, ?, ?)",
  );
  const instrutores = [
    ["Rafael Costa", "Musculação"],
    ["Juliana Prado", "Treino funcional"],
    ["Marcos Vieira", "Hipertrofia"],
    ["Patrícia Gomes", "Emagrecimento"],
  ].map(([nome, esp]) =>
    Number(inserirInstrutor.run(nome, `${slug(nome)}@pulso.com`, `119${entre(70000000, 99999999)}`, esp).lastInsertRowid),
  );

  const inserirUsuario = db.prepare(
    "INSERT INTO usuario (nome, email, senha_hash, perfil, instrutor_id) VALUES (?, ?, ?, ?, ?)",
  );
  inserirUsuario.run("Administração", "admin@pulso.com", hashPassword("admin123"), "admin", null);
  inserirUsuario.run("Recepção", "recepcao@pulso.com", hashPassword("recepcao123"), "recepcao", null);
  inserirUsuario.run("Rafael Costa", "instrutor@pulso.com", hashPassword("instrutor123"), "instrutor", instrutores[0]);

  // ---------- Planos e exercícios ----------
  const inserirPlano = db.prepare("INSERT INTO plano (nome, preco_centavos, meses) VALUES (?, ?, ?)");
  const planos = [
    { id: Number(inserirPlano.run("Mensal", 9990, 1).lastInsertRowid), meses: 1 },
    { id: Number(inserirPlano.run("Trimestral", 26990, 3).lastInsertRowid), meses: 3 },
    { id: Number(inserirPlano.run("Semestral", 50990, 6).lastInsertRowid), meses: 6 },
    { id: Number(inserirPlano.run("Anual", 89900, 12).lastInsertRowid), meses: 12 },
  ];

  const inserirExercicio = db.prepare("INSERT INTO exercicio (nome, grupo, equipamento) VALUES (?, ?, ?)");
  const porGrupo: Record<string, number[]> = {};
  for (const [nome, grupo, equipamento] of EXERCICIOS) {
    const id = Number(inserirExercicio.run(nome, grupo, equipamento).lastInsertRowid);
    (porGrupo[grupo] ??= []).push(id);
  }

  // ---------- Alunos ----------
  const inserirAluno = db.prepare(
    `INSERT INTO aluno (nome, email, telefone, cpf, nascimento, instrutor_id, ativo, codigo, cadastro)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const pagar = db.prepare("UPDATE pagamento SET pago_em = ?, forma = ? WHERE id = ?");
  const inserirPresenca = db.prepare("INSERT OR IGNORE INTO presenca (aluno_id, data, hora, saida) VALUES (?, ?, ?, ?)");
  const inserirFicha = db.prepare(
    "INSERT INTO ficha (aluno_id, letra, objetivo, instrutor_id, atualizada_em) VALUES (?, ?, ?, ?, ?)",
  );
  const inserirItem = db.prepare(
    `INSERT INTO ficha_item (ficha_id, exercicio_id, ordem, series, repeticoes, carga_kg, descanso_seg)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const inserirAvaliacao = db.prepare(
    `INSERT INTO avaliacao (aluno_id, data, peso_kg, altura_cm, gordura_pct, cintura_cm, quadril_cm, braco_cm, coxa_cm, instrutor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const usados = new Set<string>();

  PRIMEIROS.forEach((primeiro, i) => {
    const nome = `${primeiro} ${SOBRENOMES[i % SOBRENOMES.length]}${i % 3 === 0 ? ` ${SOBRENOMES[(i * 7 + 3) % SOBRENOMES.length]}` : ""}`;
    const perfil: Perfil =
      i % 13 === 12 ? "inativo"
      : i % 9 === 4 ? "pendente"
      : i % 10 === 7 ? "vencido"
      : i % 8 === 2 ? "vencendo"
      : i % 7 === 5 ? "risco"
      : "normal";

    const plano = planos[[0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3][Math.floor(rng() * 11)]];
    const renovacaoAuto = perfil === "normal" && rng() < 0.5;

    // Data em que a última matrícula termina; a partir dela montamos o histórico para trás.
    const fimAlvo =
      perfil === "vencendo" ? addDias(hoje, entre(0, 6))
      : perfil === "vencido" ? addDias(hoje, -entre(3, 25))
      : perfil === "inativo" ? addDias(hoje, -entre(40, 150))
      : addDias(hoje, entre(9, plano.meses * 30));
    const inicioUltima = addMeses(addDias(fimAlvo, 1), -plano.meses);
    const maxAnteriores = Math.max(0, Math.floor(360 / (plano.meses * 30)));
    const quantas = 1 + entre(0, maxAnteriores);
    const inicios: string[] = [];
    for (let k = quantas - 1; k >= 0; k--) inicios.push(addMeses(inicioUltima, -k * plano.meses));
    const cadastro = inicios[0] > hoje ? hoje : inicios[0];

    let codigo = "";
    do codigo = Array.from({ length: 6 }, () => sortear(ALFABETO.split(""))).join("");
    while (usados.has(codigo));
    usados.add(codigo);

    const cpf = completarCpf(String(100000000 + Math.floor(rng() * 899999999)));
    const nascimento = `${entre(1968, 2007)}-${dois(entre(1, 12))}-${dois(entre(1, 28))}`;
    const instrutor = rng() < 0.85 ? sortear(instrutores) : null;
    const alunoId = Number(
      inserirAluno.run(nome, `${slug(nome)}@exemplo.com`, `119${entre(10000000, 99999999)}`, cpf, nascimento, instrutor,
        perfil === "inativo" ? 0 : 1, `PUL-${codigo}`, cadastro).lastInsertRowid,
    );

    // Matrículas e parcelas. Parcelas já vencidas são pagas (com alguns dias de variação), menos as do
    // perfil "pendente", que fica devendo as mais recentes.
    const limiteDivida = addDias(hoje, -entre(20, 65));
    for (const inicio of inicios) {
      const mId = criarMatricula(db, { aluno_id: alunoId, plano_id: plano.id, inicio, renovacao_automatica: renovacaoAuto });
      const parcelas = db.prepare("SELECT id, vencimento FROM pagamento WHERE matricula_id = ?").all(mId) as { id: number; vencimento: string }[];
      for (const p of parcelas) {
        if (p.vencimento > hoje) continue;
        if (perfil === "pendente" && p.vencimento >= limiteDivida && p.vencimento < hoje) continue;
        if (p.vencimento === hoje && rng() < 0.5) continue;
        let pagoEm = addDias(p.vencimento, rng() < 0.7 ? 0 : entre(1, 6));
        if (pagoEm > hoje) pagoEm = hoje;
        pagar.run(pagoEm, sortear(FORMAS), p.id);
      }
    }

    // Frequência (últimos 4 meses).
    if (perfil !== "inativo") {
      const frequencia = 0.25 + rng() * 0.4;
      const ultimoDia =
        perfil === "risco" ? addDias(hoje, -entre(15, 40))
        : perfil === "vencido" ? fimAlvo
        : hoje;
      for (let d = 120; d >= 0; d--) {
        const dia = addDias(hoje, -d);
        if (dia < cadastro || dia > ultimoDia) continue;
        const dow = diaDaSemana(dia); // 5 = sábado, 6 = domingo
        const fator = dow === 6 ? 0.25 : dow === 5 ? 0.55 : 1.15;
        if (rng() >= frequencia * fator * (1 + (120 - d) / 300)) continue;
        const lista = dow >= 5 ? HORAS_FIM_DE_SEMANA : HORAS_SEMANA;
        const hora = `${dois(sortear(lista))}:${dois(entre(0, 59))}:${dois(entre(0, 59))}`;
        if (dia === hoje && hora > agora) continue; // hoje, nenhuma entrada no futuro
        let saida: string | null = somarMinutos(hora, entre(45, 110));
        if (dia === hoje && saida > agora) saida = null; // ainda está treinando
        inserirPresenca.run(alunoId, dia, hora, saida);
      }
    }

    // Fichas de treino (A/B/C) para quem tem instrutor.
    if (instrutor && perfil !== "inativo") {
      const quantasFichas = rng() < 0.3 ? 2 : 3;
      for (const f of FICHAS.slice(0, quantasFichas)) {
        const montada = addDias(cadastro, entre(0, 10));
        const fichaId = Number(inserirFicha.run(alunoId, f.letra, f.objetivo, instrutor, montada > hoje ? hoje : montada).lastInsertRowid);
        const escolhidos = new Set<number>();
        f.grupos.forEach((g, ordem) => {
          const opcoes = porGrupo[g].filter((id) => !escolhidos.has(id));
          if (opcoes.length === 0) return;
          const ex = sortear(opcoes);
          escolhidos.add(ex);
          const cardio = g === "cardio";
          inserirItem.run(fichaId, ex, ordem + 1, cardio ? 1 : sortear([3, 3, 4]), cardio ? "15 min" : sortear(["8-10", "10-12", "12", "15"]),
            cardio || g === "abdomen" ? null : entre(4, 40) * 2.5, cardio ? null : sortear([45, 60, 60, 90]));
        });
      }
    }

    // Avaliações físicas: a cada ~6 semanas, com tendência de evolução.
    if (rng() < 0.75) {
      const homem = rng() < 0.5;
      const altura = homem ? entre(165, 190) : entre(152, 176);
      let peso = homem ? entre(70, 105) : entre(55, 88);
      let gordura = homem ? entre(16, 30) : entre(22, 36);
      const tendencia = rng() < 0.7 ? -1 : 1; // a maioria perde gordura
      for (let data = addDias(cadastro, 2); data <= hoje; data = addDias(data, entre(38, 52))) {
        inserirAvaliacao.run(alunoId, data, Math.round(peso * 10) / 10, altura, Math.round(gordura * 10) / 10,
          Math.round((peso * (homem ? 0.95 : 0.98)) * 10) / 10, Math.round((peso * 1.2 + 10) * 10) / 10,
          Math.round((peso * 0.38) * 10) / 10, Math.round((peso * 0.68) * 10) / 10, instrutor);
        peso += tendencia * (0.4 + rng() * 1.6);
        gordura += tendencia * (0.3 + rng() * 1.1);
        if (perfil === "inativo") break;
      }
    }
  });
}
