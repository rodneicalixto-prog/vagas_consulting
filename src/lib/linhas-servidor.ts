import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ChaveMestraAusente, decifrar } from "@/lib/crypto-segredos";
import { urlEvolutionSegura } from "@/lib/integracoes";
import { configEvolutionDaEmpresa, type ConfigEvolution, type ResultadoConfig } from "@/lib/evolution";

/** Linha de WhatsApp (uma instância da Evolution) de uma empresa. */
export type Linha = {
  id: string;
  company_id: string;
  instance: string;
  apelido: string;
  operador_id: string | null;
  agente: "desligado" | "sugestao" | "automatico";
  padrao: boolean;
  ativa: boolean;
};

const COLUNAS = "id, company_id, instance, apelido, operador_id, agente, padrao, ativa";

export async function linhaPorId(id: string): Promise<Linha | null> {
  const { data } = await createAdminClient().from("whatsapp_lines").select(COLUNAS).eq("id", id).maybeSingle();
  return (data as Linha | null) ?? null;
}

export async function linhaPadrao(companyId: string): Promise<Linha | null> {
  const { data } = await createAdminClient()
    .from("whatsapp_lines")
    .select(COLUNAS)
    .eq("company_id", companyId)
    .eq("padrao", true)
    .eq("ativa", true)
    .maybeSingle();
  return (data as Linha | null) ?? null;
}

/** Linha dedicada do operador (se tiver) ou a padrão da empresa. */
export async function linhaParaOperador(companyId: string, userId: string): Promise<Linha | null> {
  const { data } = await createAdminClient()
    .from("whatsapp_lines")
    .select(COLUNAS)
    .eq("company_id", companyId)
    .eq("operador_id", userId)
    .eq("ativa", true)
    .maybeSingle();
  return ((data as Linha | null) ?? null) || (await linhaPadrao(companyId));
}

/** Linha que atende uma instância (para o webhook). */
export async function linhaDaInstancia(instance: string): Promise<Linha | null> {
  const { data } = await createAdminClient()
    .from("whatsapp_lines")
    .select(COLUNAS)
    .eq("instance", instance)
    .eq("ativa", true)
    .maybeSingle();
  return (data as Linha | null) ?? null;
}

/** A linha da conversa; conversa antiga (sem linha) usa a padrão da empresa. */
export async function linhaDaConversa(c: { line_id: string | null; company_id: string }): Promise<Linha | null> {
  if (c.line_id) {
    const l = await linhaPorId(c.line_id);
    if (l && l.company_id === c.company_id) return l;
  }
  return linhaPadrao(c.company_id);
}

/**
 * Configuração da Evolution para enviar por uma linha. Sem linha, volta ao
 * cadastro antigo da empresa (um número só).
 */
export async function configEvolutionDaLinha(linha: Linha | null, companyId: string): Promise<ResultadoConfig> {
  if (!linha) return configEvolutionDaEmpresa(companyId);
  if (!linha.ativa) return { ok: false, motivo: "Este número de WhatsApp está desativado." };
  const { data: plataforma } = await createAdminClient()
    .from("integration_credentials")
    .select("segredo_cifrado, config")
    .eq("escopo", "plataforma")
    .eq("provedor", "evolution")
    .maybeSingle();
  const base = (plataforma?.config as { base_url?: string } | null)?.base_url;
  const baseUrl = base ? urlEvolutionSegura(base) : null;
  if (!baseUrl || !plataforma?.segredo_cifrado) {
    return { ok: false, motivo: "A Evolution da plataforma ainda não foi configurada." };
  }
  try {
    const config: ConfigEvolution = { baseUrl, apikey: decifrar(plataforma.segredo_cifrado), instance: linha.instance };
    return { ok: true, config };
  } catch (e) {
    if (e instanceof ChaveMestraAusente) {
      return { ok: false, motivo: "A chave-mestra do cofre não está configurada no servidor." };
    }
    return { ok: false, motivo: "Não foi possível ler a credencial da Evolution." };
  }
}
