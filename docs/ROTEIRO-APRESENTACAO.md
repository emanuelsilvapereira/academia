# Roteiro da apresentação

Antes de começar: pare qualquer servidor antigo, rode `npm run db:reset` e depois `npm run dev`, para
começar com os dados de demonstração limpos. Teste tudo uma vez antes da aula.

## Fluxo completo (≈ 5 minutos)

O documento pede **um fluxo do início ao fim, com uma operação que grava no banco e uma consulta/atualização depois**.

1. **Login** com `admin@pulso.com` / `admin123`. (Antes, mostre que digitar a senha errada dá erro genérico.)
2. **Painel**: mostre os indicadores e os três gráficos (entradas por dia, dia da semana e horários de pico). Passe o mouse numa barra para ver o valor.
3. **Cadastrar um aluno** *(grava no banco)*: deixe um campo errado de propósito (e-mail repetido) para mostrar a
   validação e que os dados digitados não se perdem. Corrija e salve.
4. **Consultar**: busque o aluno pelo nome, filtre por plano e por status, ordene por matrícula.
5. **Editar** o mesmo aluno *(atualização)*: mude o plano ou o status para "pagamento pendente". Volte ao painel e
   mostre que "Pendências" subiu.
6. **Frequência**: registre a entrada desse aluno. Mostre que ele some da lista, que "Entradas hoje" aumentou e que a última entrada aparece no painel com hora, minuto e segundo.
7. **Integridade**: em Planos, tente excluir um plano com alunos (bloqueado). Depois exclua o aluno de teste e explique
   que as entradas dele saíram junto.
8. **Mostre o banco**: abra `data/pulso.db` no *DB Browser for SQLite* (gratuito) e mostre as tabelas e o aluno gravado.
9. **Tema e celular**: clique no botão de tema (sol/lua) na barra superior e reduza a janela do navegador para mostrar o layout responsivo.

## Perguntas que a professora pode fazer (respostas curtas)

- **Por que SQLite?** É relacional, de um arquivo só, não precisa instalar servidor de banco. Atende "execução local".
- **O que é chave estrangeira?** Uma coluna que aponta para a chave de outra tabela (`aluno.plano_id` → `plano.id`).
  Impede um aluno de apontar para um plano inexistente.
- **O que acontece ao excluir um plano com alunos?** O banco recusa (`ON DELETE RESTRICT`) e o sistema mostra uma mensagem.
- **E ao excluir um aluno?** As presenças dele são apagadas junto (`ON DELETE CASCADE`).
- **Como evita SQL injection?** As consultas usam parâmetros (`?`/`@nome`), nunca juntam texto do usuário ao SQL.
  Na ordenação só aceita colunas de uma lista fixa.
- **Como a senha é guardada?** Como hash scrypt com sal; nem eu consigo ver a senha original.
- **Onde fica a validação?** No servidor (nas *Server Actions*), então não dá para burlar pelo navegador. O banco ainda
  tem `CHECK` e `UNIQUE` como segunda proteção.
- **O que é uma Server Action?** Uma função que roda no servidor e é chamada direto pelo formulário, sem criar uma API à parte.
- **Como o sistema sabe que o usuário está logado?** Cookie de sessão assinado e `httpOnly`; cada página e cada ação chamam
  `exigirUsuario()`.
- **Por que o preço fica em centavos?** Para não ter erro de arredondamento com números decimais.
- **Como funciona a troca de tema?** Um atributo `data-theme` no `<html>` muda as variáveis de cor do CSS. Um pequeno script no `<head>` aplica o tema salvo (o padrão é o escuro) antes de a página aparecer, para não piscar.
- **O que você usou de IA?** Está declarado no README: Claude, para planejar, gerar e revisar o código. Esteja pronto(a)
  para explicar qualquer arquivo: `lib/db.ts`, `db/schema.sql` e `app/(app)/alunos/actions.ts` são os mais prováveis.

## Sugestão de commits (histórico representativo)

Faça commits pequenos, na ordem em que você realmente avançar, por exemplo:

1. `chore: cria projeto Next.js com TypeScript e Tailwind`
2. `feat(db): modelo do banco (plano, aluno, presenca, usuario)`
3. `feat(db): conexão SQLite e dados de demonstração`
4. `feat(auth): login com senha em hash e sessão por cookie`
5. `feat(alunos): listagem com busca, filtro e ordenação`
6. `feat(alunos): cadastro, edição e exclusão com validação`
7. `feat(planos): CRUD de planos com proteção de integridade`
8. `feat(frequencia): registro de entradas`
9. `feat(painel): indicadores e mapa de frequência`
10. `docs: README, modelo do banco e roteiro`
