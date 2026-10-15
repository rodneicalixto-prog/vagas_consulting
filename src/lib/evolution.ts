import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { ChaveMestraAusente, decifrar } from "@/lib/crypto-segredos";
import { urlEvolutionSegura } from "@/lib/integracoes";

/**
 * Configuração da Evolution para uma empresa: URL e apikey da plataforma +
 * nome da instância da empresa (um número por empresa).
 * Nunca devolve o segredo para fora do servidor.
 */
export type ConfigEvolution = { baseUrl: string; apikey: string; instance: string };

export type ResultadoConfig =
  | { ok: true; config: ConfigEvolution }
  | { ok: false; motivo: string };

export async function configEvolutionDaEmpresa(companyId: string): Promise<ResultadoConfig> {
  const admin = createAdminClient();
  const [{ data: empresa }, { data: plataforma }] = await Promise.all([
    admin
      .from("integration_credentials")
      .select("config")
      .eq("escopo", "empresa")
      .eq("company_id", companyId)
      .eq("provedor", "evolution")
      .maybeSingle(),
    admin
      .from("integration_credentials")
      .select("segredo_cifrado, config")
      .eq("escopo", "plataforma")
      .eq("provedor", "evolution")
      .maybeSingle(),
  ]);

  const instance = (empresa?.config as { instance?: string } | null)?.instance;
  if (!instance) return { ok: false, motivo: "O WhatsApp desta empresa ainda não foi configurado (instância)." };

  const base = (plataforma?.config as { base_url?: string } | null)?.base_url;
  const baseUrl = base ? urlEvolutionSegura(base) : null;
  if (!baseUrl || !plataforma?.segredo_cifrado) {
    return { ok: false, motivo: "A Evolution da plataforma ainda não foi configurada." };
  }

  try {
    return { ok: true, config: { baseUrl, apikey: decifrar(plataforma.segredo_cifrado), instance } };
  } catch (e) {
    if (e instanceof ChaveMestraAusente) {
      return { ok: false, motivo: "A chave-mestra do cofre não está configurada no servidor." };
    }
    return { ok: false, motivo: "Não foi possível ler a credencial da Evolution." };
  }
}

/** A apikey da plataforma, para validar o webhook recebido. */
export async function apikeyDaPlataforma(): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("integration_credentials")
    .select("segredo_cifrado")
    .eq("escopo", "plataforma")
    .eq("provedor", "evolution")
    .maybeSingle();
  if (!data?.segredo_cifrado) return null;
  try {
    return decifrar(data.segredo_cifrado);
  } catch {
    return null;
  }
}

/** Empresa dona de uma instância (para o webhook). */
export async function empresaDaInstancia(instance: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("integration_credentials")
    .select("company_id, config")
    .eq("escopo", "empresa")
    .eq("provedor", "evolution")
    .filter("config->>instance", "eq", instance)
    .limit(1);
  return (data?.[0]?.company_id as string | undefined) ?? null;
}

export type ResultadoEnvio = { ok: true; idMensagem: string | null } | { ok: false; erro: string };

/** Envia texto simples. Tempo limite de 10 s; erros sem expor a chave. */
export async function enviarTexto(cfg: ConfigEvolution, telefone: string, texto: string): Promise<ResultadoEnvio> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 10_000);
  try {
    const r = await fetch(`${cfg.baseUrl}/message/sendText/${encodeURIComponent(cfg.instance)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.apikey },
      body: JSON.stringify({ number: telefone, text: texto }),
      signal: c.signal,
      cache: "no-store",
    });
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) return { ok: false, erro: "Chave da Evolution recusada." };
      if (r.status === 404) return { ok: false, erro: "Instância do WhatsApp não encontrada." };
      return { ok: false, erro: `A Evolution respondeu com erro (HTTP ${r.status}).` };
    }
    const corpo = (await r.json().catch(() => null)) as { key?: { id?: string } } | null;
    return { ok: true, idMensagem: corpo?.key?.id ?? null };
  } catch (e) {
    const abortou = e instanceof Error && e.name === "AbortError";
    return { ok: false, erro: abortou ? "Tempo esgotado ao falar com a Evolution." : "Falha de rede ao falar com a Evolution." };
  } finally {
    clearTimeout(t);
  }
}
