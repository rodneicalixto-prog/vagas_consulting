/**
 * Busca, filtros e paginação da lista pública de vagas (P2). Puro: sem banco nem rede.
 * Spec: docs/specs/PAGINA_PUBLICA_VAGAS.md §7.
 */

export const POR_PAGINA = 20;
export const MODALIDADES = ["efetiva", "pj", "temporaria"] as const;
export type ModalidadeBusca = (typeof MODALIDADES)[number];

export type BuscaVagas = {
  q: string;
  modalidade: ModalidadeBusca | null;
  cidade: string;
  pagina: number;
};

type Bruto = { q?: string | string[]; modalidade?: string | string[]; cidade?: string | string[]; pagina?: string | string[] };

const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Texto livre seguro para entrar em filtro `ilike` do PostgREST: sem curingas, vírgula, parênteses nem barra. */
export function limparTermo(texto: string, max = 60): string {
  return texto
    .replace(/[%_*\\,()"'`;:.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Lê os parâmetros da URL; valor inválido vira "sem filtro" e a página mínima é 1. */
export function lerBusca(params: Bruto): BuscaVagas {
  const mod = primeiro(params.modalidade);
  const n = Number.parseInt(primeiro(params.pagina), 10);
  return {
    q: limparTermo(primeiro(params.q)),
    modalidade: (MODALIDADES as readonly string[]).includes(mod) ? (mod as ModalidadeBusca) : null,
    cidade: limparTermo(primeiro(params.cidade), 40),
    pagina: Number.isFinite(n) && n >= 1 ? Math.min(n, 1000) : 1,
  };
}

export const temFiltro = (b: BuscaVagas) => !!(b.q || b.modalidade || b.cidade);

/** Intervalo `from`/`to` (inclusivo) da página no PostgREST. */
export function intervaloDaPagina(pagina: number, porPagina = POR_PAGINA) {
  const from = (pagina - 1) * porPagina;
  return { from, to: from + porPagina - 1 };
}

export function totalDePaginas(total: number, porPagina = POR_PAGINA): number {
  return Math.max(1, Math.ceil(total / porPagina));
}

/** Query string da lista (omite o que está vazio e a página 1). */
export function queryDaBusca(b: BuscaVagas, pagina = b.pagina): string {
  const p = new URLSearchParams();
  if (b.q) p.set("q", b.q);
  if (b.modalidade) p.set("modalidade", b.modalidade);
  if (b.cidade) p.set("cidade", b.cidade);
  if (pagina > 1) p.set("pagina", String(pagina));
  const s = p.toString();
  return s ? `?${s}` : "";
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

type VagaFiltravel = {
  titulo: string;
  local: string | null;
  modalidade: string;
  confidencial: boolean;
  descricao: string | null;
};

/**
 * Filtra sem diferenciar acento nem maiúscula ("Olimpia" acha "Olímpia").
 * A palavra procura no título e, só em vaga não confidencial, na descrição:
 * em vaga confidencial o texto pode citar a empresa e a busca revelaria o nome.
 */
export function filtrarVagas<T extends VagaFiltravel>(vagas: T[], b: BuscaVagas): T[] {
  const q = semAcento(b.q);
  const cidade = semAcento(b.cidade);
  return vagas.filter((v) => {
    if (b.modalidade && v.modalidade !== b.modalidade) return false;
    if (cidade && !semAcento(v.local ?? "").includes(cidade)) return false;
    if (q) {
      const noTitulo = semAcento(v.titulo).includes(q);
      const naDescricao = !v.confidencial && semAcento(v.descricao ?? "").includes(q);
      if (!noTitulo && !naDescricao) return false;
    }
    return true;
  });
}

/** Fatia a página pedida de uma lista já filtrada. */
export function paginar<T>(itens: T[], pagina: number, porPagina = POR_PAGINA): T[] {
  const { from, to } = intervaloDaPagina(pagina, porPagina);
  return itens.slice(from, to + 1);
}
