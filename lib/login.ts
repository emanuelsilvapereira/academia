// Bloqueio de tentativas de login. Funções puras sobre o banco (testadas em tests/banco.test.ts).
import type Database from "better-sqlite3";

export const MAX_FALHAS_EMAIL = 5; // erros seguidos para o mesmo e-mail...
export const MAX_FALHAS_IP = 20; // ...ou do mesmo computador (vários e-mails)
export const JANELA_SEGUNDOS = 15 * 60; // ...dentro de 15 minutos bloqueiam por 15 minutos

/**
 * Quantos segundos faltam para poder tentar de novo (0 = liberado).
 * Só contam as falhas depois do último login certo daquele e-mail.
 */
export function segundosDeBloqueio(db: Database.Database, email: string, ip: string, agoraSeg: number): number {
  const desde = agoraSeg - JANELA_SEGUNDOS;

  const ultimoSucesso =
    (db.prepare("SELECT MAX(quando) AS q FROM login_tentativa WHERE email = ? AND sucesso = 1").get(email) as { q: number | null }).q ?? 0;

  const porEmail = db
    .prepare(
      `SELECT quando FROM login_tentativa
       WHERE email = ? AND sucesso = 0 AND quando > ? AND quando > ?
       ORDER BY quando DESC LIMIT ?`,
    )
    .all(email, desde, ultimoSucesso, MAX_FALHAS_EMAIL) as { quando: number }[];

  const porIp = db
    .prepare(
      `SELECT quando FROM login_tentativa
       WHERE ip = ? AND sucesso = 0 AND quando > ?
       ORDER BY quando DESC LIMIT ?`,
    )
    .all(ip, desde, MAX_FALHAS_IP) as { quando: number }[];

  let espera = 0;
  // Bloqueado até a falha mais antiga das últimas N sair da janela.
  if (porEmail.length >= MAX_FALHAS_EMAIL) espera = Math.max(espera, porEmail[porEmail.length - 1].quando + JANELA_SEGUNDOS - agoraSeg);
  if (porIp.length >= MAX_FALHAS_IP) espera = Math.max(espera, porIp[porIp.length - 1].quando + JANELA_SEGUNDOS - agoraSeg);
  return Math.max(0, espera);
}

export function registrarTentativa(db: Database.Database, email: string, ip: string, sucesso: boolean, agoraSeg: number): void {
  db.prepare("INSERT INTO login_tentativa (email, ip, quando, sucesso) VALUES (?, ?, ?, ?)").run(email, ip, agoraSeg, sucesso ? 1 : 0);
  // Guarda só os últimos 30 dias.
  db.prepare("DELETE FROM login_tentativa WHERE quando < ?").run(agoraSeg - 30 * 86_400);
}
