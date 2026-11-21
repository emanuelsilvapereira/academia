# Roteiro da apresentação

Antes de começar: pare qualquer servidor antigo, rode `npm run db:reset` e depois `npm run dev`, para começar com os
dados de demonstração limpos (isso também libera algum login bloqueado). Teste tudo uma vez antes da aula.

## Fluxo completo (≈ 8 minutos)

O documento pede **um fluxo do início ao fim, com uma operação que grava no banco e uma consulta/atualização depois**.

1. **Login e segurança**: entre com uma senha errada (erro genérico). Conte que, depois de 5 erros, o e-mail fica
   bloqueado por 15 minutos. Entre com `admin@pulso.com` / `admin123`.
2. **Painel**: mostre os indicadores (ativos, entradas hoje, inadimplência, receita do mês), as listas de
   **inadimplentes**, **vencimentos em 7 dias** e **alunos em risco**, e o gráfico de **receita prevista × recebida**.
3. **Cadastrar um aluno** *(grava no banco)*: mostre as máscaras de CPF, telefone e nascimento. Digite um CPF inválido
   de propósito para mostrar a validação e que os dados não se perdem. Corrija, escolha um plano, marque a primeira
   parcela como paga e salve.
4. **Perfil do aluno**: o sistema abre o perfil com a **carteirinha (QR code)**, a matrícula com início e fim e as
   parcelas geradas.
5. **Financeiro** *(atualização)*: no perfil, **renove** para o plano Trimestral e mostre as 3 parcelas que somam o
   valor do plano. Estorne e receba uma parcela (com a confirmação na tela).
6. **Treino e avaliação**: crie a **ficha A**, adicione dois exercícios e troque a ordem. Registre uma **avaliação física**
   e mostre o IMC e o gráfico de evolução.
7. **Check-in**: em Frequência, digite o nome do aluno e aperte Enter. Mostre a **lotação ao vivo** subir. Tente de
   novo pelo código da carteirinha (o sistema avisa que ele já entrou hoje) e registre a saída.
8. **Consultar**: em Alunos, busque pelo nome, filtre por situação ("Pagamento pendente") e por plano, ordene por
   coluna e mude de página. **Exporte** a lista em PDF ou CSV.
9. **Excluir e desfazer**: exclua o aluno de teste (aparece a confirmação), explique que matrículas, parcelas, fichas e
   entradas saíram juntas (`CASCADE`) e clique em **Desfazer**: tudo volta.
10. **Integridade**: em Planos, tente excluir um plano já usado em matrícula (bloqueado).
11. **Auditoria**: mostre que todas as ações acima (inclusive o login errado e a exportação) estão registradas.
12. **Perfis de acesso**: saia e entre com `instrutor@pulso.com` / `instrutor123`. O menu fica menor, ele não vê
    pagamentos e o Financeiro mostra "Sem permissão".
13. **Mostre o banco**: abra `data/pulso.db` no *DB Browser for SQLite* (gratuito) e mostre as tabelas.
14. **Qualidade**: mostre `npm test` passando e a aba **Actions** do GitHub com o CI verde.
15. **Tema e celular**: troque o tema (sol/lua) e reduza a janela para mostrar o layout responsivo.

Se o tempo for curto, faça 1, 3, 4, 5, 7, 9 e 12.

## Perguntas que a professora pode fazer (respostas curtas)

### Banco de dados
- **Por que SQLite?** É relacional, de um arquivo só, não precisa instalar servidor de banco. Atende "execução local".
- **O que é chave estrangeira?** Uma coluna que aponta para a chave de outra tabela (`matricula.plano_id` → `plano.id`).
  Impede apontar para algo que não existe.
- **Diferença entre CASCADE, RESTRICT e SET NULL?** Ao excluir o "pai": CASCADE apaga os filhos (aluno → matrículas),
  RESTRICT impede a exclusão (plano usado em matrícula), SET NULL só desliga a referência (instrutor excluído → aluno
  fica sem instrutor).
- **Por que a situação do aluno não é uma coluna?** Porque é calculada a partir das parcelas e da matrícula. Assim
  nunca fica desatualizada: pagou, volta a ativo sozinho.
- **Por que matrícula separada do aluno?** Para guardar o histórico: cada renovação é uma nova matrícula, com o preço
  do dia em que foi feita.
- **Por que dinheiro em centavos?** Para não ter erro de arredondamento com números decimais.
- **Como funciona a paginação?** `LIMIT` e `OFFSET` na consulta: o banco devolve só os 15 alunos da página.

### Segurança
- **Como evita SQL injection?** Consultas com parâmetros (`?`/`@nome`), nunca juntando texto do usuário ao SQL. Na
  ordenação só aceita colunas de uma lista fixa.
- **Como a senha é guardada?** Hash scrypt com sal; ninguém consegue ver a senha original.
- **Como funciona o bloqueio de login?** Cada tentativa vai para `login_tentativa`. Com 5 erros do mesmo e-mail (ou 20 do
  mesmo IP) em 15 minutos, o login é recusado até o prazo passar.
- **Como funcionam os perfis?** `lib/permissoes.ts` tem uma tabela perfil → permissões. Cada página e cada ação chamam
  `exigirPermissao(...)` no servidor; esconder o botão é só conforto, a proteção é no servidor.
- **Onde fica a validação?** No servidor (nas *Server Actions*). O banco ainda tem `CHECK` e `UNIQUE` como segunda proteção.
- **Como funciona o desfazer?** Antes de excluir, o registro e tudo que depende dele são copiados em JSON para a tabela
  `lixeira`. "Desfazer" recoloca as linhas com os mesmos ids, dentro de 5 minutos.

### Next.js e código
- **O que é uma Server Action?** Uma função que roda no servidor e é chamada direto pelo formulário, sem criar uma API à parte.
- **Como o sistema sabe quem está logado?** Cookie de sessão assinado e `httpOnly`; o usuário e o perfil são lidos do banco.
- **Como é gerado o PDF?** Por código próprio em `lib/pdf.ts`, que escreve o formato PDF à mão (texto, tabelas, páginas).
- **Como funciona o QR code?** Cada aluno tem um `codigo` único. A biblioteca `qrcode` desenha o QR; no check-in, a câmera
  (ou um leitor USB, que funciona como teclado) lê esse código.
- **O que os testes verificam?** CPF e máscaras, parcelas e datas de matrícula, permissões, CSV/PDF e, num banco em
  memória, situação do aluno, renovação automática, paginação, desfazer e bloqueio de login.
- **O que o GitHub Actions faz?** A cada envio, instala o projeto e roda lint, tipos, testes e build em Node 22 e 24.
- **O que você usou de IA?** Está declarado no README: Claude, para planejar, gerar, testar e revisar o código. Esteja
  pronto(a) para explicar `db/schema.sql`, `lib/consultas.ts`, `lib/matriculas.ts`, `lib/permissoes.ts` e
  `app/(app)/alunos/actions.ts`, que são os mais prováveis.
