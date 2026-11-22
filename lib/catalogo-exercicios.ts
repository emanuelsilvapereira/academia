// Explicação dos exercícios de demonstração: o que trabalham, como fazer e erros comuns.
// Usado no seed e para completar bancos antigos (migração para a versão 3).
// Os textos são orientações gerais; o instrutor da academia pode editar tudo na tela de Exercícios.

export type InfoExercicio = {
  descricao: string;
  execucao: string[];
  dicas: string[];
  primarios: string[];
  secundarios: string[];
};

export const CATALOGO: Record<string, InfoExercicio> = {
  "Supino reto": {
    descricao: "Exercício básico de empurrar para o peito. Desenvolve força e volume do peitoral, com ajuda dos ombros e do tríceps.",
    execucao: [
      "Deite no banco com os olhos embaixo da barra e os pés firmes no chão.",
      "Segure a barra um pouco mais aberto que a largura dos ombros e aproxime as escápulas.",
      "Desça a barra controlando até tocar de leve a parte baixa do peito.",
      "Empurre a barra para cima até estender os braços, sem travar os cotovelos.",
    ],
    dicas: ["Não tire o quadril do banco.", "Cotovelos a uns 45° do corpo, não totalmente abertos.", "Use alguém para ajudar quando a carga for alta."],
    primarios: ["peitoral"],
    secundarios: ["deltoide_anterior", "triceps"],
  },
  "Supino inclinado com halteres": {
    descricao: "Variação do supino com o banco inclinado (30° a 45°), que dá mais ênfase à parte de cima do peitoral.",
    execucao: [
      "Ajuste o banco entre 30° e 45° e sente com um halter em cada mão apoiado nas coxas.",
      "Deite levando os halteres para a altura do peito, palmas para a frente.",
      "Empurre os halteres para cima, aproximando-os no alto.",
      "Desça devagar até sentir o peito alongar.",
    ],
    dicas: ["Inclinação muito alta passa o trabalho para o ombro.", "Mantenha os punhos retos, alinhados com os cotovelos."],
    primarios: ["peitoral"],
    secundarios: ["deltoide_anterior", "triceps"],
  },
  "Crucifixo na máquina": {
    descricao: "Isola o peitoral com o movimento de \"abraçar\". Bom para terminar o treino de peito com menos esforço do tríceps.",
    execucao: [
      "Ajuste o banco para as pegadas ficarem na altura do peito.",
      "Com os cotovelos levemente dobrados, junte as pegadas à frente do corpo.",
      "Segure um segundo apertando o peito.",
      "Volte devagar até os braços ficarem alinhados com o tronco.",
    ],
    dicas: ["Não deixe o peso bater no fim do movimento.", "Mantenha as costas apoiadas no encosto."],
    primarios: ["peitoral"],
    secundarios: ["deltoide_anterior"],
  },
  "Flexão de braço": {
    descricao: "Exercício com o peso do corpo para peito, ombros e tríceps. Também exige estabilidade do abdômen.",
    execucao: [
      "Apoie as mãos no chão um pouco mais abertas que os ombros e estenda as pernas.",
      "Deixe o corpo reto, da cabeça aos calcanhares.",
      "Desça o peito até quase encostar no chão.",
      "Empurre o chão e volte à posição inicial.",
    ],
    dicas: ["Se estiver difícil, apoie os joelhos no chão.", "Não deixe o quadril cair nem subir demais."],
    primarios: ["peitoral"],
    secundarios: ["triceps", "deltoide_anterior", "abdomen"],
  },
  "Puxada frontal": {
    descricao: "Exercício de puxar na polia alta, que trabalha a largura das costas. Alternativa para quem ainda não faz barra fixa.",
    execucao: [
      "Sente com as coxas presas no apoio e segure a barra mais aberto que os ombros.",
      "Incline o tronco um pouco para trás, com o peito aberto.",
      "Puxe a barra até a altura do queixo, levando os cotovelos para baixo.",
      "Volte devagar até estender os braços.",
    ],
    dicas: ["Não puxe a barra atrás da nuca.", "Pense em puxar com os cotovelos, não com as mãos."],
    primarios: ["dorsal"],
    secundarios: ["biceps", "romboides", "deltoide_posterior"],
  },
  "Remada baixa": {
    descricao: "Remada sentado na polia baixa. Trabalha o meio das costas e ajuda na postura.",
    execucao: [
      "Sente com os pés apoiados e os joelhos levemente dobrados.",
      "Segure o puxador com o tronco ereto.",
      "Puxe o puxador até a barriga, aproximando as escápulas.",
      "Estenda os braços devagar, sem curvar as costas.",
    ],
    dicas: ["Não balance o tronco para trás para ajudar.", "Ombros longe das orelhas."],
    primarios: ["dorsal", "romboides"],
    secundarios: ["biceps", "deltoide_posterior", "trapezio"],
  },
  "Remada curvada": {
    descricao: "Remada com barra e tronco inclinado. Constrói espessura das costas e exige firmeza da lombar.",
    execucao: [
      "Em pé, segure a barra e incline o tronco à frente (uns 45°), joelhos levemente dobrados.",
      "Mantenha as costas retas e a barra perto das pernas.",
      "Puxe a barra até o umbigo, levando os cotovelos para trás.",
      "Desça a barra com controle.",
    ],
    dicas: ["Nunca arredonde a coluna.", "Comece com pouco peso até dominar a postura."],
    primarios: ["dorsal", "romboides"],
    secundarios: ["biceps", "lombar", "deltoide_posterior", "trapezio"],
  },
  "Barra fixa": {
    descricao: "Puxar o próprio corpo até a barra. Um dos melhores exercícios para costas e bíceps.",
    execucao: [
      "Segure a barra com as palmas para a frente, mãos um pouco mais abertas que os ombros.",
      "Comece pendurado, com os braços estendidos.",
      "Puxe o corpo até o queixo passar a barra.",
      "Desça devagar até estender os braços de novo.",
    ],
    dicas: ["Use o gráviton ou um elástico se ainda não consegue o próprio peso.", "Evite balançar as pernas."],
    primarios: ["dorsal"],
    secundarios: ["biceps", "romboides", "antebraco"],
  },
  "Desenvolvimento com halteres": {
    descricao: "Empurrar os halteres acima da cabeça. Principal exercício para força e volume dos ombros.",
    execucao: [
      "Sente com as costas apoiadas e os halteres na altura dos ombros.",
      "Empurre os halteres para cima até quase estender os braços.",
      "Desça devagar até a altura das orelhas.",
    ],
    dicas: ["Não arqueie a lombar.", "Mantenha o abdômen firme."],
    primarios: ["deltoide_anterior", "deltoide_lateral"],
    secundarios: ["triceps", "trapezio"],
  },
  "Elevação lateral": {
    descricao: "Isola a parte lateral do ombro, que dá a aparência de ombros mais largos.",
    execucao: [
      "Em pé, um halter em cada mão ao lado do corpo, cotovelos levemente dobrados.",
      "Eleve os braços pelas laterais até a altura dos ombros.",
      "Desça devagar.",
    ],
    dicas: ["Use carga leve: o movimento é mais importante.", "Não suba além da linha dos ombros nem balance o corpo."],
    primarios: ["deltoide_lateral"],
    secundarios: ["trapezio", "deltoide_anterior"],
  },
  "Elevação frontal": {
    descricao: "Eleva a anilha à frente do corpo, focando a parte da frente do ombro.",
    execucao: [
      "Em pé, segure a anilha com as duas mãos na frente das coxas.",
      "Com os braços quase estendidos, eleve a anilha até a altura dos olhos.",
      "Desça com controle.",
    ],
    dicas: ["Não jogue o tronco para trás.", "Mantenha os ombros baixos."],
    primarios: ["deltoide_anterior"],
    secundarios: ["deltoide_lateral", "peitoral"],
  },
  "Rosca direta": {
    descricao: "Exercício clássico para o bíceps, feito com barra.",
    execucao: [
      "Em pé, segure a barra com as palmas para cima, na largura dos ombros.",
      "Com os cotovelos colados ao corpo, dobre os braços levando a barra até o peito.",
      "Desça devagar até quase estender os braços.",
    ],
    dicas: ["Não balance o tronco.", "Os cotovelos ficam parados durante todo o movimento."],
    primarios: ["biceps"],
    secundarios: ["antebraco"],
  },
  "Rosca alternada": {
    descricao: "Rosca com halteres, um braço de cada vez, girando o punho. Corrige diferenças de força entre os lados.",
    execucao: [
      "Em pé, halteres ao lado do corpo com as palmas viradas para as coxas.",
      "Suba um halter girando o punho até a palma ficar para cima.",
      "Desça devagar e repita com o outro braço.",
    ],
    dicas: ["Faça o movimento inteiro, sem pressa.", "Não leve o cotovelo para a frente."],
    primarios: ["biceps"],
    secundarios: ["antebraco"],
  },
  "Rosca martelo": {
    descricao: "Rosca com a pegada neutra (palmas uma de frente para a outra). Trabalha bíceps e antebraço.",
    execucao: [
      "Em pé, halteres ao lado do corpo com as palmas viradas para dentro.",
      "Dobre os cotovelos levando os halteres até os ombros, sem girar o punho.",
      "Desça com controle.",
    ],
    dicas: ["Mantenha os punhos firmes.", "Pode ser feito alternado ou com os dois braços juntos."],
    primarios: ["biceps", "antebraco"],
    secundarios: [],
  },
  "Tríceps na polia": {
    descricao: "Extensão dos cotovelos na polia alta. Isola o tríceps com pouco risco para as articulações.",
    execucao: [
      "De frente para a polia, segure a barra ou a corda com os cotovelos colados ao corpo.",
      "Empurre para baixo até estender os braços.",
      "Volte devagar até os antebraços passarem da linha horizontal.",
    ],
    dicas: ["Só o antebraço se move.", "Não incline o corpo sobre o peso."],
    primarios: ["triceps"],
    secundarios: ["antebraco"],
  },
  "Tríceps testa": {
    descricao: "Extensão de cotovelos deitado, com barra W. Trabalha bem a cabeça longa do tríceps.",
    execucao: [
      "Deite no banco com a barra acima do peito, braços estendidos.",
      "Dobre só os cotovelos, levando a barra em direção à testa.",
      "Estenda os braços de volta.",
    ],
    dicas: ["Cotovelos apontados para o teto, sem abrir.", "Use carga moderada para proteger os cotovelos."],
    primarios: ["triceps"],
    secundarios: [],
  },
  "Mergulho no banco": {
    descricao: "Exercício com o peso do corpo usando um banco atrás de você. Trabalha tríceps e parte da frente do ombro.",
    execucao: [
      "Apoie as mãos na beira do banco, atrás do corpo, e estique as pernas à frente.",
      "Dobre os cotovelos e desça o quadril até os braços formarem 90°.",
      "Empurre o banco para voltar.",
    ],
    dicas: ["Mantenha as costas perto do banco.", "Se doer o ombro, desça menos."],
    primarios: ["triceps"],
    secundarios: ["deltoide_anterior", "peitoral"],
  },
  "Agachamento livre": {
    descricao: "Exercício mais completo para pernas e glúteos. Também fortalece o abdômen e a lombar.",
    execucao: [
      "Apoie a barra na parte de cima das costas (trapézio), pés na largura dos ombros.",
      "Respire fundo e firme o abdômen.",
      "Desça empurrando o quadril para trás e dobrando os joelhos, até as coxas ficarem paralelas ao chão.",
      "Suba empurrando o chão com os pés inteiros.",
    ],
    dicas: ["Joelhos seguem a direção dos pés, sem fechar para dentro.", "Coluna neutra o tempo todo.", "Calcanhares sempre no chão."],
    primarios: ["quadriceps", "gluteo_maximo"],
    secundarios: ["isquiotibiais", "adutores", "lombar", "abdomen"],
  },
  "Leg press 45°": {
    descricao: "Empurrar a plataforma com as pernas. Trabalha quadríceps e glúteos com as costas apoiadas.",
    execucao: [
      "Sente com as costas e o quadril colados no encosto, pés no meio da plataforma.",
      "Destrave a plataforma e desça dobrando os joelhos até uns 90°.",
      "Empurre a plataforma de volta, sem travar os joelhos.",
    ],
    dicas: ["O quadril não pode sair do banco no fim da descida.", "Pés mais altos na plataforma = mais glúteo e posterior."],
    primarios: ["quadriceps", "gluteo_maximo"],
    secundarios: ["isquiotibiais", "adutores"],
  },
  "Cadeira extensora": {
    descricao: "Isola o quadríceps, o músculo da frente da coxa.",
    execucao: [
      "Sente com o joelho alinhado ao eixo da máquina e o rolo na frente do tornozelo.",
      "Estenda as pernas até ficarem retas.",
      "Segure um segundo e desça devagar.",
    ],
    dicas: ["Não dê impulso com o corpo.", "Segure nas pegadas laterais para manter o quadril no banco."],
    primarios: ["quadriceps"],
    secundarios: [],
  },
  "Mesa flexora": {
    descricao: "Isola a parte de trás da coxa (isquiotibiais), importante para equilibrar as pernas e proteger os joelhos.",
    execucao: [
      "Deite de barriga para baixo com o rolo logo acima dos calcanhares.",
      "Dobre os joelhos trazendo o rolo em direção ao glúteo.",
      "Volte devagar sem deixar o peso bater.",
    ],
    dicas: ["Quadril colado no banco.", "Não faça o movimento com pressa."],
    primarios: ["isquiotibiais"],
    secundarios: ["panturrilha"],
  },
  "Panturrilha em pé": {
    descricao: "Subir na ponta dos pés com carga. Fortalece a panturrilha, usada para andar, correr e saltar.",
    execucao: [
      "Apoie a ponta dos pés na plataforma e os ombros sob as almofadas.",
      "Desça os calcanhares o máximo que conseguir.",
      "Suba na ponta dos pés o mais alto possível e segure um segundo.",
    ],
    dicas: ["Faça a amplitude toda, sem \"quicar\".", "Joelhos estendidos, mas sem travar."],
    primarios: ["panturrilha"],
    secundarios: [],
  },
  "Afundo com halteres": {
    descricao: "Exercício de uma perna por vez. Trabalha quadríceps e glúteos e melhora o equilíbrio.",
    execucao: [
      "Em pé, um halter em cada mão, dê um passo largo à frente.",
      "Desça até o joelho de trás quase encostar no chão.",
      "Empurre com a perna da frente para voltar. Troque de perna.",
    ],
    dicas: ["Tronco reto.", "O joelho da frente fica acima do pé, sem passar muito da ponta."],
    primarios: ["quadriceps", "gluteo_maximo"],
    secundarios: ["isquiotibiais", "adutores", "gluteo_medio"],
  },
  "Elevação pélvica": {
    descricao: "Elevar o quadril com a barra apoiada nele. Um dos exercícios que mais ativam o glúteo.",
    execucao: [
      "Sente no chão com a parte de cima das costas apoiada no banco e a barra sobre o quadril.",
      "Pés no chão, joelhos dobrados.",
      "Suba o quadril até o tronco ficar alinhado com as coxas, apertando o glúteo.",
      "Desça com controle.",
    ],
    dicas: ["Use uma proteção na barra.", "Não arqueie a lombar no alto: o movimento é do quadril."],
    primarios: ["gluteo_maximo"],
    secundarios: ["isquiotibiais", "gluteo_medio"],
  },
  "Cadeira abdutora": {
    descricao: "Abrir as pernas contra a resistência da máquina. Trabalha a lateral do quadril (glúteo médio).",
    execucao: [
      "Sente com as costas apoiadas e as almofadas do lado de fora dos joelhos.",
      "Abra as pernas o máximo que conseguir.",
      "Feche devagar, sem deixar o peso bater.",
    ],
    dicas: ["Inclinar o tronco um pouco à frente aumenta o trabalho do glúteo.", "Movimento controlado nas duas fases."],
    primarios: ["gluteo_medio"],
    secundarios: ["gluteo_maximo"],
  },
  "Glúteo na polia": {
    descricao: "Levar a perna para trás com a caneleira presa na polia baixa. Isola o glúteo.",
    execucao: [
      "Prenda a caneleira no tornozelo e fique de frente para a polia, segurando no apoio.",
      "Leve a perna para trás, com o joelho quase estendido.",
      "Volte devagar e repita. Depois troque de perna.",
    ],
    dicas: ["Não arqueie a coluna para subir mais a perna.", "Tronco levemente inclinado à frente."],
    primarios: ["gluteo_maximo"],
    secundarios: ["isquiotibiais", "gluteo_medio"],
  },
  "Abdominal supra": {
    descricao: "Abdominal tradicional, que trabalha principalmente a parte de cima do reto abdominal.",
    execucao: [
      "Deite com os joelhos dobrados e os pés no chão.",
      "Mãos cruzadas no peito ou atrás da cabeça, sem puxar o pescoço.",
      "Tire as escápulas do chão contraindo o abdômen.",
      "Desça devagar.",
    ],
    dicas: ["Solte o ar ao subir.", "O movimento é curto: não precisa sentar."],
    primarios: ["abdomen"],
    secundarios: ["obliquos"],
  },
  Prancha: {
    descricao: "Exercício isométrico (sem movimento) que fortalece o abdômen inteiro e ajuda a proteger a coluna.",
    execucao: [
      "Apoie os antebraços e a ponta dos pés no chão.",
      "Deixe o corpo reto, da cabeça aos calcanhares.",
      "Firme o abdômen e o glúteo e segure a posição pelo tempo indicado.",
    ],
    dicas: ["Não deixe o quadril cair.", "Respire normalmente durante o exercício."],
    primarios: ["abdomen"],
    secundarios: ["obliquos", "deltoide_anterior", "gluteo_maximo"],
  },
  "Abdominal infra na paralela": {
    descricao: "Elevar as pernas apoiado na paralela. Foca a parte de baixo do abdômen.",
    execucao: [
      "Apoie os antebraços na paralela, com as costas no encosto e as pernas penduradas.",
      "Suba os joelhos em direção ao peito, enrolando o quadril.",
      "Desça devagar, sem balançar.",
    ],
    dicas: ["Evite usar impulso.", "Quanto mais esticadas as pernas, mais difícil."],
    primarios: ["abdomen"],
    secundarios: ["obliquos"],
  },
  Esteira: {
    descricao: "Caminhada ou corrida. Melhora o condicionamento do coração e dos pulmões e ajuda no gasto de calorias.",
    execucao: [
      "Comece caminhando devagar por 3 a 5 minutos para aquecer.",
      "Aumente a velocidade (ou a inclinação) até a intensidade combinada com o instrutor.",
      "Termine diminuindo o ritmo por alguns minutos.",
    ],
    dicas: ["Não segure nas laterais o tempo todo.", "Mantenha o corpo ereto e olhe para a frente."],
    primarios: ["quadriceps", "panturrilha"],
    secundarios: ["isquiotibiais", "gluteo_maximo"],
  },
  "Bicicleta ergométrica": {
    descricao: "Pedalar parado. Exercício cardiovascular de baixo impacto, bom para quem tem dor nos joelhos.",
    execucao: [
      "Ajuste o banco: com o pedal embaixo, o joelho fica quase estendido.",
      "Pedale em ritmo leve por alguns minutos para aquecer.",
      "Ajuste a carga e mantenha o ritmo pelo tempo indicado.",
    ],
    dicas: ["Banco muito baixo força o joelho.", "Mantenha as costas retas."],
    primarios: ["quadriceps"],
    secundarios: ["isquiotibiais", "panturrilha", "gluteo_maximo"],
  },
  Burpee: {
    descricao: "Exercício de corpo inteiro que mistura agachamento, flexão e salto. Muito usado em treinos funcionais e para condicionamento.",
    execucao: [
      "Em pé, agache e apoie as mãos no chão.",
      "Jogue as pernas para trás, ficando em posição de flexão.",
      "Volte as pernas para perto das mãos.",
      "Levante e dê um salto com os braços para cima.",
    ],
    dicas: ["Faça em ritmo que consiga manter a técnica.", "Pode tirar o salto para diminuir o impacto."],
    primarios: ["quadriceps", "peitoral"],
    secundarios: ["gluteo_maximo", "triceps", "deltoide_anterior", "abdomen", "panturrilha"],
  },
};

