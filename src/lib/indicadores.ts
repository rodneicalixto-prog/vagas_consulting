/**
 * Indicadores de R&S (passo 3M): cálculo no código a partir do banco e das
 * entradas manuais. Indicador sem dado é "sem dado", nunca zero.
 * Puro: sem banco nem rede. Spec: docs/specs/AGENTE_IA_FASE3.md §14.7, §14.8, §14.19.
 */

export const ETAPAS = ["recebida", "triagem", "entrevista", "teste", "proposta", "contratado"] as const;
export type Etapa = (typeof ETAPAS)[number];
export const ROTULO_ETAPA: Record<Etapa, string> = {
  recebida: "Candidaturas",
  triagem: "Triagem",
  entrevista: "Entrevista",
  teste: "Teste ou dinâmica",
  proposta: "Proposta",
  contratado: "Contratado",
};

export type VagaIn = {
  id: string;
  status: string;
  publicada_em: string | null;
  created_at: string;
  updated_at: string;
};

export type CandidaturaIn = {
  id: string;
  job_id: string;
  status: string;
  origem: string | null;
  created_at: string;
  updated_at: string;
};

export type Manual = {
  custo_total?: number | null;
  nps?: number | null;
  turnover_precoce_pct?: number | null;
  sla_pct?: number | null;
  ofertas_enviadas?: number | null;
  ofertas_aceitas?: number | null;
};

export type Metas = {
  tempo_fechamento_dias?: number | null;
  sla_pct?: number | null;
  custo_max?: number | null;
  aceitacao_pct?: number | null;
  turnover_max_pct?: number | null;
  nps_min?: number | null;
};

export const METAS_PADRAO: Required<Metas> = {
  tempo_fechamento_dias: 30,
  sla_pct: 90,
  custo_max: 0,
  aceitacao_pct: 80,
  turnover_max_pct: 10,
  nps_min: 50,
};

export type StatusIndicador = "verde" | "atencao" | "abaixo" | "sem_dado";

export type Indicador = {
  id: string;
  nome: string;
  valor: number | null;
  unidade: string;
  meta: number | null;
  direcao: "menor" | "maior";
  status: StatusIndicador;
  origem: "banco" | "manual";
  nota: string;
};

export type LinhaFunil = { etapa: Etapa; rotulo: string; quantidade: number; conversao: number | null };
export type LinhaFonte = { fonte: string; candidaturas: number; contratacoes: number; participacao: number | null };

export type Resultado = {
  indicadores: Indicador[];
  funil: LinhaFunil[];
  gargalo: string | null;
  fontes: LinhaFonte[];
  principalFonte: string | null;
  leituras: string[];
  faltando: string[];
  contratacoes: number;
  vagasFechadas: number;
};

export function statusDe(
  valor: number | null,
  meta: number | null,
  direcao: "menor" | "maior",
): StatusIndicador {
  if (valor === null || Number.isNaN(valor)) return "sem_dado";
  if (meta === null || meta <= 0) return "atencao";
  if (direcao === "maior") {
    if (valor >= meta) return "verde";
    return valor >= meta * 0.9 ? "atencao" : "abaixo";
  }
  if (valor <= meta) return "verde";
  return valor <= meta * 1.1 ? "atencao" : "abaixo";
}

export function periodoDoMes(ym: string): { ini: Date; fim: Date; rotulo: string; inicioISO: string } | null {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) return null;
  return {
    ini: new Date(Date.UTC(ano, mes - 1, 1)),
    fim: new Date(Date.UTC(ano, mes, 1)),
    rotulo: `${String(mes).padStart(2, "0")}/${ano}`,
    inicioISO: `${ano}-${String(mes).padStart(2, "0")}-01`,
  };
}

