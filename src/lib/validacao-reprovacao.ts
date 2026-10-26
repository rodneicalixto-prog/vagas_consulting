/**
 * Fila de validação humana de reprovação. Puro: sem banco nem rede.
 * Spec: docs/specs/AVALIACAO_IA_GANCHOS.md §3A.
 *
 * Regras: a IA nunca responde ao candidato sobre reprovação; o caso espera a
 * decisão de uma pessoa (confirmar, reverter, pedir dados) em até 72 horas.
 */
import type { ResultadoTriagem } from "./triagem";

export const PRAZO_HORAS = 72;
/** Faltando menos que isto para o prazo, o caso aparece como "vence em breve". */
export const AVISO_HORAS = 12;

export type EtapaValidacao = "triagem" | "entrevista_ia" | "competencias";
export type StatusValidacao = "aguardando" | "confirmada" | "revertida" | "aguardando_dados";
export type DecisaoValidacao = "confirmar" | "reverter" | "pedir_dados";
export type Confianca = "alta" | "media" | "baixa";

export const ROTULO_ETAPA: Record<EtapaValidacao, string> = {
  triagem: "Triagem de currículo",
  entrevista_ia: "Entrevista pela IA",
  competencias: "Avaliação de competências",
};

export const ROTULO_STATUS_VALIDACAO: Record<StatusValidacao, string> = {
  aguardando: "Aguardando sua decisão",
  confirmada: "Reprovação confirmada",
  revertida: "Revertida",
  aguardando_dados: "Aguardando dados do candidato",
};

/** Texto único permitido ao candidato enquanto o caso espera a pessoa. Nunca insinua resultado. */
export const MENSAGEM_NEUTRA = "Seu processo segue em análise. Assim que houver novidade, avisamos você.";

export type MotivoReprovacao = {
  criterio: string;
  eliminatorio: boolean;
  evidencia: string;
  /** Nota por dimensão (0–100), `null` = não avaliada. */
  notas: Record<string, number | null>;
  confianca: Confianca;
  o_que_mudaria: string;
  analise: string;
  /** A IA não entregou o que a pessoa precisa para decidir bem: o caso entra marcado. */
  justificativa_incompleta: boolean;
  /** Hash dos critérios usados; evita reabrir um caso já revertido com os mesmos critérios. */
  criterios_hash: string | null;
};

/**
 * Monta o motivo a partir do resultado da triagem. Devolve `null` se a IA não
 * eliminou ninguém. Nunca devolve um motivo vazio: o que faltar vira
 * `justificativa_incompleta`, e o caso entra na fila marcado em vez de sumir.
 */
export function motivoDaTriagem(r: ResultadoTriagem, criteriosHash: string | null = null): MotivoReprovacao | null {
  if (!r.eliminado) return null;
  const falhos = r.obrigatorios.filter((o) => o.eliminatorio && o.estado === "nao_atende");
  const principal = falhos[0];
  const evidencia = (principal?.evidencia ?? "").trim();
  const criterio = principal?.criterio ?? r.motivo_eliminacao ?? "";
  const incompleta = !principal || evidencia.length === 0;
  const atendidos = r.obrigatorios.filter((o) => o.estado === "atende").length;

  return {
    criterio: criterio || "Critério não informado pela IA",
    eliminatorio: true,
    evidencia,
    notas: { pontuacao_triagem: r.pontuacao },
    // Evidência clara de requisito eliminatório não atendido é o caso de maior certeza.
    confianca: incompleta ? "baixa" : falhos.length > 1 ? "alta" : "media",
    o_que_mudaria: principal
      ? `Se o candidato comprovar "${principal.criterio}", o motivo cai e ele volta ao processo.`
      : "Sem critério identificado: revise o currículo antes de decidir.",
    analise:
      `${falhos.length} requisito(s) eliminatório(s) não atendido(s); ` +
      `${atendidos} de ${r.obrigatorios.length} obrigatórios atendidos; pontuação ${r.pontuacao}.` +
      (r.a_validar.length ? ` A validar: ${r.a_validar.join("; ")}.` : ""),
    justificativa_incompleta: incompleta,
    criterios_hash: criteriosHash,
  };
}

export function calcularPrazo(de: Date = new Date()): Date {
  return new Date(de.getTime() + PRAZO_HORAS * 3600 * 1000);
}

export type SituacaoPrazo = "no_prazo" | "vence_em_breve" | "vencido";