/** Valores prontos para gravar nas colunas da tabela exercicio. */
export function colunasDoCatalogo(nome: string) {
  const info = CATALOGO[nome];
  if (!info) return null;
  return {
    descricao: info.descricao,
    execucao: info.execucao.join("\n"),
    dicas: info.dicas.join("\n"),
    musculos_primarios: info.primarios.join(","),
    musculos_secundarios: info.secundarios.join(","),
  };
}

/**
 * Animação de cada exercício: duas fotos (posição inicial e final) em public/exercicios/<pasta>/0.jpg e 1.jpg.
 * Fonte: Free Exercise DB (github.com/yuhonas/free-exercise-db), domínio público (licença Unlicense).
 * Mesmo estilo de foto e, na maioria, o mesmo modelo, sem som. O Burpee não existe nesse banco.
 */
export const ANIMACOES: Record<string, string> = {
  "Supino reto": "Barbell_Bench_Press_-_Medium_Grip",
  "Supino inclinado com halteres": "Incline_Dumbbell_Press",
  "Crucifixo na máquina": "Butterfly",
  "Flexão de braço": "Pushups",
  "Puxada frontal": "Wide-Grip_Lat_Pulldown",
  "Remada baixa": "Seated_Cable_Rows",
  "Remada curvada": "Bent_Over_Barbell_Row",
  "Barra fixa": "Pullups",
  "Desenvolvimento com halteres": "Seated_Dumbbell_Press",
  "Elevação lateral": "Side_Lateral_Raise",
  "Elevação frontal": "Front_Plate_Raise",
  "Rosca direta": "EZ-Bar_Curl",
  "Rosca alternada": "Dumbbell_Alternate_Bicep_Curl",
  "Rosca martelo": "Hammer_Curls",
  "Tríceps na polia": "Triceps_Pushdown",
  "Tríceps testa": "EZ-Bar_Skullcrusher",
  "Mergulho no banco": "Bench_Dips",
  "Agachamento livre": "Barbell_Full_Squat",
  "Leg press 45°": "Leg_Press",
  "Cadeira extensora": "Leg_Extensions",
  "Mesa flexora": "Lying_Leg_Curls",
  "Panturrilha em pé": "Standing_Calf_Raises",
  "Afundo com halteres": "Dumbbell_Lunges",
  "Elevação pélvica": "Barbell_Hip_Thrust",
  "Cadeira abdutora": "Thigh_Abductor",
  "Glúteo na polia": "One-Legged_Cable_Kickback",
  "Abdominal supra": "Crunches",
  "Prancha": "Plank",
  "Abdominal infra na paralela": "Knee_Hip_Raise_On_Parallel_Bars",
  "Esteira": "Walking_Treadmill",
  "Bicicleta ergométrica": "Bicycling_Stationary",
};
/**
 * Links do YouTube que a versão 5 colocou nos exercícios e que foram substituídos pelas animações na versão 6.
 * Usados só pela migração para limpar esses links (um link cadastrado pela equipe não é apagado).
 */
