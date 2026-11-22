// Perfis de acesso e o que cada um pode fazer. Uma única tabela, usada no menu, nas páginas e nas ações.

export type Perfil = "admin" | "recepcao" | "instrutor";

export const PERFIS: Perfil[] = ["admin", "recepcao", "instrutor"];

export const PERFIL_ROTULO: Record<Perfil, string> = {
  admin: "Administrador",
  recepcao: "Recepção",
  instrutor: "Instrutor",
};

export type Permissao =
  | "alunos.editar" // cadastrar, editar e excluir alunos; matrículas
  | "financeiro.ver" // pagamentos, inadimplência, receita
  | "financeiro.editar" // registrar e estornar pagamentos
  | "frequencia.registrar" // check-in, saída
  | "treinos.editar" // fichas de treino
  | "exercicios.editar" // biblioteca de exercícios
  | "avaliacoes.editar" // avaliação física
  | "planos.editar"
  | "instrutores.editar"
  | "usuarios.gerenciar"
  | "auditoria.ver"
  | "config.editar" // capacidade da academia
  | "relatorios.exportar"
  | "aulas.editar" // grade de aulas coletivas
  | "avisos.editar"; // avisos do portal do aluno

// Todos os perfis podem VER alunos, planos, instrutores, treinos e exercícios.
const MATRIZ: Record<Perfil, Permissao[]> = {
  admin: [
    "alunos.editar",
    "financeiro.ver",
    "financeiro.editar",
    "frequencia.registrar",
    "treinos.editar",
    "exercicios.editar",
    "avaliacoes.editar",
    "planos.editar",
    "instrutores.editar",
    "usuarios.gerenciar",
    "auditoria.ver",
    "config.editar",
    "relatorios.exportar",
    "aulas.editar",
    "avisos.editar",
  ],
  recepcao: ["alunos.editar", "financeiro.ver", "financeiro.editar", "frequencia.registrar", "relatorios.exportar", "aulas.editar", "avisos.editar"],
  instrutor: ["frequencia.registrar", "treinos.editar", "exercicios.editar", "avaliacoes.editar", "aulas.editar"],
};

export function pode(perfil: string, permissao: Permissao): boolean {
  return (MATRIZ as Record<string, Permissao[]>)[perfil]?.includes(permissao) ?? false;
}

export const DESCRICAO_PERMISSAO: Record<Permissao, string> = {
  "alunos.editar": "Cadastrar, editar e excluir alunos e matrículas",
  "financeiro.ver": "Ver pagamentos, inadimplência e receita",
  "financeiro.editar": "Registrar e estornar pagamentos",
  "frequencia.registrar": "Registrar entrada e saída",
  "treinos.editar": "Montar fichas de treino",
  "exercicios.editar": "Cadastrar exercícios",
  "avaliacoes.editar": "Registrar avaliações físicas",
  "planos.editar": "Cadastrar e alterar planos",
  "instrutores.editar": "Cadastrar instrutores",
  "usuarios.gerenciar": "Gerenciar usuários e perfis",
  "auditoria.ver": "Ver o log de auditoria",
  "config.editar": "Alterar a capacidade da academia e o Pix",
  "relatorios.exportar": "Exportar relatórios (CSV/PDF)",
  "aulas.editar": "Montar a grade de aulas coletivas",
  "avisos.editar": "Publicar avisos no portal do aluno",
};

export function permissoesDo(perfil: Perfil): Permissao[] {
  return MATRIZ[perfil];
}
