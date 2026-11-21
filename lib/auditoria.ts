// Log de auditoria: cada alteração importante grava uma linha dizendo quem fez, o quê e quando.
import type Database from "better-sqlite3";
import { agoraCompleto } from "./format.ts";

export type Autor = { id: number | null; email: string };

export type Acao = "criar" | "editar" | "excluir" | "desfazer" | "login" | "login_falhou" | "logout" | "pagar" | "estornar" | "renovar" | "cancelar" | "entrada" | "saida" | "exportar";

export const ACAO_ROTULO: Record<Acao, string> = {
  criar: "Criou",
  editar: "Editou",
  excluir: "Excluiu",
  desfazer: "Desfez exclusão",
  login: "Entrou",
  login_falhou: "Login recusado",
  logout: "Saiu",
  pagar: "Registrou pagamento",
  estornar: "Estornou pagamento",
  renovar: "Renovou matrícula",
  cancelar: "Cancelou matrícula",
  entrada: "Registrou entrada",
  saida: "Registrou saída",
  exportar: "Exportou relatório",
};

export const ENTIDADE_ROTULO: Record<string, string> = {
  aluno: "Aluno",
  plano: "Plano",
  matricula: "Matrícula",
  pagamento: "Pagamento",
  presenca: "Frequência",
  exercicio: "Exercício",
  ficha: "Ficha de treino",
  ficha_item: "Ficha de treino",
  avaliacao: "Avaliação física",
  instrutor: "Instrutor",
  usuario: "Usuário",
  config: "Configuração",
  sessao: "Sessão",
  relatorio: "Relatório",
};

export function auditar(
  db: Database.Database,
  autor: Autor | null,
  acao: Acao,
  entidade: string,
  entidadeId: number | null,
  descricao: string,
  quando = agoraCompleto(),
): void {
  db.prepare(
    `INSERT INTO auditoria (quando, usuario_id, usuario_email, acao, entidade, entidade_id, descricao)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(quando, autor?.id ?? null, autor?.email ?? "—", acao, entidade, entidadeId, descricao.slice(0, 300));
}
