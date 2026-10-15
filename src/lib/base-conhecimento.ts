/**
 * Confiabilidade da base de conhecimento do agente: validade, revisão,
 * conflito e cobertura. Puro: sem banco nem rede.
 * Spec: docs/specs/AGENTE_IA_FASE3.md (camadas de confiabilidade).
 */
import { anonimizarTexto } from "./agente";

export type NotaBase = {
  id: string;
  tipo: string;
  titulo: string;
  corpo_md: string;
  status: string;
  valida_ate: string | null;
  aprovada_em: string | null;
  dono_id: string | null;
};

export type EstadoValidade = "sem_prazo" | "vigente" | "vence_em_breve" | "vencida";

export const DIAS_AVISO_VENCIMENTO = 15;
export const DIAS_REVISAO = 90;

function dia(iso: string): number {
  return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

export function hojeISO(agora = new Date()): string {
  return agora.toISOString().slice(0, 10);
}

export function estadoValidade(validaAte: string | null, hoje: string): EstadoValidade {
  if (!validaAte || !/^\d{4}-\d{2}-\d{2}/.test(validaAte)) return "sem_prazo";
  const dias = (dia(validaAte) - dia(hoje)) / 86_400_000;
  if (dias < 0) return "vencida";
  return dias <= DIAS_AVISO_VENCIMENTO ? "vence_em_breve" : "vigente";
}

/** Aprovada há mais de DIAS_REVISAO dias, sem prazo definido: pede revisão. */
export function precisaRevisao(n: Pick<NotaBase, "status" | "valida_ate" | "aprovada_em">, hoje: string): boolean {
  if (n.status !== "aprovada" || !n.aprovada_em) return false;
  if (n.valida_ate) return false;
  return (dia(hoje) - dia(n.aprovada_em.slice(0, 10))) / 86_400_000 > DIAS_REVISAO;
}

/** Nota que o agente pode usar agora: aprovada e dentro da validade. */
export function entraNoContexto(n: Pick<NotaBase, "status" | "valida_ate">, hoje: string): boolean {
  return n.status === "aprovada" && estadoValidade(n.valida_ate, hoje) !== "vencida";
}

// ---------------------------------------------------------------------------
// Conflitos
// ---------------------------------------------------------------------------

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const STOP = new Set([
  "para", "como", "sobre", "ainda", "esta", "este", "essa", "esse", "dele", "dela", "pela", "pelo", "entre",
  "quando", "onde", "qual", "quais", "sera", "serao", "pode", "podem", "deve", "devem", "nossa", "nosso",
  "vaga", "vagas", "processo", "candidato", "candidatos", "empresa", "mais", "menos", "muito", "tambem",
]);

function palavras(s: string): Set<string> {
  return new Set(
    normalizar(s)
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 4 && !STOP.has(p)),
  );
}

/** Números com unidade ou moeda ("5 dias", "R$ 1.200", "30%"), normalizados. */
export function valoresDoTexto(s: string): Set<string> {
  const t = normalizar(s);
  const out = new Set<string>();
  for (const m of t.matchAll(/(r\$\s*[\d.,]+|\d+(?:[.,]\d+)?\s*(?:%|dias?|horas?|h\b|meses|semanas?|anos?|reais))/g)) {
    out.add(m[1].replace(/\s+/g, "").replace(/\.(?=\d{3})/g, ""));
  }
  return out;
}

export type Conflito = { a: string; b: string; titulo_a: string; titulo_b: string; motivo: string };

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/**
 * Pares de notas vigentes do mesmo tipo que tratam do mesmo assunto e trazem
 * valores diferentes (ou o mesmo título). Heurística: sinaliza, não decide.
 */
