/**
 * Catálogo de provedores e testes de conexão (docs/specs/INTEGRACOES.md).
 * Sem acesso a banco aqui: funções puras e chamadas HTTP com tempo limite.
 */

export type Provedor = "openai" | "anthropic" | "groq" | "resend" | "sms" | "telegram" | "evolution";

export type GrupoProvedor = "ia" | "whatsapp" | "email" | "sms" | "telegram";

export const PROVEDORES: {
  id: Provedor;
  rotulo: string;
  grupo: GrupoProvedor;
  /** A empresa pode cadastrar chave própria (BYOK). */
  byokEmpresa: boolean;
  dica: string;
}[] = [
  { id: "openai", rotulo: "OpenAI", grupo: "ia", byokEmpresa: true, dica: "Começa com sk-" },
  { id: "anthropic", rotulo: "Claude (Anthropic)", grupo: "ia", byokEmpresa: true, dica: "Começa com sk-ant-" },
  { id: "groq", rotulo: "Groq", grupo: "ia", byokEmpresa: true, dica: "Começa com gsk_" },
  { id: "evolution", rotulo: "WhatsApp (Evolution API)", grupo: "whatsapp", byokEmpresa: false, dica: "Chave global da Evolution (apikey)" },
  { id: "resend", rotulo: "E-mail (Resend)", grupo: "email", byokEmpresa: false, dica: "Começa com re_" },
  { id: "sms", rotulo: "SMS", grupo: "sms", byokEmpresa: false, dica: "Chave do provedor de SMS (a definir)" },
  { id: "telegram", rotulo: "Telegram (bot)", grupo: "telegram", byokEmpresa: false, dica: "Token do bot, do @BotFather" },
];

export function provedorValido(v: unknown): v is Provedor {
  return typeof v === "string" && PROVEDORES.some((p) => p.id === v);
}

/**
 * URL da Evolution: https obrigatório e sem destinos internos, para que um
 * cadastro não vire acesso a serviços da rede interna (SSRF).
 */
export function urlEvolutionSegura(bruta: string): string | null {
  let u: URL;
  try {
    u = new URL(bruta.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return null;
  // IPv4 privado/loopback/link-local e IPv6 literal.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      return null;
    }
  }
  if (h.includes(":") || h.startsWith("[")) return null;
  return `${u.protocol}//${u.host}`;
}

/** Nome de instância aceito (letras, números, _ e -). */
export function instanciaValida(v: string): boolean {
  return /^[A-Za-z0-9_-]{2,60}$/.test(v.trim());
}

export type ResultadoTeste = { ok: boolean; mensagem: string };

async function chamar(url: string, init: RequestInit): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    return await fetch(url, { ...init, signal: c.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

function interpretar(r: Response, rotulo: string): ResultadoTeste {
  if (r.ok) return { ok: true, mensagem: `${rotulo}: conexão válida.` };
  if (r.status === 401 || r.status === 403) return { ok: false, mensagem: `${rotulo}: chave recusada (HTTP ${r.status}).` };
  if (r.status === 429) return { ok: false, mensagem: `${rotulo}: limite de uso atingido (HTTP 429).` };
  return { ok: false, mensagem: `${rotulo}: resposta inesperada (HTTP ${r.status}).` };
}

/**
 * Testa a credencial com uma chamada leve e somente leitura.
 * Nunca devolve nem registra o segredo.
 */
export async function testarConexao(
  provedor: Provedor,
  segredo: string,
  config: { base_url?: string; instance?: string },
): Promise<ResultadoTeste> {
  const rotulo = PROVEDORES.find((p) => p.id === provedor)?.rotulo ?? provedor;
  try {
    switch (provedor) {
      case "openai":
        return interpretar(
          await chamar("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${segredo}` } }),
          rotulo,
        );
      case "groq":
        return interpretar(
          await chamar("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${segredo}` } }),
          rotulo,
        );
      case "anthropic":
        return interpretar(
          await chamar("https://api.anthropic.com/v1/models", {
            headers: { "x-api-key": segredo, "anthropic-version": "2023-06-01" },
          }),
          rotulo,
        );
      case "resend":
        return interpretar(
          await chamar("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${segredo}` } }),
          rotulo,
        );
      case "telegram":
        return interpretar(await chamar(`https://api.telegram.org/bot${encodeURIComponent(segredo)}/getMe`, {}), rotulo);
      case "evolution": {
        const base = config.base_url ? urlEvolutionSegura(config.base_url) : null;
        if (!base) return { ok: false, mensagem: `${rotulo}: informe a URL https da Evolution.` };
        const rota = config.instance
          ? `/instance/connectionState/${encodeURIComponent(config.instance)}`
          : "/instance/fetchInstances";
        const r = await chamar(`${base}${rota}`, { headers: { apikey: segredo } });
        const base_res = interpretar(r, rotulo);
        if (!r.ok || !config.instance) return base_res;
        const corpo = (await r.json().catch(() => null)) as { instance?: { state?: string } } | null;
        const estado = corpo?.instance?.state;
        return estado === "open"
          ? { ok: true, mensagem: `${rotulo}: instância conectada.` }
          : { ok: false, mensagem: `${rotulo}: instância existe, mas está "${estado ?? "desconhecido"}".` };
      }
      case "sms":
        return { ok: false, mensagem: "SMS: teste automático indisponível até o provedor ser definido." };
    }
  } catch (e) {
    const abortou = e instanceof Error && e.name === "AbortError";
    return { ok: false, mensagem: `${rotulo}: ${abortou ? "tempo esgotado" : "falha de rede"}.` };
  }
}
