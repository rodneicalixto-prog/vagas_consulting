/**
 * Catálogo de provedores e testes de conexão (docs/specs/INTEGRACOES.md).
 * Sem acesso a banco aqui: funções puras e chamadas HTTP com tempo limite.
 */

export type Provedor =
  | "openai"
  | "anthropic"
  | "groq"
  | "resend"
  | "sms"
  | "telegram"
  | "evolution"
  | "vagascom"
  | "infojobs"
  | "linkedin";

export type GrupoProvedor = "ia" | "whatsapp" | "email" | "sms" | "telegram" | "emprego";

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
  { id: "vagascom", rotulo: "Vagas.com (Vagas For Business)", grupo: "emprego", byokEmpresa: false, dica: "Senha da conta da empresa, ou chave de API se o plano tiver" },
  { id: "infojobs", rotulo: "InfoJobs", grupo: "emprego", byokEmpresa: false, dica: "Senha da conta da empresa, ou chave de API se o plano tiver" },
  { id: "linkedin", rotulo: "LinkedIn (Recruiter)", grupo: "emprego", byokEmpresa: false, dica: "Token de API de parceiro, se existir. Uso automático por login não é oferecido" },
];

// ---------------------------------------------------------------------------
// Plataformas de emprego (agente hunter). docs/specs/HUNTER_PREPARACAO.md.
// O acesso fica no cofre cifrado; só o servidor decifra e o valor nunca volta para a tela.
// ---------------------------------------------------------------------------

export const PROVEDORES_EMPREGO: Provedor[] = ["vagascom", "infojobs", "linkedin"];
export const TIPOS_ACESSO = ["api", "login"] as const;
export type TipoAcesso = (typeof TIPOS_ACESSO)[number];

export function ehPlataformaDeEmprego(p: unknown): p is "vagascom" | "infojobs" | "linkedin" {
  return typeof p === "string" && (PROVEDORES_EMPREGO as string[]).includes(p);
}

export function tipoAcessoValido(v: unknown): v is TipoAcesso {
  return v === "api" || v === "login";
}

/**
 * Validação do acesso a uma plataforma de emprego. Devolve a mensagem de erro, ou `null` se está ok.
 * `segredo` vazio é aceito quando já existe um guardado (mantém o atual).
 */
export function validarAcessoEmprego(e: {
  provedor: string;
  tipo: string;
  usuario: string;
  segredo: string;
  jaTemSegredo: boolean;
}): string | null {
  if (!ehPlataformaDeEmprego(e.provedor)) return "Plataforma inválida.";
  if (!tipoAcessoValido(e.tipo)) return "Escolha o tipo de acesso: chave de API ou usuário e senha.";
  // LinkedIn: os termos proíbem automação por login; só token de API de parceiro.
  if (e.provedor === "linkedin" && e.tipo === "login") {
    return "No LinkedIn não guardamos usuário e senha: os termos proíbem acesso automatizado e a conta pode ser banida. Use token de API de parceiro.";
  }
  if (e.tipo === "login") {
    const u = e.usuario.trim();
    if (u.length < 3 || u.length > 120) return "Informe o usuário (e-mail ou login) da conta, de 3 a 120 caracteres.";
  }
  if (!e.segredo && !e.jaTemSegredo) return e.tipo === "login" ? "Informe a senha para salvar." : "Cole a chave de API para salvar.";
  if (e.segredo && (e.segredo.length < 4 || e.segredo.length > 400)) return "O valor informado parece inválido (de 4 a 400 caracteres).";
  return null;
}

/**
 * O hunter só pode usar a plataforma de forma automática se (a) não for o LinkedIn por login e
 * (b) a pessoa marcou explicitamente, depois de confirmar com a plataforma que os termos permitem.
 */
export function automacaoPermitida(provedor: string, config: { tipo_acesso?: string; automacao?: string } | null): boolean {
  if (!ehPlataformaDeEmprego(provedor)) return false;
  if (provedor === "linkedin" && config?.tipo_acesso === "login") return false;
  return config?.automacao === "sim";
}

/** Só estes provedores têm teste de conexão automático hoje. */
export function testeAutomaticoDisponivel(p: string): boolean {
  return !ehPlataformaDeEmprego(p) && p !== "sms";
}

export function provedorValido(v: unknown): v is Provedor {
  return typeof v === "string" && PROVEDORES.some((p) => p.id === v);
}

/** Serviços de DNS curinga que apontam um nome público para qualquer IP (inclusive interno). */
const DNS_CURINGA = ["nip.io", "sslip.io", "xip.io", "traefik.me", "localtest.me", "lvh.me", "vcap.me"];

/** IPv4 que nunca deve receber a apikey: privado, loopback, link-local, CGNAT, teste e multicast/reservado. */
export function ipv4Interno(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** IP (v4 ou v6) interno? IPv6 só é aceito se for global; loopback, ULA, link-local e v4 mapeado são recusados. */
export function ipInterno(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.includes(":")) {
    const mapeado = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v);
    if (mapeado) return ipv4Interno(mapeado[1]);
    return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
  }
  return ipv4Interno(v);
}

/** O nome do host é um serviço de DNS curinga? */
export function hostDnsCuringa(host: string): boolean {
  const h = host.toLowerCase();
  return DNS_CURINGA.some((d) => h === d || h.endsWith(`.${d}`));
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
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) && ipv4Interno(h)) return null;
  if (hostDnsCuringa(h)) return null;
  if (h.includes(":") || h.startsWith("[")) return null;
  return `${u.protocol}//${u.host}`;
}

/**
 * Resolve o DNS do host e confirma que NENHUM endereço é interno. Só no servidor (usa node:dns).
 * Barra nomes públicos que apontam para a rede interna. Falha de DNS conta como não seguro.
 */
export async function hostResolveParaPublico(urlBase: string): Promise<boolean> {
  try {
    const host = new URL(urlBase).hostname;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return !ipv4Interno(host);
    const dns = await import("node:dns/promises");
    const enderecos = await dns.lookup(host, { all: true });
    return enderecos.length > 0 && enderecos.every((e) => !ipInterno(e.address));
  } catch {
    return false;
  }
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
        if (!(await hostResolveParaPublico(base))) {
          return { ok: false, mensagem: `${rotulo}: o endereço resolve para a rede interna ou não foi encontrado; a chave não foi enviada.` };
        }
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
      case "vagascom":
      case "infojobs":
      case "linkedin":
        return { ok: false, mensagem: `${rotulo}: o conector do hunter ainda não existe; o acesso está guardado e será testado quando ele for criado.` };
    }
  } catch (e) {
    const abortou = e instanceof Error && e.name === "AbortError";
    return { ok: false, mensagem: `${rotulo}: ${abortou ? "tempo esgotado" : "falha de rede"}.` };
  }
}
