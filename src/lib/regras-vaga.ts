/**
 * Regras da IA por vaga (modo de entrevista, cortes, perguntas, gatilhos).
 * Puro: sem banco nem rede. Spec: docs/specs/AVALIACAO_IA_GANCHOS.md §3B.
 *
 * Precedência: guardrails globais > regras da vaga > padrão da empresa > padrão do sistema.
 * A regra da vaga nunca relaxa um guardrail: texto livre passa pelo filtro de
 * termos discriminatórios e pelos termos que contrariam a validação humana.
 */
import { termosDiscriminatorios, type Senioridade, type Verificacao } from "./vaga-estruturada";

export const MODOS = ["texto", "voz", "humano"] as const;
export type ModoEntrevista = (typeof MODOS)[number];

export const ROTULO_MODO_ENTREVISTA: Record<ModoEntrevista, string> = {
  texto: "IA entrevista por texto (WhatsApp/chat)",
  voz: "IA entrevista por voz (chefia e liderança)",
  humano: "Entrevista com pessoa (IA só faz a triagem)",
};

/** A voz só liga depois do texto provado, do parecer jurídico e do teste de custo. */
export const VOZ_LIBERADA = false;

export type RegrasIA = {
  /** Sobe a cada confirmação; fica gravada em cada avaliação. */
  versao: number;
  modo: ModoEntrevista;
  /** Nota mínima (0–100) para seguir da triagem. `null` = não definida. */
  corte_triagem: number | null;
  corte_entrevista: number | null;
  /** Pesos relativos (1–5) das dimensões. */
  peso_cultura: number;
  peso_competencias: number;
  peso_comportamento: number;
  perguntas_obrigatorias: string[];
  perguntas_proibidas: string[];
  pode_informar: string[];
  deve_confirmar_com_equipe: string[];
  /** Situações em que a IA chama uma pessoa. Obrigatório. */
  gatilhos_escalada: string[];
  tom: string;
  /** "HH:MM" ou vazio. */
  horario_inicio: string;
  horario_fim: string;
  max_tentativas: number | null;
  instrucoes: string;
  confirmado_em: string | null;
};

export function regrasVazias(): RegrasIA {
  return {
    versao: 0,
    modo: "texto",
    corte_triagem: null,
    corte_entrevista: null,
    peso_cultura: 1,
    peso_competencias: 1,
    peso_comportamento: 1,
    perguntas_obrigatorias: [],
    perguntas_proibidas: [],
    pode_informar: [],
    deve_confirmar_com_equipe: [],
    gatilhos_escalada: [],
    tom: "",
    horario_inicio: "",
    horario_fim: "",
    max_tentativas: null,
    instrucoes: "",
    confirmado_em: null,
  };
}

const lista = (v: unknown, max = 20, tam = 300): string[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().slice(0, tam))
        .filter(Boolean)
        .slice(0, max)
    : [];

const inteiro = (v: unknown, min: number, max: number): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
};

const hora = (v: unknown): string => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim()) ? v.trim() : "");

/** Lê o JSON do banco (ou de um formulário) sem confiar nele. */
export function normalizarRegras(raw: unknown): RegrasIA {
  const base = regrasVazias();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  const modo = MODOS.includes(r.modo as ModoEntrevista) ? (r.modo as ModoEntrevista) : base.modo;
  return {
    versao: inteiro(r.versao, 0, 100000) ?? 0,
    modo,
    corte_triagem: inteiro(r.corte_triagem, 0, 100),
    corte_entrevista: inteiro(r.corte_entrevista, 0, 100),
    peso_cultura: inteiro(r.peso_cultura, 1, 5) ?? 1,
    peso_competencias: inteiro(r.peso_competencias, 1, 5) ?? 1,
    peso_comportamento: inteiro(r.peso_comportamento, 1, 5) ?? 1,
    perguntas_obrigatorias: lista(r.perguntas_obrigatorias),
    perguntas_proibidas: lista(r.perguntas_proibidas),
    pode_informar: lista(r.pode_informar),
    deve_confirmar_com_equipe: lista(r.deve_confirmar_com_equipe),
    gatilhos_escalada: lista(r.gatilhos_escalada),
    tom: typeof r.tom === "string" ? r.tom.trim().slice(0, 200) : "",
    horario_inicio: hora(r.horario_inicio),
    horario_fim: hora(r.horario_fim),
    max_tentativas: inteiro(r.max_tentativas, 1, 10),
    instrucoes: typeof r.instrucoes === "string" ? r.instrucoes.trim().slice(0, 2000) : "",
    confirmado_em: typeof r.confirmado_em === "string" ? r.confirmado_em : null,
  };
}

/** Sugestão de modo: chefia e liderança sugerem voz; é só dica, a vaga escolhe. */
export function sugerirModo(p: { senioridade: Senioridade; gerenciaPessoas?: boolean }): ModoEntrevista {
  return p.senioridade === "lideranca" || p.gerenciaPessoas ? "voz" : "texto";
}

