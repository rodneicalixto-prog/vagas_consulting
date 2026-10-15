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

/** Limite de tamanho de anexo recebido (bytes): 15 MB. */
export const TAMANHO_MAX_ANEXO = 15 * 1024 * 1024;

/** Limite de envio pelo painel: o corpo da requisição na Vercel é de 4,5 MB. */
export const TAMANHO_MAX_ENVIO = 4 * 1024 * 1024;

export type TipoAnexo = "imagem" | "documento" | "audio" | "video";

const MIME_PERMITIDOS: Record<string, TipoAnexo> = {
  "image/jpeg": "imagem",
  "image/png": "imagem",
  "image/webp": "imagem",
  "application/pdf": "documento",
  "application/msword": "documento",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "documento",
  "application/vnd.ms-excel": "documento",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "documento",
  "text/plain": "documento",
  "audio/ogg": "audio",
  "audio/webm": "audio",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/aac": "audio",
  "video/mp4": "video",
};

/** Tipo do anexo a partir do mime; `null` se não for permitido. */
export function tipoDoAnexo(mime: string | null | undefined): TipoAnexo | null {
  if (!mime) return null;
  const base = mime.split(";")[0].trim().toLowerCase();
  return MIME_PERMITIDOS[base] ?? null;
}

/** Nome de arquivo seguro para caminho de armazenamento. */
export function nomeSeguro(nome: string | null | undefined): string {
  const base = (nome ?? "arquivo").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const limpo = base.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+/, "").slice(0, 80);
  return limpo || "arquivo";
}

/** Extensão sugerida para um mime (usada quando o provedor não manda o nome). */
export function extensaoDoMime(mime: string | null | undefined): string {
  const base = (mime ?? "").split(";")[0].trim().toLowerCase();
  const mapa: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "video/mp4": "mp4",
    "text/plain": "txt",
  };
  return mapa[base] ?? "bin";
}

/** Texto curto para a lista de conversas quando a mensagem é um anexo. */
export function rotuloAnexo(tipo: TipoAnexo | "texto", nome?: string | null, legenda?: string | null): string {
  if (legenda && legenda.trim()) return legenda.trim();
  switch (tipo) {
    case "imagem":
      return "📷 Imagem";
    case "audio":
      return "🎤 Áudio";
    case "video":
      return "🎥 Vídeo";
    case "documento":
      return `📎 ${nome ?? "Documento"}`;
    default:
      return "";
  }
}

export type MidiaDetectada = {
  tipo: TipoAnexo;
  mime: string | null;
  nome: string | null;
  legenda: string | null;
};

const CHAVES_MIDIA: [string, TipoAnexo][] = [
  ["imageMessage", "imagem"],
  ["audioMessage", "audio"],
  ["videoMessage", "video"],
  ["documentMessage", "documento"],
];

/** Mídia (imagem, áudio, vídeo, documento) dentro da mensagem da Evolution. */
export function detectarMidia(message: unknown): MidiaDetectada | null {
  const raiz = message as Record<string, unknown> | null;
  if (!raiz || typeof raiz !== "object") return null;
  const embrulho = (raiz.documentWithCaptionMessage as { message?: unknown } | null | undefined)?.message;
  const m: Record<string, unknown> =
    embrulho && typeof embrulho === "object" ? { ...raiz, ...(embrulho as Record<string, unknown>) } : raiz;
  const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  for (const [chave, tipo] of CHAVES_MIDIA) {
    const x = m[chave];
    if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      return {
        tipo,
        mime: texto(o.mimetype),
        nome: texto(o.fileName),
        legenda: texto(o.caption)?.slice(0, 4000) ?? null,
      };
    }
  }
  return null;
}
