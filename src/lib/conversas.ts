/**
 * Regras puras do inbox (docs/specs/COMUNICACAO_OMNICANAL.md).
 * Sem banco nem rede: tudo aqui é testável isoladamente.
 */
import { normalizarTelefoneBR } from "./whatsapp";

/** "5511999999999@s.whatsapp.net" → "5511999999999"; grupos e inválidos → null. */
export function telefoneDeJid(jid: unknown): string | null {
  if (typeof jid !== "string") return null;
  const [numero, dominio] = jid.split("@");
  if (!dominio || dominio === "g.us" || dominio === "broadcast") return null;
  const base = numero.split(":")[0]; // remove sufixo de dispositivo (":12")
  return normalizarTelefoneBR(base);
}

type MensagemEvolution = {
  conversation?: unknown;
  extendedTextMessage?: { text?: unknown } | null;
  imageMessage?: { caption?: unknown } | null;
  videoMessage?: { caption?: unknown } | null;
  documentMessage?: { caption?: unknown } | null;
} | null;

/** Texto legível da mensagem da Evolution; mídia sem legenda vira marcador. */
export function extrairTexto(message: unknown): string | null {
  const m = message as MensagemEvolution;
  if (!m || typeof m !== "object") return null;
  const candidatos = [
    m.conversation,
    m.extendedTextMessage?.text,
    m.imageMessage?.caption,
    m.videoMessage?.caption,
    m.documentMessage?.caption,
  ];
  for (const c of candidatos) {
    if (typeof c === "string" && c.trim()) return c.trim().slice(0, 4000);
  }
  if (m.imageMessage) return "[imagem]";
  if (m.videoMessage) return "[vídeo]";
  if (m.documentMessage) return "[documento]";
  return null;
}

const PALAVRAS_DE_SAIDA = new Set(["SAIR", "PARAR", "STOP", "DESCADASTRAR", "CANCELAR ALERTAS"]);

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** O candidato pediu para não receber mais mensagens? Só a mensagem inteira conta. */
export function ehPedidoDeSaida(texto: string): boolean {
  const t = semAcento(texto).trim().replace(/[.!?\s]+$/g, "").toUpperCase();
  return PALAVRAS_DE_SAIDA.has(t);
}

export function previa(texto: string, max = 80): string {
  const t = texto.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export type ContextoEnvio = {
  descadastrado: boolean;
  /** A pessoa já escreveu para a empresa nesta conversa. */
  jaRespondeu: boolean;
  /** Tem candidatura em andamento em vaga da empresa. */
  candidaturaEmAndamento: boolean;
  /** Consentimento de alertas pelo WhatsApp concedido. */
  consentimento: boolean;
};

/**
 * Pode o operador enviar? Sem opt-in não sai mensagem (LGPD): precisa haver
 * relação ativa (resposta da pessoa ou processo em andamento) ou consentimento.
 */
export function podeEnviar(c: ContextoEnvio): { ok: boolean; motivo: string | null } {
  if (c.descadastrado) {
    return { ok: false, motivo: "Esta pessoa pediu para não receber mensagens (descadastro)." };
  }
  if (c.jaRespondeu || c.candidaturaEmAndamento || c.consentimento) return { ok: true, motivo: null };
  return {
    ok: false,
    motivo:
      "Sem consentimento: a pessoa não autorizou mensagens por WhatsApp e não tem processo em andamento nem respondeu antes.",
  };
}