export function situacaoPrazo(prazoEm: Date | string, agora: Date = new Date()): SituacaoPrazo {
  const ms = new Date(prazoEm).getTime() - agora.getTime();
  if (ms <= 0) return "vencido";
  return ms <= AVISO_HORAS * 3600 * 1000 ? "vence_em_breve" : "no_prazo";
}

/** Horas que faltam (negativo = vencido há tantas horas), arredondado para baixo. */
export function horasRestantes(prazoEm: Date | string, agora: Date = new Date()): number {
  return Math.floor((new Date(prazoEm).getTime() - agora.getTime()) / 3600000);
}

export function decisaoValida(v: unknown): v is DecisaoValidacao {
  return v === "confirmar" || v === "reverter" || v === "pedir_dados";
}

const ESTADOS_ATIVOS: StatusValidacao[] = ["aguardando", "aguardando_dados"];

export function estaAtiva(s: StatusValidacao): boolean {
  return ESTADOS_ATIVOS.includes(s);
}

export type ResultadoDecisao =
  | { ok: true; novoStatus: StatusValidacao }
  | { ok: false; erro: string };

/** Transição de estado. Só casos ativos aceitam decisão. */
export function decidir(atual: StatusValidacao, decisao: DecisaoValidacao): ResultadoDecisao {
  if (!estaAtiva(atual)) return { ok: false, erro: "Este caso já foi decidido." };
  switch (decisao) {
    case "confirmar":
      return { ok: true, novoStatus: "confirmada" };
    case "reverter":
      return { ok: true, novoStatus: "revertida" };
    case "pedir_dados":
      return atual === "aguardando_dados"
        ? { ok: false, erro: "Os dados já foram pedidos ao candidato." }
        : { ok: true, novoStatus: "aguardando_dados" };
  }
}

/** O que a IA faz sozinha depois da decisão da pessoa ("devolve a missão à IA"). */
export type ContinuacaoIA = {
  statusCandidatura: "rejeitada" | null;
  /** `true` = a IA prepara a devolutiva (envio automático chega na etapa 1E). */
  prepararDevolutiva: boolean;
  /** `true` = a IA retoma o processo desta candidatura. */
  retomarProcesso: boolean;
  /** `true` = a IA pergunta ao candidato o dado que falta. */
  perguntarAoCandidato: boolean;
  descricao: string;
};

export function continuacaoDaDecisao(d: DecisaoValidacao): ContinuacaoIA {
  switch (d) {
    case "confirmar":
      return {
        statusCandidatura: "rejeitada",
        prepararDevolutiva: true,
        retomarProcesso: false,
        perguntarAoCandidato: false,
        descricao: "Reprovação confirmada: a IA prepara a devolutiva com modelo aprovado e encerra.",
      };
    case "reverter":
      return {
        statusCandidatura: null,
        prepararDevolutiva: false,
        retomarProcesso: true,
        perguntarAoCandidato: false,
        descricao: "Revertida: o candidato volta ao processo e a IA continua de onde parou.",
      };
    case "pedir_dados":
      return {
        statusCandidatura: null,
        prepararDevolutiva: false,
        retomarProcesso: false,
        perguntarAoCandidato: true,
        descricao: "A IA pergunta ao candidato o dado que falta e reavalia.",
      };
  }
}

export type LinhaFila = {
  status: StatusValidacao;
  prazo_em: string;
  motivo: Pick<MotivoReprovacao, "eliminatorio" | "justificativa_incompleta" | "confianca">;
};

/** Ordem da fila: vencidos primeiro, depois eliminatórios objetivos (despacho em lote), depois prazo. */
export function ordenarFila<T extends LinhaFila>(linhas: T[], agora: Date = new Date()): T[] {
  const peso = (l: T) => {
    const sit = situacaoPrazo(l.prazo_em, agora);
    return sit === "vencido" ? 0 : sit === "vence_em_breve" ? 1 : 2;
  };
  return [...linhas].sort((a, b) => {
    if (peso(a) !== peso(b)) return peso(a) - peso(b);
    // Casos com justificativa completa e evidência clara saem mais rápido: ficam antes.
    if (a.motivo.justificativa_incompleta !== b.motivo.justificativa_incompleta) return a.motivo.justificativa_incompleta ? 1 : -1;
    return new Date(a.prazo_em).getTime() - new Date(b.prazo_em).getTime();
  });
}
