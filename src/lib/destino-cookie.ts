import "server-only";

import { cookies } from "next/headers";
import { sanitizarDestino } from "@/lib/destino";

const COOKIE = "destino_pos_cadastro";

/** Guarda o destino (ex.: a vaga escolhida) enquanto a pessoa se cadastra. */
export async function guardarDestino(valor: unknown) {
  const destino = sanitizarDestino(valor);
  if (!destino) return;
  (await cookies()).set(COOKIE, destino, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

/** Lê e apaga o destino guardado; `null` se não houver. */
export async function consumirDestino(): Promise<string | null> {
  const jar = await cookies();
  const valor = jar.get(COOKIE)?.value ?? null;
  if (valor) jar.delete(COOKIE);
  return sanitizarDestino(valor);
}
