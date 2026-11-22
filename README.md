# Pulso · Gestão de Academia

Sistema web para gerenciar uma academia: **alunos, matrículas, pagamentos, treinos, avaliações físicas,
frequência e equipe**. Projeto da disciplina de desenvolvimento de sistemas (SENAI), tema **Academia**.

## Funcionalidades

### Painel
- Indicadores: alunos ativos, entradas do dia, **inadimplência** (alunos e valor em atraso), **receita do mês**
  (recebido de verdade × previsto).
- Listas de atenção: **inadimplentes**, **vencimentos nos próximos 7 dias** e **alunos em risco** (matrícula válida e
  mais de 14 dias sem treinar).
- Gráficos: receita mensal (previsto × recebido), entradas por dia (30 dias), média por dia da semana e horários de pico.

### Alunos
- Cadastro com **máscaras e validação** de CPF (dígitos verificadores), telefone e data de nascimento.
- Lista com busca, filtros (situação, plano, instrutor), ordenação e **paginação feitas no banco**.
- **Situação calculada automaticamente**: ativo, pagamento pendente (parcela vencida e não paga), matrícula vencida ou inativo.
- **Perfil do aluno**: dados, carteirinha com **QR code**, matrícula atual e histórico, parcelas (receber/estornar),
  resumo do treino, mapa de frequência e evolução física.

### Portal do aluno (`/aluno`)
- Área separada para o aluno, pensada para o celular: **primeiro acesso** com CPF + data de nascimento do cadastro,
  depois e-mail + senha (com o mesmo bloqueio de tentativas da equipe).
- **Início**: treino de hoje, rotina da semana, próxima mensalidade, dias até o fim do plano, treinos no mês e **conquistas**.
- **Meu treino**: fichas com séries, repetições, carga e descanso; rotina por dia da semana; botão **"Concluí a ficha"**.
- **Exercícios**: biblioteca com **animação da execução** (fotos sem som, no mesmo padrão), explicação do que trabalha, passo a passo, dicas e **mapa do
  corpo com os músculos** principais e auxiliares (filtros por grupo, músculo e "só os do meu treino").
