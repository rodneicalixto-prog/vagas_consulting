import { timingSafeEqual } from "node:crypto";

/**
 * Autenticação das rotinas agendadas da Vercel (`Authorization: Bearer <CRON_SECRET>`).
 * Fecha por padrão: sem `CRON_SECRET` configurado nada passa. Comparação em tempo constante.
 */
export function cronAutorizado(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const recebido = Buffer.from(request.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secret}`);
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}
