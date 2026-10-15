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

// ---------------------------------------------------------------------------
// Gestão da instância na Evolution (criar, QR, estado, webhook, desconectar)
// ---------------------------------------------------------------------------

import { corpoDoWebhook, estadoDaConexao, numeroDoJid, qrSeguro, type EstadoConexao } from "@/lib/linhas";

type Base = { baseUrl: string; apikey: string };

async function plataformaEvolution(): Promise<Base | null> {
  const { data } = await createAdminClient()
    .from("integration_credentials")
    .select("segredo_cifrado, config")
    .eq("escopo", "plataforma")
    .eq("provedor", "evolution")
    .maybeSingle();
  const base = (data?.config as { base_url?: string } | null)?.base_url;
  const baseUrl = base ? urlEvolutionSegura(base) : null;
  if (!baseUrl || !data?.segredo_cifrado) return null;
  try {
    return { baseUrl, apikey: decifrar(data.segredo_cifrado) };
  } catch {
    return null;
  }
}

type Resp = { ok: true; json: unknown } | { ok: false; erro: string };

async function evolution(base: Base, metodo: "GET" | "POST" | "DELETE", caminho: string, corpo?: unknown): Promise<Resp> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15_000);
  try {
    const r = await fetch(`${base.baseUrl}${caminho}`, {
      method: metodo,
      headers: { apikey: base.apikey, ...(corpo ? { "Content-Type": "application/json" } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: c.signal,
      cache: "no-store",
    });
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) return { ok: false, erro: "Chave da Evolution recusada." };
      if (r.status === 404) return { ok: false, erro: "Instância não encontrada na Evolution." };
      if (r.status === 409) return { ok: false, erro: "Já existe uma instância com esse nome." };
      return { ok: false, erro: `A Evolution respondeu com erro (HTTP ${r.status}).` };
    }
    return { ok: true, json: await r.json().catch(() => null) };
  } catch (e) {
    const abortou = e instanceof Error && e.name === "AbortError";
    return { ok: false, erro: abortou ? "Tempo esgotado ao falar com a Evolution." : "Falha de rede ao falar com a Evolution." };
  } finally {
    clearTimeout(t);
  }
}

function qrDe(json: unknown): { qr: string | null; codigo: string | null } {
  const j = (json ?? {}) as Record<string, unknown>;
  const q = ((j.qrcode as Record<string, unknown> | undefined) ?? j) as Record<string, unknown>;
  const base64 = typeof q.base64 === "string" ? q.base64 : null;
  const qr = base64 ? qrSeguro(base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`) : null;
  const codigo = typeof q.pairingCode === "string" && /^[A-Z0-9-]{4,20}$/i.test(q.pairingCode) ? q.pairingCode : null;
  return { qr, codigo };
}

export type ResultadoCriacao = { ok: true; qr: string | null; codigo: string | null } | { ok: false; erro: string };

/** Cria a instância, liga o webhook sozinho e já devolve o QR code. */
export async function criarInstanciaNaEvolution(nome: string, webhookUrl: string): Promise<ResultadoCriacao> {
  const base = await plataformaEvolution();
  if (!base) return { ok: false, erro: "A Evolution da plataforma ainda não foi configurada." };
  const criada = await evolution(base, "POST", "/instance/create", {
    instanceName: nome,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  });
  if (!criada.ok) return criada;
  const w = await evolution(base, "POST", `/webhook/set/${encodeURIComponent(nome)}`, corpoDoWebhook(webhookUrl));
  if (!w.ok) return { ok: false, erro: `Instância criada, mas o webhook não foi ligado (${w.erro})` };
  const { qr, codigo } = qrDe(criada.json);
  return { ok: true, qr, codigo };
}

/** Novo QR code para (re)conectar a instância. */
export async function qrDaInstancia(instance: string): Promise<{ ok: true; qr: string | null; codigo: string | null } | { ok: false; erro: string }> {
  const base = await plataformaEvolution();
  if (!base) return { ok: false, erro: "A Evolution da plataforma ainda não foi configurada." };
  const r = await evolution(base, "GET", `/instance/connect/${encodeURIComponent(instance)}`);
  if (!r.ok) return r;
  return { ok: true, ...qrDe(r.json) };
}

/** Estado da conexão e número lido da própria instância (nunca é gravado). */
export async function estadoDaInstancia(
  instance: string,
): Promise<{ estado: EstadoConexao; numero: string | null; erro?: string }> {
  const base = await plataformaEvolution();
  if (!base) return { estado: "desconhecido", numero: null, erro: "Evolution da plataforma não configurada." };
  const e = await evolution(base, "GET", `/instance/connectionState/${encodeURIComponent(instance)}`);
  if (!e.ok) return { estado: "desconhecido", numero: null, erro: e.erro };
  const j = (e.json ?? {}) as { instance?: { state?: unknown }; state?: unknown };
  const estado = estadoDaConexao(j.instance?.state ?? j.state);
  let numero: string | null = null;
  if (estado === "conectada") {
    const f = await evolution(base, "GET", `/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`);
    if (f.ok) {
      const item = (Array.isArray(f.json) ? f.json[0] : f.json) as { ownerJid?: unknown; owner?: unknown; number?: unknown } | null;
      numero = numeroDoJid(item?.ownerJid) ?? numeroDoJid(item?.owner) ?? numeroDoJid(item?.number);
    }
  }
  return { estado, numero };
}

export async function religarWebhook(instance: string, webhookUrl: string): Promise<{ ok: boolean; erro?: string }> {
  const base = await plataformaEvolution();
  if (!base) return { ok: false, erro: "A Evolution da plataforma ainda não foi configurada." };
  const w = await evolution(base, "POST", `/webhook/set/${encodeURIComponent(instance)}`, corpoDoWebhook(webhookUrl));
  return w.ok ? { ok: true } : { ok: false, erro: w.erro };
}

export async function desconectarInstancia(instance: string): Promise<{ ok: boolean; erro?: string }> {
  const base = await plataformaEvolution();
  if (!base) return { ok: false, erro: "A Evolution da plataforma ainda não foi configurada." };
  const r = await evolution(base, "DELETE", `/instance/logout/${encodeURIComponent(instance)}`);
  return r.ok ? { ok: true } : { ok: false, erro: r.erro };
}