/** Frases que tentam derrubar um guardrail global. */
const CONTRARIA_GUARDRAIL: { re: RegExp; rotulo: string }[] = [
  { re: /\b(reprov\w*|elimin\w*|descart\w*|barr\w*)\b[^.\n]{0,60}\b(automatic\w*|sem (validacao|revisao|aprovacao)|direto|na hora)\b/, rotulo: "reprovar sem validação humana" },
  { re: /\b(sem|dispens\w*|ignor\w*|pul\w*|evit\w*)\s+(a |de |por |pela |uma )?(validacao|revisao|aprovacao|checagem)\b/, rotulo: "dispensar validação humana" },
  { re: /\b(avali\w*|analis\w*|detect\w*|infer\w*)\b[^.\n]{0,40}\b(emocao|emocoes|emocional|estado emocional|mentira|fraude)\b/, rotulo: "avaliação emocional ou detecção de fraude" },
  { re: /\b(avis\w*|respond\w*|inform\w*|comunic\w*)\b[^.\n]{0,40}\b(reprov\w*|eliminad\w*)\b[^.\n]{0,40}\b(candidat\w*)\b/, rotulo: "avisar o candidato da reprovação antes da validação" },
  { re: /\b(avis\w*|respond\w*|inform\w*|comunic\w*)\b[^.\n]{0,40}\b(candidat\w*)\b[^.\n]{0,40}\b(reprov\w*|eliminad\w*|nao (segue|passou))\b/, rotulo: "avisar o candidato da reprovação antes da validação" },
];

/**
 * Perguntas de entrevista sobre atributo protegido (Lei 9.029/95 e LGPD, art. 11).
 * Mais rígido que o filtro de anúncio: aqui a IA é quem perguntaria ao candidato.
 */
const ATRIBUTO_PROTEGIDO_EM_PERGUNTA: { re: RegExp; rotulo: string }[] = [
  { re: /casad[oa]|solteir[oa]|estado civil|uniao estavel|conjuge|namorad[oa]/, rotulo: "estado civil" },
  { re: /\bfilhos?\b|gravid[ae]z?|gestante|engravid\w*|maternidade/, rotulo: "filhos ou gravidez" },
  { re: /religia\w*|igreja|\bcredo\b/, rotulo: "religião" },
  { re: /\braca\b|cor da pele|etnia|orientacao sexual|identidade de genero|\bgay\b|\blgbt\w*/, rotulo: "raça, orientação ou gênero" },
  { re: /quantos anos|qual (a )?(sua )?idade|data de nascimento|\bidade\b/, rotulo: "idade" },
  { re: /partido|politic[ao]s?|sindicat\w*|filiad[oa]/, rotulo: "opinião política ou sindical" },
  { re: /doenca|problema de saude|deficienc\w*|tratamento medico|medicacao/, rotulo: "saúde ou deficiência" },
];

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export type ContextoRegras = {
  temObrigatorios: boolean;
  /** Vaga sigilosa: a IA não pode revelar a empresa nem dados que a identifiquem. */
  confidencial?: boolean;
};

/** Informações que identificam a empresa; proibidas nas regras de vaga sigilosa. */
const IDENTIFICA_EMPRESA = /(nome (da|do) (empresa|cliente)|razao social|cnpj|nome fantasia|endereco da empresa|site da empresa|a propria empresa|empresa contratante)/;