function noPeriodo(iso: string, ini: Date, fim: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= ini.getTime() && t < fim.getTime();
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Nível da etapa a partir do status atual (rejeitada etc. não revelam a etapa). */
export function nivelDoStatus(status: string): number {
  const i = (ETAPAS as readonly string[]).indexOf(status);
  return i >= 0 ? i : 0;
}

export function calcular(p: {
  vagas: VagaIn[];
  candidaturas: CandidaturaIn[];
  /** Maior nível alcançado por candidatura, inferido dos registros (triagem, ficha, teste). */
  nivelExtra: Map<string, number>;
  ini: Date;
  fim: Date;
  manual: Manual;
  metas: Metas;
}): Resultado {
  const metas = { ...METAS_PADRAO, ...Object.fromEntries(Object.entries(p.metas).filter(([, v]) => v !== null && v !== undefined)) } as Required<Metas>;

  // Vagas fechadas no período (a data de fechamento é a última atualização).
  const fechadas = p.vagas.filter((v) => ["preenchida", "encerrada"].includes(v.status) && noPeriodo(v.updated_at, p.ini, p.fim));
  const dias = fechadas
    .map((v) => (new Date(v.updated_at).getTime() - new Date(v.publicada_em ?? v.created_at).getTime()) / 86_400_000)
    .filter((d) => d >= 0);
  const tempoMedio = dias.length > 0 ? Math.round((dias.reduce((s, d) => s + d, 0) / dias.length) * 10) / 10 : null;

  // Contratações do período.
  const contratadas = p.candidaturas.filter((c) => c.status === "contratado" && noPeriodo(c.updated_at, p.ini, p.fim));
  const contratacoes = contratadas.length;

  // Funil: coorte de candidaturas criadas no período.
  const coorte = p.candidaturas.filter((c) => noPeriodo(c.created_at, p.ini, p.fim));
  const alcance = coorte.map((c) => Math.max(nivelDoStatus(c.status), p.nivelExtra.get(c.id) ?? 0));
  const funil: LinhaFunil[] = ETAPAS.map((etapa, i) => {
    const quantidade = alcance.filter((n) => n >= i).length;
    return { etapa, rotulo: ROTULO_ETAPA[etapa], quantidade, conversao: null };
  });
  for (let i = 1; i < funil.length; i++) {
    const base = funil[i - 1].quantidade;
    funil[i].conversao = base > 0 ? Math.round((funil[i].quantidade / base) * 100) : null;
  }
  let gargalo: string | null = null;
  const comBase = funil.slice(1).filter((l) => l.conversao !== null && funil[funil.indexOf(l) - 1].quantidade >= 3);
  if (comBase.length > 0) {
    const pior = comBase.reduce((a, b) => ((a.conversao as number) <= (b.conversao as number) ? a : b));
    const anterior = funil[funil.indexOf(pior) - 1];
    gargalo = `${anterior.rotulo} → ${pior.rotulo}: ${pior.conversao}% passam (${pior.quantidade} de ${anterior.quantidade}).`;
  }

  // Fontes: origem da candidatura.
  const rotuloFonte = (o: string | null) => (o && o.startsWith("divulgacao_") ? o.replace("divulgacao_", "") : o === "app_candidato" || !o ? "app (sem marcador)" : o);
  const mapa = new Map<string, { c: number; h: number }>();
  for (const c of coorte) {
    const k = rotuloFonte(c.origem);
    mapa.set(k, { c: (mapa.get(k)?.c ?? 0) + 1, h: mapa.get(k)?.h ?? 0 });
  }
  for (const c of contratadas) {
    const k = rotuloFonte(c.origem);
    mapa.set(k, { c: mapa.get(k)?.c ?? 0, h: (mapa.get(k)?.h ?? 0) + 1 });
  }
  const totalHires = contratacoes;
  const fontes: LinhaFonte[] = [...mapa.entries()]
    .map(([fonte, v]) => ({
      fonte,
      candidaturas: v.c,
      contratacoes: v.h,
      participacao: totalHires > 0 ? Math.round((v.h / totalHires) * 100) : null,
    }))
    .sort((a, b) => b.contratacoes - a.contratacoes || b.candidaturas - a.candidaturas);
  const principal = fontes.find((f) => f.contratacoes > 0);
  const principalFonte = principal ? `${principal.fonte} (${principal.participacao}% das contratações)` : null;

  // Entradas manuais e derivados.
  const custoTotal = num(p.manual.custo_total);
  const custoPorContratacao = custoTotal !== null && contratacoes > 0 ? Math.round((custoTotal / contratacoes) * 100) / 100 : null;
  const env = num(p.manual.ofertas_enviadas);
  const ace = num(p.manual.ofertas_aceitas);
  const aceitacao = env !== null && env > 0 && ace !== null ? Math.round((ace / env) * 100) : null;
  const nps = num(p.manual.nps);
  const turnover = num(p.manual.turnover_precoce_pct);
  const sla = num(p.manual.sla_pct);

  const ind = (
    id: string,
    nome: string,
    valor: number | null,
    unidade: string,
    meta: number | null,
    direcao: "menor" | "maior",
    origem: "banco" | "manual",
    nota = "",
  ): Indicador => ({ id, nome, valor, unidade, meta, direcao, status: statusDe(valor, meta, direcao), origem, nota });

  const indicadores: Indicador[] = [
    ind("tempo", "Tempo médio de fechamento", tempoMedio, "dias", metas.tempo_fechamento_dias, "menor", "banco", `${fechadas.length} vaga(s) fechada(s)`),
    ind("sla", "SLA (vagas dentro do prazo)", sla, "%", metas.sla_pct, "maior", "manual"),
    ind("custo", "Custo por contratação", custoPorContratacao, "R$", (metas.custo_max ?? 0) > 0 ? metas.custo_max : null, "menor", "manual", `${contratacoes} contratação(ões) no mês`),
    ind("aceitacao", "Aceitação de oferta", aceitacao, "%", metas.aceitacao_pct, "maior", "manual"),
    ind("turnover", "Turnover precoce", turnover, "%", metas.turnover_max_pct, "menor", "manual"),
    ind("nps", "NPS do processo", nps, "pontos", metas.nps_min, "maior", "manual"),
  ];

  const faltando = indicadores.filter((i) => i.status === "sem_dado").map((i) => i.nome);

  // Leitura em conjunto: pares conhecidos.
  const por = (id: string) => indicadores.find((i) => i.id === id)!;
  const leituras: string[] = [];
  if (por("tempo").status === "verde" && por("turnover").status === "abaixo") {
    leituras.push("Fechamento rápido com turnover precoce alto: a velocidade pode estar custando qualidade de seleção.");
  }
  if (por("custo").status === "verde" && por("nps").status === "abaixo") {
    leituras.push("Custo baixo com NPS baixo: a economia pode estar piorando a experiência do candidato.");
  }
  if (por("aceitacao").status === "abaixo" && por("tempo").status === "abaixo") {
    leituras.push("Aceitação de oferta e tempo de fechamento abaixo da meta: o processo longo pode estar perdendo candidatos.");
  }
  if (gargalo) leituras.push(`Maior gargalo do funil: ${gargalo}`);

  return { indicadores, funil, gargalo, fontes, principalFonte, leituras, faltando, contratacoes, vagasFechadas: fechadas.length };
}

// ---------------------------------------------------------------------------
// Plano de ação (§14.8 e §14.19)
// ---------------------------------------------------------------------------

export const LIMITE_PLANOS_ABERTOS = 3;
export const ESTADOS_PLANO = ["aberta", "em_andamento", "concluida", "cancelada"] as const;
export type EstadoPlano = (typeof ESTADOS_PLANO)[number];

export function estadoPlanoValido(v: unknown): v is EstadoPlano {
  return typeof v === "string" && (ESTADOS_PLANO as readonly string[]).includes(v);
}

export function validarPlano(p: { indicador: string; acao: string; responsavel: string; prazo: string }, abertos: number): string[] {
  const out: string[] = [];
  if (p.indicador.trim().length < 2) out.push("Escolha o indicador.");
  if (p.acao.trim().length < 10) out.push("Descreva a ação (concreta e mensurável).");
  if (p.responsavel.trim().length < 2) out.push("Informe o responsável.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.prazo)) out.push("Informe o prazo.");
  if (abertos >= LIMITE_PLANOS_ABERTOS) {
    out.push(`Já há ${LIMITE_PLANOS_ABERTOS} ações abertas neste período: conclua ou cancele uma antes.`);
  }
  return out;
}

export function metasDeFormulario(f: Record<string, string>): Metas {
  const n = (k: string): number | null => {
    const v = Number(String(f[k] ?? "").replace(",", "."));
    return String(f[k] ?? "").trim() !== "" && Number.isFinite(v) && v >= 0 ? v : null;
  };
  return {
    tempo_fechamento_dias: n("tempo_fechamento_dias"),
    sla_pct: n("sla_pct"),
    custo_max: n("custo_max"),
    aceitacao_pct: n("aceitacao_pct"),
    turnover_max_pct: n("turnover_max_pct"),
    nps_min: n("nps_min"),
  };
}

export function manualDeFormulario(f: Record<string, string>): Manual {
  const n = (k: string, min: number, max: number): number | null => {
    const raw = String(f[k] ?? "").trim();
    if (raw === "") return null;
    const v = Number(raw.replace(",", "."));
    return Number.isFinite(v) && v >= min && v <= max ? v : null;
  };
  return {
    custo_total: n("custo_total", 0, 100_000_000),
    nps: n("nps", -100, 100),
    turnover_precoce_pct: n("turnover_precoce_pct", 0, 100),
    sla_pct: n("sla_pct", 0, 100),
    ofertas_enviadas: n("ofertas_enviadas", 0, 100_000),
    ofertas_aceitas: n("ofertas_aceitas", 0, 100_000),
  };
}