- **Modelo anatômico detalhado** (frente e costas, masculino e feminino, claro e escuro) na aba Exercícios: tocar num
  músculo mostra os exercícios que trabalham ele. Ilustração e áreas da biblioteca
  [js-rich-body-highlighter](https://github.com/crmapache/js-rich-body-highlighter) (licença MIT).
- **Aulas coletivas**: grade dos próximos 7 dias com vagas livres; reservar e cancelar (limite de vagas, sem conflito de horário).
- **Pagar com Pix**: QR code e "copia e cola" gerados para cada parcela; o aluno toca em "Já fiz o Pix" e a recepção confere.
- **Avisos da academia** na tela inicial e **registro de carga** em cada exercício, com gráfico de evolução de força.
- **Instalável no celular** (app web): ícone próprio e abertura em tela cheia, direto no portal.
- **Mensalidade** (parcelas em aberto e pagas), **Plano** (período, renovação, comparação de planos), **Frequência**,
  **Evolução** (gráficos e IMC), **Carteirinha** em tela cheia e **Perfil** (troca de senha).
- O aluno só vê os próprios dados; a sessão do aluno não abre as telas da equipe.

### Matrículas e pagamentos
- Matrícula liga aluno ↔ plano com **início, fim e renovação automática** opcional.
- Cada matrícula gera **parcelas mensais** que somam exatamente o valor do plano.
- Renovar (a nova matrícula começa no dia seguinte ao fim da atual), cancelar e ligar/desligar a renovação automática.
- Tela **Financeiro**: inadimplência, vencimentos próximos, pagamentos recebidos por mês e **Pix a conferir**
  (o que os alunos avisaram que pagaram), além da configuração da chave Pix da academia.
- **Aulas coletivas** (equipe): grade semanal, vagas, sala, instrutor e lista de reservados de cada aula.
- **Avisos**: a recepção publica avisos (com data para sair e opção de fixar) que aparecem no portal.

### Treinos
- **Cadastro de exercícios** (grupo muscular e equipamento).
- Exercícios com **vídeo** (link do YouTube ou .mp4), descrição, passo a passo, dicas e músculos trabalhados.
- **Fichas A/B/C/D/E** por aluno, com séries, repetições, carga, descanso, ordem dos exercícios e **dias da semana**.
- **Avaliação física** (peso, altura, % de gordura, medidas) com IMC e **gráficos de evolução**.

### Frequência
- **Check-in rápido**: digite o nome e aperte Enter, use o código da carteirinha, um leitor de QR USB ou a câmera.
- Bloqueia a entrada de aluno inativo, com matrícula vencida ou com a academia lotada; avisa se há pagamento pendente.
- **Lotação ao vivo** (quem está dentro, capacidade máxima configurável), com atualização a cada 30 s e registro de saída.

### Equipe e segurança
- **Instrutores** e **usuários** com **perfis de acesso**: administrador, recepção e instrutor (cada um só vê e faz o que pode).
- **Bloqueio de login** após 5 senhas erradas para o mesmo e-mail (ou 20 do mesmo IP) por 15 minutos.
- **Auditoria**: registro de quem fez o quê e quando (inclusive logins, falhas e exportações).
- **Excluir com confirmação e desfazer**: depois de excluir aparece um aviso com "Desfazer" (5 minutos), que restaura
  o registro e tudo que dependia dele.

### Relatórios
- **Exportar CSV e PDF**: alunos (com os filtros da tela), inadimplência, vencimentos, alunos em risco, pagamentos do
  mês, frequência do dia e auditoria.

### Interface
- Tema escuro (padrão) e claro, layout responsivo (computador e celular).
- Dados fictícios de demonstração carregados automaticamente.

## Tecnologias e por que foram escolhidas

| Tecnologia | Uso | Motivo |
|---|---|---|
| Next.js 16 (App Router) + React 19 + TypeScript | Telas e servidor no mesmo projeto | Conteúdo estudado no curso; as *Server Actions* gravam direto no banco sem uma API separada |
| SQLite (`better-sqlite3`) | Banco de dados relacional | É um arquivo local: não precisa instalar servidor de banco, qualquer pessoa roda o projeto |
| SQL puro (`db/schema.sql`) | Tabelas, chaves e restrições | Deixa o modelo do banco visível e fácil de explicar |
| `qrcode` | QR code da carteirinha | Gera a imagem (SVG) no servidor |
| CSS próprio | Estilo | Tema escuro/claro por variáveis CSS (`app/globals.css`) |
| `node:test` | Testes automatizados | Já vem com o Node, sem biblioteca extra |
| GitHub Actions | Integração contínua | Roda lint, tipos, testes e build a cada envio |

O PDF e o CSV são gerados por código próprio (`lib/pdf.ts` e `lib/csv.ts`), sem biblioteca externa.

## Pré-requisitos

- **Node.js 22.18 ou mais novo** (baixe a versão "LTS" em <https://nodejs.org>). Confira com `node -v`.
- Nenhum banco de dados para instalar.

## Como rodar

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

Na **primeira execução** o sistema cria sozinho o banco (`data/pulso.db`), as tabelas e os dados fictícios.
Bancos das versões 2 a 5 são atualizados sozinhos para a versão 6, sem perder dados. Um banco da versão 1 é guardado como
`data/pulso.v1.bak.db` e um novo é criado.

### Logins de demonstração

| Perfil | E-mail | Senha | Pode |
|---|---|---|---|
| Administrador | `admin@pulso.com` | `admin123` | Tudo, inclusive usuários, planos e auditoria |
| Recepção | `recepcao@pulso.com` | `recepcao123` | Alunos, financeiro, check-in e relatórios |
| Instrutor | `instrutor@pulso.com` | `instrutor123` | Check-in, treinos, exercícios e avaliações |
| Aluno (portal) | aparece na tela `/aluno/entrar` | `aluno123` | Área do aluno: treino, exercícios, mensalidade, plano... |

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` e `npm start` | Versão de produção, também em <http://localhost:3000> |
| `npm test` | Roda os testes automatizados |
| `npm run check` | Lint + verificação de tipos + testes |
| `npm run db:reset` | Apaga o banco; na próxima execução ele volta com os dados de demonstração (pare o servidor antes) |
| `npm run db:backup` | Cópia de segurança do banco em `backups/` (guarda as 10 mais recentes) |
| `npm run db:restore -- backups/arquivo.db` | Restaura uma cópia (pare o servidor antes; sem o arquivo, lista as cópias disponíveis) |

Opcional: copie `.env.example` para `.env.local` e troque `AUTH_SECRET` por um texto longo e aleatório
(obrigatório se o sistema for usado de verdade).

## Problemas comuns

- **Erro com `node-gyp` ou `better-sqlite3` no `npm install`:** confira se o arquivo `.npmrc` está na pasta e se o Node
  é 22.18 ou mais novo (`node -v`).
- **A porta 3000 já está em uso:** rode `npm run dev -- -p 3001` e abra <http://localhost:3001>.
- **"Muitas tentativas" no login:** é o bloqueio de segurança; espere 15 minutos ou rode `npm run db:reset`.
- **A câmera não aparece no check-in:** o leitor pela câmera usa o `BarcodeDetector` (Chrome e Edge). Nos outros
  navegadores use o nome, o código ou um leitor USB.

## Banco de dados

Modelo completo (diagrama, dicionário de dados e regras) em [`docs/MODELO-DO-BANCO.md`](docs/MODELO-DO-BANCO.md).
O SQL está em [`db/schema.sql`](db/schema.sql).

Resumo: `aluno` 1—N `matricula` 1—N `pagamento`; `plano` 1—N `matricula`; `aluno` 1—N `presenca`, `ficha`
(1—N `ficha_item` N—1 `exercicio`) e `avaliacao`; `instrutor` 1—N alunos, fichas e avaliações; mais `usuario`,
`auditoria`, `login_tentativa`, `lixeira` e `config`.

## Estrutura do projeto

```
app/
  login/                 tela de login, bloqueio de tentativas
  (app)/                 área logada
    painel/              indicadores, listas de atenção e gráficos
    alunos/              lista, cadastro, perfil ([id]) e treino ([id]/treino)
    financeiro/          inadimplência, vencimentos, recebidos
    frequencia/          check-in rápido e lotação ao vivo
    exercicios/ instrutores/ planos/ usuarios/ auditoria/
  api/alunos/busca/      busca usada pelo autocompletar do check-in
  exportar/[relatorio]/  download de CSV e PDF
components/              peças reutilizadas (avisos, confirmação, máscaras, gráficos, QR...)
lib/
  banco.ts db.ts         abre/cria o banco e faz a migração de versão
  consultas.ts           consultas das telas (situação do aluno, painel, paginação)
  matriculas.ts financeiro.ts   matrícula, parcelas e renovação
  permissoes.ts auth.ts  perfis de acesso e sessão
  login.ts auditoria.ts lixeira.ts   bloqueio, log e desfazer
  validacao.ts format.ts relatorios.ts pdf.ts csv.ts seed.ts
db/schema.sql            modelo do banco
scripts/                 reset, backup e restauração do banco
tests/                   testes automatizados
.github/workflows/ci.yml GitHub Actions
docs/                    modelo do banco e roteiro da apresentação
```

## Validação e segurança

- Todas as entradas são **validadas no servidor** com mensagens ao lado do campo; os dados digitados são mantidos
  quando há erro. As máscaras no navegador só ajudam a digitar.
- Consultas **parametrizadas** (sem montar SQL com texto do usuário); ordenação por lista fixa de colunas.
- Senhas com **hash scrypt**; cookie de sessão `httpOnly`, **assinado** e `secure` em produção.
- Toda página e toda ação conferem o **login e a permissão do perfil**; sem permissão, vai para "Sem permissão".
- **Bloqueio** de tentativas de login e **auditoria** das ações.
- CSV protegido contra **injeção de fórmulas** (células que começam com `=`, `+`, `-`, `@`).
- Restrições no banco (`UNIQUE`, `CHECK`, chaves estrangeiras) garantem a integridade mesmo se a validação falhar.
- Todos os dados são **fictícios**.

## Testes e integração contínua

- `tests/` tem 34 testes: validação (CPF, telefone, datas, máscaras), regras (parcelas, datas de matrícula,
  permissões, CSV, PDF) e banco em memória (situação do aluno, renovação automática, paginação, excluir/desfazer,
  bloqueio de login).
- O GitHub Actions (`.github/workflows/ci.yml`) roda lint, tipos, testes, build e um teste do backup em Node 22 e 24.

## Limitações conhecidas

- O banco é um arquivo local, pensado para demonstração e uso de uma academia pequena (não para muitos acessos simultâneos).
- **Na Vercel** o banco fica em `/tmp` (a única pasta com escrita) e volta aos dados de demonstração sempre que a
  função reinicia. Serve para mostrar o sistema; para guardar dados de verdade seria preciso um banco hospedado
  (ex.: Turso, Neon). Defina `AUTH_SECRET` nas variáveis de ambiente do projeto na Vercel.
- Pagamentos são registrados manualmente (não há integração com banco, Pix ou cartão).
- O check-in pela câmera depende do navegador ter `BarcodeDetector`.
- O "desfazer" vale por 5 minutos depois da exclusão.
- A execução de cada exercício é mostrada por um **GIF** que alterna duas fotos (posição inicial e final), sem som,
  todos no mesmo estilo. Os GIFs foram gerados com o ffmpeg a partir das fotos. As fotos são do [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), de **domínio público**
  (licença Unlicense), e ficam em `public/exercicios/<exercício>/` (`0.jpg`, `1.jpg` e `animacao.gif`). O Burpee não existe nesse banco e fica sem animação.
  A equipe ainda pode colar um vídeo (YouTube ou .mp4) em Exercícios → Editar.
- O Pix é um "copia e cola" estático: o sistema não sabe sozinho que o dinheiro caiu (não há integração com banco).
  A recepção confere o extrato e registra. Na demonstração a chave Pix é fictícia; troque em Financeiro → Pix.

## Uso de IA

- **Ferramenta:** Claude (Anthropic), pelo Claude Code.
- **Em que foi usada:** planejamento da estrutura, modelagem do banco, geração do código (telas, ações do servidor,
  SQL, estilos, testes, CI), revisão e testes no navegador.
- **Responsabilidade da equipe:** todo o código foi revisado, testado e é explicado pelo(a) integrante na
  apresentação. Nenhum dado pessoal, credencial ou token real foi enviado à ferramenta.

## Autoria

Nome(s) e contribuição de cada integrante: _(preencher)_