export function verificarRegras(r: RegrasIA, ctx: ContextoRegras = { temObrigatorios: true }): Verificacao[] {
  const out: Verificacao[] = [];
  const texto = [
    r.instrucoes,
    r.tom,
    ...r.perguntas_obrigatorias,
    ...r.pode_informar,
    ...r.deve_confirmar_com_equipe,
    ...r.gatilhos_escalada,
  ].join("\n");

  const disc = termosDiscriminatorios(texto);
  const contraria = CONTRARIA_GUARDRAIL.filter((g) => g.re.test(semAcento(texto))).map((g) => g.rotulo);
  if (disc.length > 0) {
    out.push({ id: "discriminatorio", nivel: "bloqueio", mensagem: `As regras mencionam critério que discrimina: ${[...new Set(disc)].join(", ")}. Remova.` });
  } else {
    out.push({ id: "discriminatorio", nivel: "ok", mensagem: "Sem critério discriminatório nas regras." });
  }
  if (contraria.length > 0) {
    out.push({ id: "guardrail", nivel: "bloqueio", mensagem: `As regras contrariam uma regra inegociável: ${[...new Set(contraria)].join("; ")}.` });
  } else {
    out.push({ id: "guardrail", nivel: "ok", mensagem: "Nenhuma regra contraria os guardrails globais." });
  }

  // Perguntas obrigatórias não podem pedir dado de atributo protegido.
  const perguntasTexto = r.perguntas_obrigatorias.join("\n");
  const perguntasDisc = [
    ...termosDiscriminatorios(perguntasTexto),
    ...ATRIBUTO_PROTEGIDO_EM_PERGUNTA.filter((a) => a.re.test(semAcento(perguntasTexto))).map((a) => a.rotulo),
  ];
  if (perguntasDisc.length > 0) {
    out.push({
      id: "perguntas",
      nivel: "bloqueio",
      mensagem: `Pergunta obrigatória sobre atributo protegido: ${[...new Set(perguntasDisc)].join(", ")}. A IA não pode perguntar isso.`,
    });
  }

  if (ctx.confidencial) {
    const identifica = r.pode_informar.filter((x) => IDENTIFICA_EMPRESA.test(semAcento(x)));
    if (identifica.length > 0) {
      out.push({ id: "sigilo", nivel: "bloqueio", mensagem: "Vaga sigilosa: a IA não pode informar a empresa. Retire de 'pode informar': " + identifica.join("; ") });
    } else {
      out.push({ id: "sigilo", nivel: "ok", mensagem: "Vaga sigilosa: a IA se apresenta como assistente de seleção, sem citar a empresa." });
    }
  }
  if (r.modo === "voz" && !VOZ_LIBERADA) {
    out.push({ id: "voz", nivel: "aviso", mensagem: "A voz ainda não foi liberada: enquanto isso, esta vaga segue para entrevista com pessoa." });
  }
  if (r.corte_triagem === null) {
    out.push({ id: "corte", nivel: "aviso", mensagem: "Defina a nota de corte da triagem (0 a 100). Sem ela a IA não conduz a vaga." });
  }
  if (r.gatilhos_escalada.length === 0) {
    out.push({ id: "gatilhos", nivel: "aviso", mensagem: "Informe quando a IA deve chamar uma pessoa (ex.: salário fora da faixa, reclamação). Sem isso a IA não conduz a vaga." });
  }
  if (!ctx.temObrigatorios) {
    out.push({ id: "criterios", nivel: "aviso", mensagem: "A vaga não tem requisitos obrigatórios: a IA não tem o que avaliar." });
  }
  if (r.horario_inicio && r.horario_fim && r.horario_inicio >= r.horario_fim) {
    out.push({ id: "horario", nivel: "aviso", mensagem: "O horário de contato termina antes de começar." });
  }
  if (!r.confirmado_em) {
    out.push({ id: "confirmacao", nivel: "aviso", mensagem: "Regras ainda não confirmadas por uma pessoa." });
  }
  return out;
}

export type ModoEfetivo = { modo: ModoEntrevista; conduzPelaIA: boolean; motivo: string | null };

/**
 * Quem conduz a vaga de fato. Sem regras mínimas, confirmadas e sem bloqueio,
 * a IA não conduz: segue para entrevista com pessoa. Nada de adivinhar.
 */
export function modoEfetivo(r: RegrasIA, ctx: ContextoRegras = { temObrigatorios: true }): ModoEfetivo {
  const vs = verificarRegras(r, ctx);
  if (vs.some((v) => v.nivel === "bloqueio")) return { modo: "humano", conduzPelaIA: false, motivo: "As regras têm item que bloqueia." };
  if (!r.confirmado_em) return { modo: "humano", conduzPelaIA: false, motivo: "Regras da IA ainda não confirmadas." };
  if (r.corte_triagem === null) return { modo: "humano", conduzPelaIA: false, motivo: "Falta a nota de corte da triagem." };
  if (r.gatilhos_escalada.length === 0) return { modo: "humano", conduzPelaIA: false, motivo: "Faltam os gatilhos para chamar uma pessoa." };
  if (!ctx.temObrigatorios) return { modo: "humano", conduzPelaIA: false, motivo: "A vaga não tem requisitos obrigatórios." };
  if (r.modo === "humano") return { modo: "humano", conduzPelaIA: false, motivo: "Vaga marcada para entrevista com pessoa." };
  if (r.modo === "voz" && !VOZ_LIBERADA) return { modo: "humano", conduzPelaIA: false, motivo: "A voz ainda não foi liberada." };
  return { modo: r.modo, conduzPelaIA: true, motivo: null };
}

/** Lê o formulário de regras. Versão sobe a cada confirmação. */
export function regrasDoFormulario(f: (k: string) => string, versaoAtual: number, agora = new Date()): RegrasIA {
  const linhas = (k: string) => f(k).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  return normalizarRegras({
    versao: versaoAtual + 1,
    modo: f("modo"),
    corte_triagem: f("corte_triagem"),
    corte_entrevista: f("corte_entrevista"),
    peso_cultura: f("peso_cultura"),
    peso_competencias: f("peso_competencias"),
    peso_comportamento: f("peso_comportamento"),
    perguntas_obrigatorias: linhas("perguntas_obrigatorias"),
    perguntas_proibidas: linhas("perguntas_proibidas"),
    pode_informar: linhas("pode_informar"),
    deve_confirmar_com_equipe: linhas("deve_confirmar_com_equipe"),
    gatilhos_escalada: linhas("gatilhos_escalada"),
    tom: f("tom"),
    horario_inicio: f("horario_inicio"),
    horario_fim: f("horario_fim"),
    max_tentativas: f("max_tentativas"),
    instrucoes: f("instrucoes"),
    confirmado_em: agora.toISOString(),
  });
}
