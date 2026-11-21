// Validações puras (sem banco). Usadas nas Server Actions, nas máscaras e nos testes automatizados.

export function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

/** Confere os dois dígitos verificadores do CPF. Sequências repetidas (111.111.111-11) são inválidas. */
export function cpfValido(entrada: string): boolean {
  const d = soDigitos(entrada);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

/** Completa 9 dígitos com os 2 verificadores (usado para gerar CPFs fictícios válidos). */
export function completarCpf(nove: string): string {
  let d = nove;
  for (const ate of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    d += String(resto === 10 ? 0 : resto);
  }
  return d;
}

/** Telefone com DDD: 10 (fixo) ou 11 (celular, começa com 9) dígitos. DDD não começa com 0. */
export function telefoneValido(entrada: string): boolean {
  const d = soDigitos(entrada);
  if (d.length === 11) return /^[1-9]{2}9\d{8}$/.test(d);
  if (d.length === 10) return /^[1-9]{2}[2-8]\d{7}$/.test(d);
  return false;
}

/** Data ISO (AAAA-MM-DD) que existe no calendário. */
export function dataISOValida(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
}

/** "31/12/1990" -> "1990-12-31". Também aceita já em ISO. Devolve null se não for uma data real. */
export function dataBRparaISO(entrada: string): string | null {
  const s = entrada.trim();
  if (dataISOValida(s)) return s;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return dataISOValida(iso) ? iso : null;
}

/** Idade completa em anos numa data de referência. */
export function idade(nascimentoISO: string, hojeISO: string): number {
  const [an, mn, dn] = nascimentoISO.split("-").map(Number);
  const [ah, mh, dh] = hojeISO.split("-").map(Number);
  let anos = ah - an;
  if (mh < mn || (mh === mn && dh < dn)) anos -= 1;
  return anos;
}

/** "99,90", "1.299,90", "99.90", "R$ 99" -> centavos. null se não for um valor válido. */
export function paraCentavos(entrada: string): number | null {
  let s = entrada.replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

/** "72,5" ou "72.5" -> 72.5. Vazio -> null. NaN se for inválido. */
export function paraDecimal(entrada: string): number | null {
  const s = entrada.trim().replace(",", ".");
  if (!s) return null;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : Number.NaN;
}

// ---------- Máscaras (aplicadas enquanto a pessoa digita) ----------

export function mascaraCpf(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function mascaraTelefone(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraData(valor: string): string {
  const d = soDigitos(valor).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