export const VIDEOS_V5: Record<string, string> = {
  // Deyque Peterson Pires Souza · Supino reto com barra - Execução Correta
  "Supino reto": "https://www.youtube.com/watch?v=ZN7SuDQpNMk",
  // Treino Mestre · Supino inclinado com halteres: Execução correta e músculos solicitados
  "Supino inclinado com halteres": "https://www.youtube.com/watch?v=G-i3jMIbDmo",
  // Clube Fitness App · Como executar corretamente o exercício Crucifixo no Peck Deck - Clube.Fitness
  "Crucifixo na máquina": "https://www.youtube.com/watch?v=Slz8I1rybUY",
  // Guilherme Stellbrink I FisioPrev · COMO FAZER FLEXÃO DE BRAÇO CORRETAMENTE - Fisioprev com Isabella Leoni
  "Flexão de braço": "https://www.youtube.com/watch?v=xgqFpfoQEEs",
  // Liria Freitas · Puxada frontal - Maneira correta de executar
  "Puxada frontal": "https://www.youtube.com/watch?v=ScK9NUack_k",
  // Treino Mestre · Remada baixa com triângulo - Como fazer e postura correta
  "Remada baixa": "https://www.youtube.com/watch?v=2YebbYuuBJQ",
  // Laércio Refundini - Aulas · Como fazer a Remada Curvada com Barra
  "Remada curvada": "https://www.youtube.com/watch?v=VJHBEy2duVc",
  // Alan Batista Personal e Fisioterapeuta · MUSCULAÇÃO: EXERCÍCIO BARRA FIXA - PEGADA PRONADA
  "Barra fixa": "https://www.youtube.com/watch?v=cudjKsC_5XU",
  // Laércio Refundini - Aulas · Como fazer o Desenvolvimento com Halteres (Aprenda em 1 Minuto)
  "Desenvolvimento com halteres": "https://www.youtube.com/watch?v=eufDL9MmF8A",
  // Thiago Gallina | Treinador · Como fazer a elevação lateral com halteres
  "Elevação lateral": "https://www.youtube.com/watch?v=gURBTU9VSJg",
  // Ademar Rodrigues Personal · COMO FAZER ELEVAÇÃO FRONTAL COM ANILHA?
  "Elevação frontal": "https://www.youtube.com/watch?v=oNqxsWGvZBM",
  // MyTrainingPRO · Rosca Direta com Barra W - Exercício para Bíceps
  "Rosca direta": "https://www.youtube.com/watch?v=017j7Gbxipo",
  // Prof. Matheus Gomes · Rosca alternada com halteres - prof. Matheus Gomes
  "Rosca alternada": "https://www.youtube.com/watch?v=pdzDa9CwJ2Y",
  // Mariana Sardelli · Rosca Martelo - Execução Exercício
  "Rosca martelo": "https://www.youtube.com/watch?v=sBsoX4Sn4iw",
  // FISIculturismo.com.br · Tríceps na Polia Alta (Tríceps Pulley)
  "Tríceps na polia": "https://www.youtube.com/watch?v=gPJo1ZDGiS4",
  // Traineo · Tríceps Testa com Barra W
  "Tríceps testa": "https://www.youtube.com/watch?v=hr8YcdGHtLQ",
  // Fit Challenge · Tríceps banco ou Tríceps Mergulho - Como fazer!
  "Mergulho no banco": "https://www.youtube.com/watch?v=qAKB1H2kz2g",
  // Treino Mestre · Agachamento livre com barra - Como fazer corretamente
  "Agachamento livre": "https://www.youtube.com/watch?v=rM6SDUdl9fs",
  // Isabella Duarte Personal Online · LEG PRESS 45: COMO FAZER E ATÉ ONDE DESCER?
  "Leg press 45°": "https://www.youtube.com/watch?v=itJDw9I1qu4",
  // Dan Champions · Cadeira Extensora - Série Execução Perfeita
  "Cadeira extensora": "https://www.youtube.com/watch?v=--p0Ff7R-Io",
  // Treino Mestre · Mesa Flexora - Como fazer corretamente e otimizar os resultados!
  "Mesa flexora": "https://www.youtube.com/watch?v=8Nat6GRiEoc",
  // FISIculturismo.com.br · Panturrilha em pé na máquina
  "Panturrilha em pé": "https://www.youtube.com/watch?v=qWHH0We_9r0",
  // FISIculturismo.com.br · Afundo com halter (agachamento unilateral): como fazer [certo!] e benefícios 🏋🏻‍♂️
  "Afundo com halteres": "https://www.youtube.com/watch?v=mKRq_p3hQr4",
  // VOLL TV · Elevação pélvica: passo a passo para fazer corretamente
  "Elevação pélvica": "https://www.youtube.com/watch?v=kvmT_ZlgVI0",
  // Treino Mestre · Cadeira Abdutora: Como fazer e Postura correta
  "Cadeira abdutora": "https://www.youtube.com/watch?v=50qHGus1TZk",
  // ANA SENSOLO · GLÚTEO coice na polia - Como fazer do jeito CERTO e sem DOR na lombar
  "Glúteo na polia": "https://www.youtube.com/watch?v=S2_Rsx-Ud2w",
  // Prof. Fernando Hiroyuki · Como fazer abdominal supra
  "Abdominal supra": "https://www.youtube.com/watch?v=jIzXV7aj0GU",
  // VOLL TV · Como fazer a prancha abdominal corretamente
  "Prancha": "https://www.youtube.com/watch?v=Yu0wjtD5FkU",
  // Aletea Souza (Personal Trainer) · Abdominal infra na paralela
  "Abdominal infra na paralela": "https://www.youtube.com/watch?v=XCiOup1JEi8",
  // Viver Bem · Saiba como utilizar corretamente a esteira
  "Esteira": "https://www.youtube.com/watch?v=nQdMzvhaSrI",
  // Revokes Oficial · Como regular uma Bicicleta Ergométrica em casa| Dream Fitness Ex
  "Bicicleta ergométrica": "https://www.youtube.com/watch?v=szAdFvQZXtI",
  // Treino Mestre · Burpee: Como fazer, Dicas e Treino
  "Burpee": "https://www.youtube.com/watch?v=ApxlA_sn2yc",
};
