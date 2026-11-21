// Formato de resposta das ações de formulário (Server Actions).
export type FormState =
  | {
      erros?: Record<string, string>;
      mensagem?: string;
      ok?: boolean;
      valores?: Record<string, string>;
    }
  | undefined;

/** Resposta das ações de excluir: se deu certo, traz o id na lixeira para o botão "Desfazer". */
export type ResultadoExclusao = { ok: true; mensagem: string; desfazer?: number } | { ok: false; mensagem: string };

/** Resposta de ações simples (sem formulário), como "registrar saída" ou "estornar". */
export type ResultadoAcao = { ok: boolean; mensagem: string };

export function texto(fd: FormData, nome: string): string {
  const v = fd.get(nome);
  return typeof v === "string" ? v.trim() : "";
}

/** Erro de chave única do SQLite (ex.: e-mail repetido). */
export function ehViolacaoUnica(e: unknown): boolean {
  return codigoErro(e) === "SQLITE_CONSTRAINT_UNIQUE";
}

/** Erro de chave estrangeira (ex.: apagar um plano que tem matrículas). */
export function ehViolacaoChave(e: unknown): boolean {
  return codigoErro(e) === "SQLITE_CONSTRAINT_FOREIGNKEY";
}

function codigoErro(e: unknown): string | undefined {
  return typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : undefined;
}

export function semErros(erros: Record<string, string>): boolean {
  return Object.keys(erros).length === 0;
}
