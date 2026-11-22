-- Modelo do banco de dados · Pulso (gestão de academia) · versão 6
-- SQLite. Este arquivo é executado automaticamente ao abrir o banco (CREATE ... IF NOT EXISTS).
-- Datas ficam como texto ISO (AAAA-MM-DD), horas como HH:MM:SS e dinheiro em centavos (inteiro),
-- para evitar erro de arredondamento.

-- ---------------------------------------------------------------------------------------------
-- Pessoas
-- ---------------------------------------------------------------------------------------------

-- Instrutores (professores) da academia. Cada aluno pode ter um instrutor responsável pelo treino.
CREATE TABLE IF NOT EXISTS instrutor (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT    NOT NULL CHECK (length(nome) BETWEEN 3 AND 80),
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  telefone      TEXT    NOT NULL,
  especialidade TEXT    NOT NULL DEFAULT '' CHECK (length(especialidade) <= 60),
  ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);

-- Quem pode entrar no sistema. A senha é guardada como hash scrypt, nunca em texto puro.
-- perfil define o que a pessoa pode fazer (veja lib/permissoes.ts).
-- Um usuário com perfil "instrutor" pode estar ligado ao cadastro de um instrutor.
CREATE TABLE IF NOT EXISTS usuario (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT    NOT NULL CHECK (length(nome) BETWEEN 3 AND 80),
  email        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash   TEXT    NOT NULL,
  perfil       TEXT    NOT NULL CHECK (perfil IN ('admin', 'recepcao', 'instrutor')),
  instrutor_id INTEGER REFERENCES instrutor (id) ON DELETE SET NULL,
  ativo        INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  criado_em    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Planos vendidos pela academia. O preço é o valor total do período (ex.: anual = 12 meses).
CREATE TABLE IF NOT EXISTS plano (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT    NOT NULL UNIQUE COLLATE NOCASE CHECK (length(nome) BETWEEN 3 AND 30),
  preco_centavos INTEGER NOT NULL CHECK (preco_centavos > 0),
  meses          INTEGER NOT NULL CHECK (meses BETWEEN 1 AND 24)
);

-- Alunos. O plano e a situação financeira NÃO ficam aqui: vêm das tabelas matricula e pagamento.
-- ativo = 0 significa que o aluno saiu da academia (cadastro mantido para histórico).
-- codigo é o texto do QR code da carteirinha, usado no check-in rápido.
CREATE TABLE IF NOT EXISTS aluno (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT    NOT NULL CHECK (length(nome) BETWEEN 3 AND 80),
  email        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  telefone     TEXT    NOT NULL CHECK (length(telefone) BETWEEN 10 AND 11 AND telefone NOT GLOB '*[^0-9]*'),
  cpf          TEXT    NOT NULL UNIQUE CHECK (length(cpf) = 11 AND cpf NOT GLOB '*[^0-9]*'),
  nascimento   TEXT    NOT NULL CHECK (nascimento GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  instrutor_id INTEGER REFERENCES instrutor (id) ON DELETE SET NULL,
  ativo        INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  codigo       TEXT    NOT NULL UNIQUE,
  cadastro     TEXT    NOT NULL CHECK (cadastro GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  -- Senha do portal do aluno (hash scrypt). Vazia = o aluno ainda não fez o primeiro acesso.
  senha_hash   TEXT
);

CREATE INDEX IF NOT EXISTS idx_aluno_instrutor ON aluno (instrutor_id);

-- ---------------------------------------------------------------------------------------------
-- Matrículas e pagamentos
-- ---------------------------------------------------------------------------------------------

-- Cada matrícula liga um aluno a um plano por um período (início e fim).
-- Renovar = criar uma nova matrícula que começa no dia seguinte ao fim da anterior.
-- valor_centavos guarda o preço do plano no dia da matrícula (se o preço mudar, o contrato não muda).
-- ON DELETE RESTRICT no plano: não deixa apagar um plano que já foi usado em alguma matrícula.
CREATE TABLE IF NOT EXISTS matricula (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id             INTEGER NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
  plano_id             INTEGER NOT NULL REFERENCES plano (id) ON DELETE RESTRICT,
  inicio               TEXT    NOT NULL CHECK (inicio GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  fim                  TEXT    NOT NULL CHECK (fim GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  valor_centavos       INTEGER NOT NULL CHECK (valor_centavos > 0),
  renovacao_automatica INTEGER NOT NULL DEFAULT 0 CHECK (renovacao_automatica IN (0, 1)),
  cancelada_em         TEXT,
  CHECK (fim >= inicio)
);

CREATE INDEX IF NOT EXISTS idx_matricula_aluno ON matricula (aluno_id, inicio);
CREATE INDEX IF NOT EXISTS idx_matricula_plano ON matricula (plano_id);
CREATE INDEX IF NOT EXISTS idx_matricula_fim   ON matricula (fim);

-- Parcelas de cada matrícula (um plano trimestral vira 3 parcelas mensais, por exemplo).
-- Enquanto não foi paga, pago_em e forma ficam vazios; depois de paga, os dois são obrigatórios.
-- "Pagamento pendente" é calculado: existe parcela vencida (vencimento < hoje) e não paga.
CREATE TABLE IF NOT EXISTS pagamento (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  matricula_id   INTEGER NOT NULL REFERENCES matricula (id) ON DELETE CASCADE,
  parcela        INTEGER NOT NULL CHECK (parcela >= 1),
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  vencimento     TEXT    NOT NULL CHECK (vencimento GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  pago_em        TEXT    CHECK (pago_em IS NULL OR pago_em GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  forma          TEXT    CHECK (forma IS NULL OR forma IN ('pix', 'cartao', 'dinheiro', 'boleto')),
  -- Quando o aluno avisou pelo portal que pagou por Pix (a recepção confere e registra o pagamento).
  informado_em   TEXT,
  CHECK ((pago_em IS NULL) = (forma IS NULL)),
  UNIQUE (matricula_id, parcela)
);

CREATE INDEX IF NOT EXISTS idx_pagamento_vencimento ON pagamento (vencimento);
CREATE INDEX IF NOT EXISTS idx_pagamento_pago_em    ON pagamento (pago_em);

-- ---------------------------------------------------------------------------------------------
-- Frequência
-- ---------------------------------------------------------------------------------------------

-- Entradas na academia. Um aluno só pode ter uma entrada por dia.
-- saida vazia = o aluno ainda está dentro (usado na lotação ao vivo).
-- ON DELETE CASCADE: ao excluir um aluno, o histórico dele some junto.
CREATE TABLE IF NOT EXISTS presenca (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id INTEGER NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
  data     TEXT    NOT NULL CHECK (data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  hora     TEXT    NOT NULL CHECK (hora GLOB '[0-2][0-9]:[0-5][0-9]:[0-5][0-9]'),
  saida    TEXT    CHECK (saida IS NULL OR saida GLOB '[0-2][0-9]:[0-5][0-9]:[0-5][0-9]'),
  CHECK (saida IS NULL OR saida >= hora),
  UNIQUE (aluno_id, data)
);

CREATE INDEX IF NOT EXISTS idx_presenca_data ON presenca (data);

-- ---------------------------------------------------------------------------------------------
-- Treinos
-- ---------------------------------------------------------------------------------------------

-- Biblioteca de exercícios usada para montar as fichas e mostrada no portal do aluno.
-- musculos_primarios / musculos_secundarios: ids separados por vírgula (lista em lib/musculos.ts).
-- execucao: um passo por linha. video_url: link do YouTube ou de um arquivo .mp4 (opcional).
CREATE TABLE IF NOT EXISTS exercicio (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                 TEXT    NOT NULL UNIQUE COLLATE NOCASE CHECK (length(nome) BETWEEN 3 AND 60),
  grupo                TEXT    NOT NULL CHECK (grupo IN ('peito', 'costas', 'ombros', 'biceps', 'triceps', 'pernas', 'gluteos', 'abdomen', 'cardio', 'corpo_todo')),
  equipamento          TEXT    NOT NULL CHECK (length(equipamento) BETWEEN 2 AND 40),
  descricao            TEXT    NOT NULL DEFAULT '' CHECK (length(descricao) <= 400),
  execucao             TEXT    NOT NULL DEFAULT '' CHECK (length(execucao) <= 1200),
  dicas                TEXT    NOT NULL DEFAULT '' CHECK (length(dicas) <= 600),
  musculos_primarios   TEXT    NOT NULL DEFAULT '',
  musculos_secundarios TEXT    NOT NULL DEFAULT '',
  video_url            TEXT    NOT NULL DEFAULT '' CHECK (length(video_url) <= 300),
  -- Pasta da animação em public/exercicios/<pasta>/ (duas fotos: 0.jpg e 1.jpg). Vazio = sem animação.
  animacao             TEXT    NOT NULL DEFAULT '' CHECK (animacao NOT GLOB '*[^A-Za-z0-9_-]*')
);

-- Fichas de treino do aluno (A, B, C...). Cada aluno tem no máximo uma ficha por letra.
CREATE TABLE IF NOT EXISTS ficha (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id      INTEGER NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
  letra         TEXT    NOT NULL CHECK (letra IN ('A', 'B', 'C', 'D', 'E')),
  objetivo      TEXT    NOT NULL DEFAULT '' CHECK (length(objetivo) <= 60),
  instrutor_id  INTEGER REFERENCES instrutor (id) ON DELETE SET NULL,
  atualizada_em TEXT    NOT NULL,
  -- Dias da semana em que a ficha é feita (0 = segunda ... 6 = domingo), separados por vírgula. Vazio = sem dia fixo.
  dias          TEXT    NOT NULL DEFAULT '',
  UNIQUE (aluno_id, letra)
);

-- Exercícios de cada ficha. ON DELETE RESTRICT: não deixa apagar um exercício que está em uso.
CREATE TABLE IF NOT EXISTS ficha_item (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ficha_id     INTEGER NOT NULL REFERENCES ficha (id) ON DELETE CASCADE,
  exercicio_id INTEGER NOT NULL REFERENCES exercicio (id) ON DELETE RESTRICT,
  ordem        INTEGER NOT NULL,
  series       INTEGER NOT NULL CHECK (series BETWEEN 1 AND 10),
  repeticoes   TEXT    NOT NULL CHECK (length(repeticoes) BETWEEN 1 AND 12),
  carga_kg     REAL    CHECK (carga_kg IS NULL OR carga_kg BETWEEN 0 AND 500),
  descanso_seg INTEGER CHECK (descanso_seg IS NULL OR descanso_seg BETWEEN 0 AND 600)
);

CREATE INDEX IF NOT EXISTS idx_ficha_item_ficha ON ficha_item (ficha_id, ordem);
CREATE INDEX IF NOT EXISTS idx_ficha_item_exercicio ON ficha_item (exercicio_id);

-- Treinos que o aluno marcou como concluídos no portal (a letra é copiada: o histórico fica mesmo se a ficha mudar).
CREATE TABLE IF NOT EXISTS treino_feito (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id INTEGER NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
  data     TEXT    NOT NULL CHECK (data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  letra    TEXT    NOT NULL CHECK (letra IN ('A', 'B', 'C', 'D', 'E')),
  UNIQUE (aluno_id, data, letra)
);

CREATE INDEX IF NOT EXISTS idx_treino_feito_aluno ON treino_feito (aluno_id, data);

-- Avaliações físicas (histórico). Uma por aluno por dia.
CREATE TABLE IF NOT EXISTS avaliacao (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id     INTEGER NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
  data         TEXT    NOT NULL CHECK (data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  peso_kg      REAL    NOT NULL CHECK (peso_kg BETWEEN 20 AND 300),
  altura_cm    REAL    NOT NULL CHECK (altura_cm BETWEEN 100 AND 250),
  gordura_pct  REAL    CHECK (gordura_pct IS NULL OR gordura_pct BETWEEN 2 AND 70),
  cintura_cm   REAL    CHECK (cintura_cm IS NULL OR cintura_cm BETWEEN 30 AND 250),
  quadril_cm   REAL    CHECK (quadril_cm IS NULL OR quadril_cm BETWEEN 30 AND 250),
  braco_cm     REAL    CHECK (braco_cm IS NULL OR braco_cm BETWEEN 10 AND 80),
  coxa_cm      REAL    CHECK (coxa_cm IS NULL OR coxa_cm BETWEEN 20 AND 120),
  instrutor_id INTEGER REFERENCES instrutor (id) ON DELETE SET NULL,
  UNIQUE (aluno_id, data)
);

-- Cargas que o aluno anota no portal, para acompanhar a evolução de força em cada exercício.
CREATE TABLE IF NOT EXISTS carga_registro (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  aluno_id     INTEGER NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
  exercicio_id INTEGER NOT NULL REFERENCES exercicio (id) ON DELETE CASCADE,
  data         TEXT    NOT NULL CHECK (data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  carga_kg     REAL    NOT NULL CHECK (carga_kg BETWEEN 0 AND 500),
  repeticoes   INTEGER CHECK (repeticoes IS NULL OR repeticoes BETWEEN 1 AND 100),
  UNIQUE (aluno_id, exercicio_id, data)
);

CREATE INDEX IF NOT EXISTS idx_carga_exercicio ON carga_registro (exercicio_id);

-- ---------------------------------------------------------------------------------------------
-- Aulas coletivas
-- ---------------------------------------------------------------------------------------------

-- Grade semanal de aulas (uma linha por dia e horário). dia_semana: 0 = segunda ... 6 = domingo.
CREATE TABLE IF NOT EXISTS aula (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT    NOT NULL CHECK (length(nome) BETWEEN 3 AND 40),
  dia_semana   INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora         TEXT    NOT NULL CHECK (hora GLOB '[0-2][0-9]:[0-5][0-9]'),
  duracao_min  INTEGER NOT NULL CHECK (duracao_min BETWEEN 15 AND 180),
  vagas        INTEGER NOT NULL CHECK (vagas BETWEEN 1 AND 200),
  sala         TEXT    NOT NULL DEFAULT '' CHECK (length(sala) <= 30),
  instrutor_id INTEGER REFERENCES instrutor (id) ON DELETE SET NULL,
  ativo        INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1))
);

-- Reservas dos alunos em uma aula numa data específica.
CREATE TABLE IF NOT EXISTS aula_reserva (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  aula_id   INTEGER NOT NULL REFERENCES aula (id) ON DELETE CASCADE,
  aluno_id  INTEGER NOT NULL REFERENCES aluno (id) ON DELETE CASCADE,
  data      TEXT    NOT NULL CHECK (data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  criada_em TEXT    NOT NULL,
  UNIQUE (aula_id, data, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_reserva_aula_data ON aula_reserva (aula_id, data);
CREATE INDEX IF NOT EXISTS idx_reserva_aluno ON aula_reserva (aluno_id, data);

-- ---------------------------------------------------------------------------------------------
-- Comunicação
-- ---------------------------------------------------------------------------------------------

-- Avisos da academia mostrados no portal do aluno (feriados, manutenção, eventos...).
CREATE TABLE IF NOT EXISTS aviso (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo    TEXT    NOT NULL CHECK (length(titulo) BETWEEN 3 AND 80),
  texto     TEXT    NOT NULL CHECK (length(texto) BETWEEN 3 AND 600),
  criado_em TEXT    NOT NULL,
  expira_em TEXT    CHECK (expira_em IS NULL OR expira_em GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  fixado    INTEGER NOT NULL DEFAULT 0 CHECK (fixado IN (0, 1)),
  autor_id  INTEGER REFERENCES usuario (id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------------------------
-- Sistema
-- ---------------------------------------------------------------------------------------------

-- Configurações simples (chave/valor), ex.: capacidade máxima da academia.
CREATE TABLE IF NOT EXISTS config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

-- Tentativas de login, para bloquear quem erra a senha muitas vezes seguidas.
CREATE TABLE IF NOT EXISTS login_tentativa (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  email   TEXT    NOT NULL COLLATE NOCASE,
  ip      TEXT    NOT NULL,
  quando  INTEGER NOT NULL, -- segundos desde 1970 (Unix)
  sucesso INTEGER NOT NULL CHECK (sucesso IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_login_email ON login_tentativa (email, quando);
CREATE INDEX IF NOT EXISTS idx_login_ip    ON login_tentativa (ip, quando);

-- Log de auditoria: quem fez o quê e quando. O e-mail é copiado para o registro não se perder
-- se o usuário for excluído depois.
CREATE TABLE IF NOT EXISTS auditoria (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  quando        TEXT    NOT NULL, -- AAAA-MM-DD HH:MM:SS (horário de São Paulo)
  usuario_id    INTEGER REFERENCES usuario (id) ON DELETE SET NULL,
  usuario_email TEXT    NOT NULL,
  acao          TEXT    NOT NULL,
  entidade      TEXT    NOT NULL,
  entidade_id   INTEGER,
  descricao     TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auditoria_quando ON auditoria (quando);

-- Lixeira para o "desfazer": antes de excluir, o registro (e tudo que depende dele) é copiado
-- para cá em JSON. Desfazer recoloca as linhas com os mesmos ids.
CREATE TABLE IF NOT EXISTS lixeira (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  entidade     TEXT    NOT NULL,
  entidade_id  INTEGER NOT NULL,
  descricao    TEXT    NOT NULL,
  dados        TEXT    NOT NULL,
  excluido_em  INTEGER NOT NULL, -- segundos desde 1970 (Unix)
  usuario_id   INTEGER REFERENCES usuario (id) ON DELETE SET NULL,
  restaurado   INTEGER NOT NULL DEFAULT 0 CHECK (restaurado IN (0, 1))
);
