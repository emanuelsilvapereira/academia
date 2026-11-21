// Regras de matrícula e parcelas. Funções puras (sem banco), cobertas pelos testes automatizados.
import { addDias, addMeses } from "./format.ts";

export type Parcela = { parcela: number; valor_centavos: number; vencimento: string };

/** Último dia coberto por uma matrícula que começa em `inicio` e dura `meses`. */
export function fimDaMatricula(inicio: string, meses: number): string {
  return addDias(addMeses(inicio, meses), -1);
}

/**
 * Divide o valor do plano em parcelas mensais. A primeira vence no início da matrícula,
 * as outras no mesmo dia dos meses seguintes. A sobra dos centavos vai para a primeira parcela,
 * para a soma bater exatamente com o valor do plano.
 */
export function gerarParcelas(valorTotal: number, meses: number, inicio: string): Parcela[] {
  const base = Math.floor(valorTotal / meses);
  const sobra = valorTotal - base * meses;
  return Array.from({ length: meses }, (_, i) => ({
    parcela: i + 1,
    valor_centavos: base + (i === 0 ? sobra : 0),
    vencimento: addMeses(inicio, i),
  }));
}

/** Início da renovação: dia seguinte ao fim da matrícula atual, ou hoje se ela já acabou. */
export function inicioDaRenovacao(fimAtual: string | null, hoje: string): string {
  if (!fimAtual) return hoje;
  const seguinte = addDias(fimAtual, 1);
  return seguinte > hoje ? seguinte : hoje;
}
