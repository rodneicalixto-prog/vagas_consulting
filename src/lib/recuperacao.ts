/**
 * Recuperação de notas por pergunta: em vez de mandar toda a base ao modelo,
 * envia só as notas que casam com o que a pessoa perguntou. Lexical,
 * determinística e sem custo. Quando nada casa, volta a enviar todas (nunca
 * piora o comportamento anterior). Puro: sem banco nem rede.
 */

export type NotaRecuperavel = { tipo: string; titulo: string; corpo_md: string };

export const MARCADOR_TODAS = "__todas__";
export const LIMITE_NOTAS = 8;

const STOP = new Set([
  "para", "como", "sobre", "ainda", "esta", "este", "essa", "esse", "isso", "aquele", "pela", "pelo", "entre",
  "quando", "onde", "qual", "quais", "seria", "serao", "pode", "podem", "deve", "devem", "nossa", "nosso", "voce",
  "voces", "gostaria", "saber", "queria", "preciso", "tenho", "tinha", "mais", "menos", "muito", "tambem",
  "obrigado", "obrigada", "bom", "boa", "dia", "tarde", "noite", "ola", "oi", "favor", "por", "que", "com",
  "uma", "uns", "umas", "dos", "das", "nao", "sim", "tem", "ter", "vou", "fui", "foi", "esta", "estou", "vaga",
]);

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Radical simples: palavras longas viram o prefixo, para casar singular e plural. */
function radical(w: string): string {
  return w.length >= 7 ? w.slice(0, 6) : w.replace(/s$/, "");
}

export function termos(texto: string): string[] {
  const out = new Set<string>();
  for (const w of normalizar(texto).split(/[^a-z0-9]+/)) {
    if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) continue;
    out.add(radical(w));
  }
  return [...out];
}

export type Selecao<T extends NotaRecuperavel> = {
  notas: T[];
  /** Nada casou (ou a base é pequena): todas foram enviadas. */
  todas: boolean;
  pontuacoes: Map<string, number>;
};

/**
 * Escolhe as notas mais relevantes para a consulta. Título pesa 3, corpo pesa
 * 1 (limitado). Base com até `limite` notas vai inteira.
 */
export function selecionarNotas<T extends NotaRecuperavel>(notas: T[], consulta: string, limite = LIMITE_NOTAS): Selecao<T> {
  const pontuacoes = new Map<string, number>();
  if (notas.length <= limite) return { notas, todas: true, pontuacoes };

  const q = termos(consulta);
  if (q.length === 0) return { notas, todas: true, pontuacoes };

  const pont = notas.map((n) => {
    const t = termos(n.titulo);
    const c = new Set(termos(n.corpo_md));
    let p = 0;
    for (const termo of q) {
      if (t.includes(termo)) p += 3;
      if (c.has(termo)) p += 1;
    }
    pontuacoes.set(n.titulo, p);
    return { n, p };
  });

  const relevantes = pont.filter((x) => x.p > 0).sort((a, b) => b.p - a.p);
  if (relevantes.length === 0) return { notas, todas: true, pontuacoes };
  return { notas: relevantes.slice(0, limite).map((x) => x.n), todas: false, pontuacoes };
}

/** Fonte gravada na sugestão: só as notas enviadas, ou o marcador de "todas". */
export function fonteDaSelecao(titulos: string[], todas: boolean): string[] {
  return todas ? [MARCADOR_TODAS, ...titulos] : titulos;
}

// ---------------------------------------------------------------------------
// Qualidade por nota
// ---------------------------------------------------------------------------

export type SugestaoParaQualidade = { estado: string; fonte: unknown };

export type QualidadeNota = {
  titulo: string;
  respostas: number;
  usadas: number;
  editadas: number;
  descartadas: number;
  /** Percentual de respostas usadas sem edição, ou null com amostra pequena. */
  taxaSemEdicao: number | null;
};

export const AMOSTRA_MINIMA = 5;

/**
 * Por nota: em quantas respostas decididas ela foi enviada e o que a pessoa fez.
 * Ignora sugestões em que todas as notas foram enviadas (sem atribuição).
 * É correlação: a nota esteve presente, não necessariamente foi usada.
 */
export function qualidadePorNota(sugestoes: SugestaoParaQualidade[]): Map<string, QualidadeNota> {
  const m = new Map<string, QualidadeNota>();
  for (const s of sugestoes) {
    if (!["usada", "editada", "descartada"].includes(s.estado)) continue;
    const fonte = Array.isArray(s.fonte) ? (s.fonte as unknown[]).filter((x): x is string => typeof x === "string") : [];
    if (fonte.length === 0 || fonte[0] === MARCADOR_TODAS) continue;
    for (const titulo of fonte) {
      if (titulo.startsWith("Vaga: ")) continue;
      const q = m.get(titulo) ?? { titulo, respostas: 0, usadas: 0, editadas: 0, descartadas: 0, taxaSemEdicao: null };
      q.respostas += 1;
      if (s.estado === "usada") q.usadas += 1;
      else if (s.estado === "editada") q.editadas += 1;
      else q.descartadas += 1;
      m.set(titulo, q);
    }
  }
  for (const q of m.values()) {
    q.taxaSemEdicao = q.respostas >= AMOSTRA_MINIMA ? Math.round((q.usadas / q.respostas) * 100) : null;
  }
  return m;
}
