import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { TETO_DIARIO_PADRAO, hashContato, inicioDoDiaSaoPaulo, restanteDoDia } from "@/lib/hunter";

/** Teto diário de WhatsApp frio: variável de ambiente `HUNTER_TETO_DIARIO` ou o padrão. */
export function tetoDiario(): number {
  const n = Number(process.env.HUNTER_TETO_DIARIO);
  return Number.isInteger(n) && n > 0 && n <= 500 ? n : TETO_DIARIO_PADRAO;
}

/** Quantos WhatsApp o hunter já enviou hoje (em todas as vagas: a linha é única). */
export async function enviadosHoje(agora: Date = new Date()): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("hunter_prospects")
    .select("id", { count: "exact", head: true })
    .eq("canal", "whatsapp")
    .gte("enviada_em", inicioDoDiaSaoPaulo(agora));
  return count ?? 0;
}

export async function restanteHoje(agora: Date = new Date()): Promise<{ teto: number; enviados: number; restante: number }> {
  const teto = tetoDiario();
  const enviados = await enviadosHoje(agora);
  return { teto, enviados, restante: restanteDoDia(enviados, teto) };
}

/**
 * Esta pessoa pediu para não ser contactada, ou já foi abordada? Confere o opt-out do WhatsApp (qualquer empresa)
 * e os hashes de prospects em "não contactar". Conservador: na dúvida, bloqueia.
 */
export async function contatoBloqueado(c: { telefone: string | null; email: string | null }): Promise<boolean> {
  const admin = createAdminClient();
  if (c.telefone) {
    const { data } = await admin.from("channel_opt_outs").select("id").eq("telefone_normalizado", c.telefone).limit(1);
    if (data && data.length > 0) return true;
    const { data: h } = await admin
      .from("hunter_prospects")
      .select("id")
      .eq("chave_tel", hashContato(c.telefone))
      .eq("estado", "nao_contactar")
      .limit(1);
    if (h && h.length > 0) return true;
  }
  if (c.email) {
    const { data: h } = await admin
      .from("hunter_prospects")
      .select("id")
      .eq("chave_email", hashContato(c.email))
      .eq("estado", "nao_contactar")
      .limit(1);
    if (h && h.length > 0) return true;
  }
  return false;
}

/**
 * Anonimiza o prospect: apaga nome, contato, perfil, resultado e texto; mantém só os hashes
 * (para nunca mais importar nem abordar a mesma pessoa). Usado na retenção e no pedido de saída.
 */
export const CAMPOS_ANONIMIZADOS = {
  nome: "",
  telefone: null,
  email: null,
  cidade: "",
  perfil: "",
  resultado: null,
  texto: "",
} as const;

/** URL pública do app (para o link rastreado). `NEXT_PUBLIC_SITE_URL` ou o domínio de produção. */
export function siteUrl(): string {
  const u = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  return /^https:\/\/[^\s/]+$/.test(u) ? u : "https://sosvagas.sosmkt.com.br";
}

export function linkRastreado(token: string): string {
  return `${siteUrl()}/h/${token}`;
}

/**
 * Chamado pelo webhook do WhatsApp quando chega mensagem de um número abordado pelo hunter:
 * - pediu SAIR: vira "não contactar" e os dados pessoais são apagados (ficam só os hashes);
 * - respondeu: marca "respondeu" e a pessoa deixa de ser apagada pela retenção.
 * Nunca lança: o webhook não pode falhar por causa disto.
 */
export async function registrarRespostaDoProspect(telefone: string, pediuSaida: boolean): Promise<void> {
  try {
    const admin = createAdminClient();
    const agora = new Date().toISOString();
    if (pediuSaida) {
      await admin
        .from("hunter_prospects")
        .update({ ...CAMPOS_ANONIMIZADOS, estado: "nao_contactar", anonimizado_em: agora, updated_at: agora })
        .eq("telefone", telefone)
        .is("anonimizado_em", null);
      return;
    }
    await admin
      .from("hunter_prospects")
      .update({ estado: "respondeu", updated_at: agora })
      .eq("telefone", telefone)
      .in("estado", ["enviado", "clicou"]);
  } catch {
    /* o rastro do hunter não pode derrubar o webhook */
  }
}
