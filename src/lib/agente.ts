/**
 * Regras puras do agente de IA e da base de conhecimento
 * (docs/specs/AGENTE_IA_FASE3.md). Sem banco nem rede.
 */

export const TIPOS_NOTA = ["politica", "roteiro", "faq", "vaga", "licao"] as const;
export type TipoNota = (typeof TIPOS_NOTA)[number];

export const ROTULO_TIPO: Record<TipoNota, string> = {
  politica: "Política",
  roteiro: "Roteiro",
  faq: "Perguntas frequentes",
  vaga: "Vagas",
  licao: "Lições aprendidas",
};

export const STATUS_NOTA = ["rascunho", "aprovada", "arquivada"] as const;
export type StatusNota = (typeof STATUS_NOTA)[number];

export const PROVEDORES_AGENTE = ["groq", "openai", "anthropic"] as const;
export type ProvedorAgente = (typeof PROVEDORES_AGENTE)[number];

export const TONS = ["formal", "proximo"] as const;
export type Tom = (typeof TONS)[number];

export const LIMITE_TITULO = 120;
export const LIMITE_CORPO = 20_000;
export const LIMITE_ROTEIRO = 20_000;

export function tipoNotaValido(v: unknown): v is TipoNota {
  return typeof v === "string" && (TIPOS_NOTA as readonly string[]).includes(v);
}

export function provedorAgenteValido(v: unknown): v is ProvedorAgente {
  return typeof v === "string" && (PROVEDORES_AGENTE as readonly string[]).includes(v);
}

export function tomValido(v: unknown): v is Tom {
  return typeof v === "string" && (TONS as readonly string[]).includes(v);
}

/** Valida título, tipo e corpo; devolve a mensagem de erro ou null. */
export function validarNota(n: { titulo: string; tipo: unknown; corpo_md: string }): string | null {
  const titulo = n.titulo.trim();
  if (titulo.length < 3) return "Informe um título com pelo menos 3 caracteres.";
  if (titulo.length > LIMITE_TITULO) return `O título deve ter até ${LIMITE_TITULO} caracteres.`;
  if (!tipoNotaValido(n.tipo)) return "Tipo de nota inválido.";
  if (n.corpo_md.length > LIMITE_CORPO) return `O texto deve ter até ${LIMITE_CORPO} caracteres.`;
  return null;
}

/** Nome de arquivo estável e legível para a nota (sem acentos nem símbolos). */
export function slugNota(titulo: string): string {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "nota";
}

/** Nota em Markdown com cabeçalho no formato do Obsidian (propriedades). */
export function montarNotaMd(n: {
  titulo: string;
  tipo: TipoNota;
  status: StatusNota;
  versao: number;
  atualizadoEm: string;
  corpo_md: string;
}): string {
  const esc = (s: string) => s.replace(/"/g, '\\"');
  return [
    "---",
    `titulo: "${esc(n.titulo)}"`,
    `tipo: ${n.tipo}`,
    `status: ${n.status}`,
    `versao: ${n.versao}`,
    `atualizado: ${n.atualizadoEm}`,
    "---",
    "",
    `# ${n.titulo}`,
    "",
    n.corpo_md.trim(),
    "",
  ].join("\n");
}
