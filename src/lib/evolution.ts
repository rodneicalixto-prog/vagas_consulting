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

/**
 * Empresa da operação da plataforma (a SOS Vagas): dona do número usado para
 * falar com as empresas clientes. Guardada na configuração da plataforma.
 */
export async function empresaDaOperacao(): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("integration_credentials")
    .select("config")
    .eq("escopo", "plataforma")
    .eq("provedor", "evolution")
    .maybeSingle();
  const id = (data?.config as { empresa_operacao?: string } | null)?.empresa_operacao;
  return typeof id === "string" && id ? id : null;
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

/** Mensagem a citar (resposta): id do provedor e texto, para o WhatsApp mostrar a citação. */
export type Citada = { id: string; texto: string };

type RespostaPost = { ok: true; json: unknown } | { ok: false; erro: string };

/** POST JSON na Evolution com tempo limite; erros sem expor a chave. */
async function postar(cfg: ConfigEvolution, caminho: string, corpo: unknown, limiteMs: number): Promise<RespostaPost> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), limiteMs);
  try {
    const r = await fetch(`${cfg.baseUrl}${caminho}/${encodeURIComponent(cfg.instance)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: cfg.apikey },
      body: JSON.stringify(corpo),
      signal: c.signal,
      cache: "no-store",
    });
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) return { ok: false, erro: "Chave da Evolution recusada." };
      if (r.status === 404) return { ok: false, erro: "Instância do WhatsApp não encontrada." };
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

function idDaResposta(json: unknown): string | null {
  return (json as { key?: { id?: string } } | null)?.key?.id ?? null;
}

function citacao(c?: Citada) {
  return c ? { quoted: { key: { id: c.id }, message: { conversation: c.texto.slice(0, 500) } } } : {};
}

/** Envia texto simples (com citação opcional). */
export async function enviarTexto(
  cfg: ConfigEvolution,
  telefone: string,
  texto: string,
  citada?: Citada,
): Promise<ResultadoEnvio> {
  const r = await postar(cfg, "/message/sendText", { number: telefone, text: texto, ...citacao(citada) }, 10_000);
  return r.ok ? { ok: true, idMensagem: idDaResposta(r.json) } : r;
}

export type MidiaEnvio = {
  tipo: "imagem" | "documento" | "audio" | "video";
  /** Conteúdo em base64 puro (sem prefixo data:). */
  base64: string;
  mime: string;
  nome: string;
  legenda?: string;
};

/** Envia imagem, documento, vídeo ou áudio (áudio vai como nota de voz). */
export async function enviarMidia(
  cfg: ConfigEvolution,
  telefone: string,
  m: MidiaEnvio,
  citada?: Citada,
): Promise<ResultadoEnvio> {
  const r =
    m.tipo === "audio"
      ? await postar(cfg, "/message/sendWhatsAppAudio", { number: telefone, audio: m.base64, ...citacao(citada) }, 30_000)
      : await postar(
          cfg,
          "/message/sendMedia",
          {
            number: telefone,
            mediatype: m.tipo === "imagem" ? "image" : m.tipo === "video" ? "video" : "document",
            mimetype: m.mime,
            caption: m.legenda ?? "",
            media: m.base64,
            fileName: m.nome,
            ...citacao(citada),
          },
          30_000,
        );
  return r.ok ? { ok: true, idMensagem: idDaResposta(r.json) } : r;
}

/** Baixa a mídia de uma mensagem recebida (a Evolution devolve em base64). */
export async function baixarMidia(
  cfg: ConfigEvolution,
  idMensagem: string,
): Promise<{ base64: string; mime: string | null; nome: string | null } | null> {
  const r = await postar(
    cfg,
    "/chat/getBase64FromMediaMessage",
    { message: { key: { id: idMensagem } }, convertToMp4: false },
    25_000,
  );
  if (!r.ok) return null;
  const j = r.json as { base64?: unknown; mimetype?: unknown; fileName?: unknown } | null;
  if (!j || typeof j.base64 !== "string" || !j.base64) return null;
  const base64 = j.base64.replace(/^data:[^;]+;base64,/, "");
  return {
    base64,
    mime: typeof j.mimetype === "string" ? j.mimetype : null,
    nome: typeof j.fileName === "string" ? j.fileName : null,
  };
}
