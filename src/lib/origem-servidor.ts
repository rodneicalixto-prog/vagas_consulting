import "server-only";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOKEN_RE } from "@/lib/hunter";
import { COOKIE_ORIGEM, lerOrigemDoCookie, origemInicial, type Origem } from "@/lib/origem";

/**
 * Origem a gravar no perfil quando a pessoa conclui o cadastro: veio de uma abordagem do hunter
 * (cookie do link rastreado), de um link com origem (cookie de primeiro toque) ou direto.
 */
export async function origemParaCadastro(): Promise<Origem> {
  const jar = await cookies();
  let hunterFonte: string | null = null;
  const token = jar.get("hunter_token")?.value;
  if (token && TOKEN_RE.test(token)) {
    const { data } = await createAdminClient().from("hunter_prospects").select("fonte, estado").eq("token", token).maybeSingle();
    if (data && data.estado !== "nao_contactar") hunterFonte = data.fonte;
  }
  return origemInicial({ cookieOrigem: jar.get(COOKIE_ORIGEM)?.value ?? null, hunterFonte });
}

/** Origem de primeiro toque guardada no cookie, se houver (usada como reserva na candidatura). */
export async function origemDoCookie(): Promise<Origem | null> {
  return lerOrigemDoCookie((await cookies()).get(COOKIE_ORIGEM)?.value);
}
