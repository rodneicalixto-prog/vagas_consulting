/**
 * Linhas de WhatsApp (um número por linha): nome da instância, limites,
 * modo do agente e leitura do estado. Puro: sem banco nem rede.
 * Spec: docs/specs/LINHAS_WHATSAPP.md.
 */

export type ModoAgente = "desligado" | "sugestao" | "automatico";
export const MODOS_AGENTE: ModoAgente[] = ["desligado", "sugestao", "automatico"];
export const ROTULO_MODO: Record<ModoAgente, string> = {
  desligado: "Desligado",
  sugestao: "Só sugestão (a pessoa envia)",
  automatico: "Atende sozinho (se o agente permitir)",
};

export function modoValido(v: unknown): v is ModoAgente {
  return v === "desligado" || v === "sugestao" || v === "automatico";
}

/** Linha dedicada começa só com sugestão; compartilhada herda o atendimento atual. */
export function modoPadrao(operadorId: string | null): ModoAgente {
  return operadorId ? "sugestao" : "automatico";
}

function slug(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** Nome único da instância na Evolution: empresa, apelido e sufixo aleatório. */
export function nomeDaInstancia(empresa: string, apelido: string, sufixo: string): string {
  const base = [slug(empresa, 18), slug(apelido, 18)].filter(Boolean);
  const fim = slug(sufixo, 6) || "x";
  // Sem empresa nem apelido aproveitáveis, o prefixo genérico garante nome válido.
  const partes = base.length > 0 ? [...base, fim] : ["linha", fim];
  return partes.join("-").slice(0, 60).replace(/-+$/g, "");
}

export function validarApelido(s: string): string | null {
  const t = s.trim();
  if (t.length < 2) return "Dê um apelido ao número (pelo menos 2 letras).";
  if (t.length > 40) return "O apelido pode ter até 40 caracteres.";
  return null;
}

export function podeCriarLinha(p: {
  role: string;
  ativas: number;
  max: number;
}): { ok: boolean; motivo: string | null } {
  if (p.role === "superadmin") return { ok: true, motivo: null };
  if (p.ativas >= p.max) {
    return {
      ok: false,
      motivo: `A empresa já usa ${p.ativas} de ${p.max} número(s) do plano. Peça à plataforma para ampliar o limite.`,
    };
  }
  return { ok: true, motivo: null };
}

export type EstadoConexao = "conectada" | "conectando" | "desconectada" | "desconhecido";

export function estadoDaConexao(bruto: unknown): EstadoConexao {
  const s = typeof bruto === "string" ? bruto.toLowerCase() : "";
  if (s === "open") return "conectada";
  if (s === "connecting") return "conectando";
  if (s === "close" || s === "closed") return "desconectada";
  return "desconhecido";
}

export const ROTULO_ESTADO: Record<EstadoConexao, string> = {
  conectada: "Conectada",
  conectando: "Aguardando o QR code",
  desconectada: "Desconectada",
  desconhecido: "Estado desconhecido",
};

/** Dígitos do número a partir do identificador do WhatsApp (5511...@s.whatsapp.net). */
export function numeroDoJid(jid: unknown): string | null {
  if (typeof jid !== "string") return null;
  const d = (jid.split("@")[0]?.split(":")[0] ?? "").replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15 ? d : null;
}

/** Corpo do webhook por instância (formato da Evolution v2). */
export function corpoDoWebhook(url: string) {
  return {
    webhook: {
      enabled: true,
      url,
      byEvents: false,
      base64: false,
      events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE"],
    },
  };
}

/** Só aceita imagem de QR em base64 de PNG, para nunca inserir texto arbitrário na tela. */
export function qrSeguro(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  return m && m[1].length > 100 && m[1].length < 200_000 ? v : null;
}
