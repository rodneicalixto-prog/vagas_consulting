/**
 * Página pública de vagas (P1): metadados e dados estruturados `JobPosting`.
 * Puro: sem banco nem rede. Spec: docs/specs/PAGINA_PUBLICA_VAGAS.md §5 e §6.
 *
 * Sigilo: vaga confidencial usa "Vagas Consulting" como organização e nunca
 * recebe o nome da empresa (a página pública não reescreve o texto livre).
 */
import { EMPRESA_CONFIDENCIAL, nomeEmpresa } from "./sigilo";

export const MARCA = "Vagas Consulting";

export type VagaPublica = {
  id: string;
  titulo: string;
  local: string | null;
  modalidade: "efetiva" | "pj" | "temporaria";
  modelo_trabalho: "presencial" | "hibrido" | "remoto" | null;
  remuneracao_texto: string | null;
  descricao: string | null;
  regras?: unknown;
  publicada_em: string | null;
  updated_at?: string | null;
  /** Calculado no servidor: vaga confidencial cujo título ou texto cita a empresa. */
  menciona_empresa?: boolean;
  expira_em: string | null;
  confidencial: boolean;
  companies: { nome_fantasia: string | null; razao_social: string } | null;
};

const TIPO_EMPREGO = {
  efetiva: "FULL_TIME",
  pj: "CONTRACTOR",
  temporaria: "TEMPORARY",
} as const;

export function tipoEmprego(m: VagaPublica["modalidade"]): string {
  return TIPO_EMPREGO[m];
}

/** Primeiras ~`max` letras, sem cortar palavra, em uma linha só. */
export function resumoDescricao(texto: string | null | undefined, max = 155): string {
  const limpo = (texto ?? "").replace(/\s+/g, " ").trim();
  if (limpo.length <= max) return limpo;
  const corte = limpo.slice(0, max + 1);
  const ultimoEspaco = corte.lastIndexOf(" ");
  const base = (ultimoEspaco > max * 0.6 ? corte.slice(0, ultimoEspaco) : limpo.slice(0, max)).replace(
    /[\s,;:.\-–—]+$/,
    "",
  );
  return `${base}…`;
}

/** `<cargo> em <cidade> | Vagas Consulting` (sem a cidade quando não há local). */
export function tituloDaVaga(v: Pick<VagaPublica, "titulo" | "local"> & { modelo_trabalho?: VagaPublica["modelo_trabalho"] }): string {
  const local = v.modelo_trabalho === "remoto" ? "Remoto" : (v.local ?? "").trim();
  return local ? `${v.titulo} em ${local} | ${MARCA}` : `${v.titulo} | ${MARCA}`;
}

/** Texto puro → HTML simples para o `description` do JobPosting (preserva as quebras de linha). */
export function descricaoEmHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");
}

/** A vaga ainda está dentro do prazo? */
export function dentroDoPrazo(expiraEm: string | null | undefined, agora = new Date()): boolean {
  return !expiraEm || new Date(expiraEm).getTime() > agora.getTime();
}

const UFS = new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));

/** "Cidade - UF", "Cidade, UF" ou "Cidade/UF" → cidade e estado; senão só o texto. */
export function separarLocal(local: string | null | undefined): { cidade: string; uf?: string } | null {
  const t = (local ?? "").trim();
  if (!t) return null;
  const m = t.match(/^(.+?)\s*[-,/–]\s*([A-Za-z]{2})$/);
  return m && UFS.has(m[2].toUpperCase()) ? { cidade: m[1].trim(), uf: m[2].toUpperCase() } : { cidade: t };
}

/**
 * `JobPosting` para o Google. Devolve `null` quando a vaga não deve ser marcada
 * (fora do prazo ou sem descrição).
 */