export function detectarConflitos(notas: NotaBase[], hoje: string): Conflito[] {
  const ativas = notas.filter((n) => entraNoContexto(n, hoje));
  const out: Conflito[] = [];
  for (let i = 0; i < ativas.length; i++) {
    for (let j = i + 1; j < ativas.length; j++) {
      const a = ativas[i];
      const b = ativas[j];
      if (normalizar(a.titulo).trim() === normalizar(b.titulo).trim()) {
        out.push({ a: a.id, b: b.id, titulo_a: a.titulo, titulo_b: b.titulo, motivo: "Mesmo título em duas notas aprovadas." });
        continue;
      }
      if (a.tipo !== b.tipo) continue;
      const mesmoAssunto = jaccard(palavras(a.titulo), palavras(b.titulo)) >= 0.5;
      if (!mesmoAssunto) continue;
      const va = valoresDoTexto(a.corpo_md);
      const vb = valoresDoTexto(b.corpo_md);
      if (va.size === 0 || vb.size === 0) continue;
      const diferentes = [...va].some((x) => !vb.has(x)) || [...vb].some((x) => !va.has(x));
      if (diferentes) {
        out.push({
          a: a.id,
          b: b.id,
          titulo_a: a.titulo,
          titulo_b: b.titulo,
          motivo: `Assunto parecido com valores diferentes (${[...va].slice(0, 3).join(", ")} × ${[...vb].slice(0, 3).join(", ")}).`,
        });
      }
    }
  }
  return out.slice(0, 20);
}

// ---------------------------------------------------------------------------
// Cobertura
// ---------------------------------------------------------------------------

export type TemaSemResposta = { termo: string; vezes: number };

/** Termos que mais aparecem em perguntas que o agente não soube responder. */
export function temasSemResposta(perguntas: string[], minimo = 2, limite = 8): TemaSemResposta[] {
  const cont = new Map<string, number>();
  for (const p of perguntas) {
    const vistos = new Set<string>();
    for (const w of normalizar(anonimizarTexto(p)).split(/[^a-z0-9]+/)) {
      if (w.length < 5 || STOP.has(w) || /^\d+$/.test(w) || w === "telefone" || w === "email") continue;
      vistos.add(w);
    }
    for (const w of vistos) cont.set(w, (cont.get(w) ?? 0) + 1);
  }
  return [...cont.entries()]
    .filter(([, n]) => n >= minimo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([termo, vezes]) => ({ termo, vezes }));
}

/** Tipos de nota sem nenhuma nota vigente aprovada. */
export function tiposSemCobertura(notas: NotaBase[], tipos: readonly string[], hoje: string): string[] {
  return tipos.filter((t) => !notas.some((n) => n.tipo === t && entraNoContexto(n, hoje)));
}

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------

export type ResumoBase = {
  aprovadasVigentes: number;
  vencidas: number;
  vencemEmBreve: number;
  paraRevisar: number;
  semDono: number;
  conflitos: number;
  nivel: "confiavel" | "atencao" | "critico";
};

export function resumirBase(notas: NotaBase[], hoje: string): ResumoBase {
  const aprovadas = notas.filter((n) => n.status === "aprovada");
  const vencidas = aprovadas.filter((n) => estadoValidade(n.valida_ate, hoje) === "vencida").length;
  const vencem = aprovadas.filter((n) => estadoValidade(n.valida_ate, hoje) === "vence_em_breve").length;
  const revisar = aprovadas.filter((n) => precisaRevisao(n, hoje)).length;
  const semDono = aprovadas.filter((n) => !n.dono_id).length;
  const conflitos = detectarConflitos(notas, hoje).length;
  const vigentes = aprovadas.length - vencidas;
  const nivel: ResumoBase["nivel"] =
    vigentes === 0 || conflitos > 0 ? "critico" : vencidas > 0 || vencem > 0 || revisar > 0 || semDono > 0 ? "atencao" : "confiavel";
  return { aprovadasVigentes: vigentes, vencidas, vencemEmBreve: vencem, paraRevisar: revisar, semDono, conflitos, nivel };
}
