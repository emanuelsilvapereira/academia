import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Senhas são guardadas como "sal:hash" (scrypt). Nunca em texto puro.
export function hashPassword(senha: string): string {
  const sal = randomBytes(16);
  const hash = scryptSync(senha, sal, 64);
  return `${sal.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(senha: string, guardado: string): boolean {
  const [sal, hash] = guardado.split(":");
  if (!sal || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = scryptSync(senha, Buffer.from(sal, "hex"), esperado.length);
  return timingSafeEqual(esperado, calculado);
}
