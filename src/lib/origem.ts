/**
 * Origem do candidato: por qual canal ele chegou. Puro: sem banco nem rede.
 *
 * Dois registros, de propósito:
 * - `profiles.origem_*`: o PRIMEIRO toque (como a pessoa chegou ao app). Nunca é sobrescrito.
 * - `applications.origem`: por qual canal ela chegou a ESTA vaga (já existia).
 */
import { canalValido } from "./divulgacao";
import { fonteValida } from "./hunter";

export const CANAIS_ORIGEM = ["direto", "divulgacao", "hunter", "campanha", "convite", "whatsapp", "anuncio_meta", "indicacao", "outro", "nao_informado"] as const;
export type CanalOrigem = (typeof CANAIS_ORIGEM)[number];
export type Origem = { canal: CanalOrigem; detalhe: string };

export const ROTULO_CANAL_ORIGEM: Record<CanalOrigem, string> = {
  direto: "Direto no app",
  divulgacao: "Divulgação da vaga",
  hunter: "Hunter (busca ativa)",
  campanha: "Campanha (link com origem)",
  convite: "Convite da equipe",
  whatsapp: "WhatsApp",
  anuncio_meta: "Anúncio (Meta)",
  indicacao: "Indicação",
  outro: "Outro",
  nao_informado: "Não informado",
};

export const COOKIE_ORIGEM = "origem_ct";
export const DIAS_COOKIE_ORIGEM = 90;

const SLUG = /^[a-z0-9_-]{1,30}$/;

const slug = (v: string | null | undefined): string => {
  const s = (v ?? "").trim().toLowerCase();
  return SLUG.test(s) ? s : "";
};

/** Origem declarada no link: `?o=<canal da divulgação>` ou `?utm_source=<texto>`. */
export function origemDoLink(sp: URLSearchParams): Origem | null {
  const o = sp.get("o");
  if (o && canalValido(o)) return { canal: "divulgacao", detalhe: o };
  const u = slug(sp.get("utm_source"));
  if (u) return { canal: "campanha", detalhe: u };
  return null;
}

export function codificarOrigem(o: Origem): string {
  return `${o.canal}:${o.detalhe}`;
}

/** Lê o cookie de primeiro toque. Valor que não bate com o formato é ignorado. */
export function lerOrigemDoCookie(valor: string | null | undefined): Origem | null {
  if (!valor) return null;
  const [canal, ...resto] = valor.split(":");
  if (!(CANAIS_ORIGEM as readonly string[]).includes(canal) || canal === "nao_informado") return null;
  const detalhe = slug(resto.join(":"));
  if (canal === "divulgacao" && !canalValido(detalhe)) return null;
  return { canal: canal as CanalOrigem, detalhe };
}

/** Origem a gravar no perfil no cadastro: hunter vence o cookie; sem nada, "direto". */
export function origemInicial(e: { cookieOrigem?: string | null; hunterFonte?: string | null }): Origem {
  if (e.hunterFonte && fonteValida(e.hunterFonte)) return { canal: "hunter", detalhe: e.hunterFonte };
  return lerOrigemDoCookie(e.cookieOrigem) ?? { canal: "direto", detalhe: "" };
}

/** `applications.origem` (texto) → origem estruturada. */
export function interpretarOrigemCandidatura(raw: string | null | undefined): Origem {
  const t = (raw ?? "").trim();
  if (t.startsWith("divulgacao_")) return { canal: "divulgacao", detalhe: slug(t.slice(11)) };
  if (t.startsWith("hunter_")) return { canal: "hunter", detalhe: slug(t.slice(7)) };
  if (t.startsWith("campanha_")) return { canal: "campanha", detalhe: slug(t.slice(9)) };
  if (t === "convite") return { canal: "convite", detalhe: "" };
  if (t === "" || t === "app_candidato") return { canal: "direto", detalhe: "" };
  return { canal: "outro", detalhe: slug(t) };
}

/** Origem estruturada → texto de `applications.origem`. */
export function textoDaCandidatura(o: Origem): string {
  switch (o.canal) {
    case "divulgacao":
      return o.detalhe ? `divulgacao_${o.detalhe}` : "app_candidato";
    case "hunter":
    case "campanha":
      return o.detalhe ? `${o.canal}_${o.detalhe}` : "app_candidato";
    case "convite":
      return "convite";
    default:
      return "app_candidato";
  }
}

export function rotuloOrigem(o: Origem): string {
  const base = ROTULO_CANAL_ORIGEM[o.canal];
  return o.detalhe ? `${base}: ${o.detalhe}` : base;
}

export type LinhaOrigem = { canal: CanalOrigem; detalhe: string; total: number };

/** Agrupa por canal e detalhe, do maior para o menor. */
export function agruparOrigens(origens: Origem[]): LinhaOrigem[] {
  const m = new Map<string, LinhaOrigem>();
  for (const o of origens) {
    const k = `${o.canal}|${o.detalhe}`;
    const atual = m.get(k);
    if (atual) atual.total += 1;
    else m.set(k, { canal: o.canal, detalhe: o.detalhe, total: 1 });
  }
  return [...m.values()].sort((a, b) => b.total - a.total || a.canal.localeCompare(b.canal));
}

export type ResumoCanal = { canal: CanalOrigem; cadastros: number; candidaturas: number; contratados: number };

/** Junta cadastros (perfil) e candidaturas por CANAL, com contratados. Conversão = contratados ÷ candidaturas. */
export function resumirPorCanal(
  perfis: { canal: CanalOrigem }[],
  candidaturas: { origem: string | null; status: string }[],
): (ResumoCanal & { conversao: number | null })[] {
  const m = new Map<CanalOrigem, ResumoCanal>();
  const pega = (c: CanalOrigem) => {
    let r = m.get(c);
    if (!r) {
      r = { canal: c, cadastros: 0, candidaturas: 0, contratados: 0 };
      m.set(c, r);
    }
    return r;
  };
  for (const p of perfis) pega(p.canal).cadastros += 1;
  for (const a of candidaturas) {
    const r = pega(interpretarOrigemCandidatura(a.origem).canal);
    r.candidaturas += 1;
    if (a.status === "contratado") r.contratados += 1;
  }
  return [...m.values()]
    .map((r) => ({ ...r, conversao: r.candidaturas > 0 ? Math.round((r.contratados / r.candidaturas) * 1000) / 10 : null }))
    .sort((a, b) => b.cadastros + b.candidaturas - (a.cadastros + a.candidaturas));
}

/** Início do período (ISO) para "últimos N dias"; `null` = sem limite. */
export function desdeDias(dias: number, agora: Date = new Date()): string | null {
  return dias > 0 ? new Date(agora.getTime() - dias * 86400000).toISOString() : null;
}