export function montarJobPosting(
  v: VagaPublica,
  siteUrl: string,
  agora = new Date(),
): Record<string, unknown> | null {
  if (!dentroDoPrazo(v.expira_em, agora)) return null;
  if (v.menciona_empresa) return null;
  const descricao = (v.descricao ?? "").trim();
  if (!descricao || !v.publicada_em) return null;
  // Vaga presencial ou híbrida sem local: o Google rejeita o JobPosting, então não marca.
  const loc = separarLocal(v.local);
  if (v.modelo_trabalho !== "remoto" && !loc) return null;

  const empresa = nomeEmpresa(v.companies, v.confidencial);
  const organizacao = v.confidencial
    ? { "@type": "Organization", name: MARCA, sameAs: siteUrl, logo: `${siteUrl}/icons/icon-512.png` }
    : { "@type": "Organization", name: empresa || MARCA };

  const dados: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: v.titulo,
    description: descricaoEmHtml(descricao),
    datePosted: v.publicada_em,
    employmentType: tipoEmprego(v.modalidade),
    hiringOrganization: organizacao,
    identifier: { "@type": "PropertyValue", name: MARCA, value: v.id },
    directApply: false,
    url: `${siteUrl}/vagas/${v.id}`,
  };
  if (v.expira_em) dados.validThrough = v.expira_em;

  if (v.modelo_trabalho === "remoto") {
    dados.jobLocationType = "TELECOMMUTE";
    dados.applicantLocationRequirements = { "@type": "Country", name: "BR" };
  } else if (loc) {
    dados.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: loc.cidade,
        ...(loc.uf ? { addressRegion: loc.uf } : {}),
        addressCountry: "BR",
      },
    };
  }
  return dados;
}

/** Serializa para `<script type="application/ld+json">` sem permitir fechar a tag. */
export function jsonLdSeguro(dados: unknown): string {
  return JSON.stringify(dados)
    .replace(/</g, "\\u003c")
    .split(String.fromCharCode(0x2028)).join("\\u2028")
    .split(String.fromCharCode(0x2029)).join("\\u2029");
}

/** Texto que não pode sair no HTML de vaga confidencial. */
export function nomeParaExibir(v: VagaPublica): string {
  return v.confidencial ? EMPRESA_CONFIDENCIAL : nomeEmpresa(v.companies, false, null, "Empresa");
}

const semAcento = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Vaga confidencial cujo título ou descrição cita o nome da empresa (fantasia ou razão social).
 * Nesse caso a página não gera dados estruturados nem resumo nos metadados.
 */
export function mencionaEmpresa(v: Pick<VagaPublica, "titulo" | "descricao" | "confidencial" | "companies">): boolean {
  if (!v.confidencial || !v.companies) return false;
  const texto = semAcento(`${v.titulo} ${v.descricao ?? ""}`);
  return [v.companies.nome_fantasia, v.companies.razao_social].some((n) => {
    const nome = semAcento(n ?? "").trim();
    return nome.length >= 3 && texto.includes(nome);
  });
}

/** Links de compartilhamento: cópia usa `utm_source=site`; WhatsApp usa o canal `whatsapp` da divulgação. */
export function linksCompartilhar(siteUrl: string, id: string, titulo: string) {
  const base = `${siteUrl}/vagas/${id}`;
  const linkWhatsapp = `${base}?o=whatsapp`;
  return {
    copiar: `${base}?utm_source=site`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`Vaga: ${titulo}\n${linkWhatsapp}`)}`,
  };
}

/** Situação da página pública de uma vaga, em uma linha, para a Central da vaga. */
export function estadoPaginaPublica(
  v: { status: string; confidencial: boolean; expira_em: string | null },
  agora = new Date(),
): { noAr: boolean; texto: string } {
  if (v.status !== "publicada") return { noAr: false, texto: "Fora do ar: a vaga não está publicada." };
  if (!dentroDoPrazo(v.expira_em, agora)) return { noAr: false, texto: "Fora do ar: o prazo da vaga venceu." };
  return {
    noAr: true,
    texto: v.confidencial
      ? "No ar e indexável pelo Google, com a empresa em sigilo (Vagas Consulting como organização)."
      : "No ar e indexável pelo Google.",
  };
}
