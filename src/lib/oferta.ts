/**
 * Carta-oferta (passo 3P): montada no código a partir do que a pessoa
 * informou. Nada inventado: o que falta vira placeholder visível.
 * Puro: sem banco nem rede. Spec: docs/specs/AGENTE_IA_FASE3.md (3P).
 */
import { termosDiscriminatorios, type Verificacao } from "./vaga-estruturada";

export type Regime = "CLT" | "PJ" | "Estágio" | "Temporário";
export const REGIMES: Regime[] = ["CLT", "PJ", "Estágio", "Temporário"];
export type ModeloTrabalho = "presencial" | "hibrido" | "remoto";
export const ROTULO_MODELO: Record<ModeloTrabalho, string> = {
  presencial: "Presencial",
  hibrido: "Híbrido",
  remoto: "Remoto",
};

export type DadosOferta = {
  empresa: string;
  assinante_nome: string;
  assinante_cargo: string;
  contato: string;
  candidato: string;
  cargo: string;
  reporta_a: string;
  regime: string;
  salario: string;
  forma_pagamento: string;
  variavel: string;
  beneficios: string[];
  modelo: string;
  local: string;
  jornada: string;
  data_inicio: string;
  experiencia: string;
  condicoes: string;
  validade: string;
  proximos_passos: string;
  extras: string[];
  tom: "formal" | "descontraido";
  cidade_carta: string;
};

export function dadosVazios(): DadosOferta {
  return {
    empresa: "", assinante_nome: "", assinante_cargo: "", contato: "", candidato: "", cargo: "", reporta_a: "",
    regime: "", salario: "", forma_pagamento: "", variavel: "", beneficios: [], modelo: "", local: "", jornada: "",
    data_inicio: "", experiencia: "", condicoes: "", validade: "", proximos_passos: "", extras: [],
    tom: "formal", cidade_carta: "",
  };
}

/** Regime sugerido pela modalidade da vaga; a pessoa confirma. */
export function regimeSugerido(modalidade: string | null | undefined): Regime | "" {
  if (modalidade === "efetiva") return "CLT";
  if (modalidade === "pj") return "PJ";
  if (modalidade === "temporaria") return "Temporário";
  return "";
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

/** "4500" ou "4.500,00" viram "R$ 4.500,00"; texto livre fica como digitado. */
export function formatarSalario(bruto: string): string {
  const t = bruto.trim();
  if (!t) return "";
  const limpo = t.replace(/^R\$\s*/i, "").trim();
  if (!/^[\d.,\s]+$/.test(limpo)) return t;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo.replace(/\s/g, "");
  const n = Number(normal);
  if (!Number.isFinite(n) || n <= 0) return t;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** ISO (AAAA-MM-DD) para dd/mm/aaaa; outro formato fica como veio. */
export function dataBr(v: string): string {
  const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v.trim();
}

export function linhas(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

const PH = (nome: string) => `{${nome}}`;
const ou = (v: string, nome: string) => (v.trim() ? v.trim() : PH(nome));

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

export function montarCarta(d: DadosOferta, hoje = new Date()): string {
  const data = hoje.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const cidade = ou(d.cidade_carta, "CIDADE");
  const nome = ou(d.candidato, "NOME DO CANDIDATO");
  const empresa = ou(d.empresa, "EMPRESA");
  const abre =
    d.tom === "descontraido"
      ? `Oi, ${nome}! Foi uma alegria ter você no nosso processo. Temos o prazer de apresentar nossa proposta para você fazer parte da ${empresa}.`
      : `Olá, ${nome}. Foi uma alegria ter você no nosso processo. Temos o prazer de apresentar nossa proposta para você fazer parte da ${empresa}.`;

  const salario = d.salario.trim()
    ? `${formatarSalario(d.salario)} bruto mensal${d.forma_pagamento.trim() ? `, pago ${d.forma_pagamento.trim()}` : `, pago ${PH("FORMA/DATA DE PAGAMENTO")}`}`
    : PH("SALÁRIO BRUTO");

  const detalhes: string[] = [
    `- Cargo: ${ou(d.cargo, "CARGO")}${d.reporta_a.trim() ? `, reportando a ${d.reporta_a.trim()}` : ""}`,
    `- Regime de contratação: ${ou(d.regime, "REGIME")}`,
    `- Salário: ${salario}`,
  ];
  if (d.variavel.trim()) {
    detalhes.push(
      `- Remuneração variável: ${d.variavel.trim()} (a parte variável depende das regras e metas descritas, e não integra o salário fixo acima)`,
    );
  }
  detalhes.push(
    d.beneficios.length > 0 ? `- Benefícios: ${d.beneficios.join("; ")}` : `- Benefícios: ${PH("BENEFÍCIOS")}`,
    `- Modelo de trabalho: ${d.modelo.trim() ? `${d.modelo.trim()}${d.local.trim() ? ` — ${d.local.trim()}` : ""}` : PH("MODELO E LOCAL")}`,
    `- Jornada/horário: ${ou(d.jornada, "JORNADA")}`,
    `- Data de início prevista: ${d.data_inicio.trim() ? dataBr(d.data_inicio) : PH("DATA DE INÍCIO")}`,
  );
  if (d.regime.trim().toUpperCase() === "CLT" || d.experiencia.trim()) {
    detalhes.push(`- Período de experiência: ${ou(d.experiencia, "PERÍODO DE EXPERIÊNCIA")}`);
  }
  for (const e of d.extras) detalhes.push(`- ${e}`);

  const condicoes = d.condicoes.trim()
    ? `Esta proposta está condicionada a: ${d.condicoes.trim()}.`
    : `Esta proposta está condicionada a ${PH("CONDIÇÕES (documentos, exame admissional etc.)")}.`;
  const validade = d.validade.trim()
    ? `A proposta é válida até ${dataBr(d.validade)}. Após esse prazo, poderá ser revista.`
    : `A proposta é válida até ${PH("DATA DE VALIDADE")}. Após esse prazo, poderá ser revista.`;

  const assinatura = [ou(d.assinante_nome, "QUEM ASSINA"), ou(d.assinante_cargo, "CARGO DE QUEM ASSINA"), empresa].join(" — ");

  return [
    "CARTA-OFERTA",
    "",
    `${cidade}, ${data}`,
    "",
    `Para: ${nome}`,
    "",
    abre,
    "",
    "Detalhes da proposta",
    ...detalhes,
    "",
    "Condições e validade",
    `- ${condicoes}`,
    `- ${validade}`,
    "",
    "Próximos passos",
    ou(d.proximos_passos, "PRÓXIMOS PASSOS (o que fazer para aceitar, a quem responder, documentos a enviar)"),
    "",
    "Ficamos felizes com a possibilidade de ter você no time e à disposição para qualquer dúvida.",
    "",
    assinatura,
    ou(d.contato, "CONTATO"),
    "",
    "Aceite",
    "( ) Li e aceito os termos desta proposta.",
    "Nome: ____________________  Data: ____/____/____  Assinatura: __________",
    "",
    "Documento confidencial, com dados pessoais e valores: use apenas para a finalidade desta proposta (LGPD).",
  ].join("\n");
}

/** Mensagem curta para comunicar a aprovação e anexar a carta. */
export function versaoCurta(d: DadosOferta): string {
  const nome = ou(d.candidato, "NOME DO CANDIDATO");
  const empresa = ou(d.empresa, "EMPRESA");
  const cargo = ou(d.cargo, "CARGO");
  const validade = d.validade.trim() ? dataBr(d.validade) : PH("DATA DE VALIDADE");
  const saud = d.tom === "descontraido" ? `Oi, ${nome}!` : `Olá, ${nome},`;
  return [
    `${saud} foi ótimo ter você no processo. Segue em anexo a carta-oferta para a vaga de ${cargo} na ${empresa}.`,
    `A proposta é válida até ${validade}. Fico à disposição para conversar sobre qualquer dúvida.`,
    ou(d.assinante_nome, "QUEM ASSINA"),
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Verificação
// ---------------------------------------------------------------------------

/** Placeholders ainda presentes no texto, sem repetição. */
export function placeholdersPendentes(texto: string): string[] {
  return [...new Set(texto.match(/\{[^{}]+\}/g) ?? [])];
}

export function verificarOferta(d: DadosOferta, texto: string): Verificacao[] {
  const out: Verificacao[] = [];
  const pend = placeholdersPendentes(texto);
  out.push(
    pend.length
      ? { id: "placeholders", nivel: "bloqueio", mensagem: `Falta preencher: ${pend.join(", ")}.` }
      : { id: "placeholders", nivel: "ok", mensagem: "Todos os campos preenchidos." },
  );
  out.push(
    d.validade.trim()
      ? { id: "validade", nivel: "ok", mensagem: "Validade da proposta definida." }
      : { id: "validade", nivel: "bloqueio", mensagem: "A proposta precisa de validade." },
  );
  out.push(
    d.condicoes.trim()
      ? { id: "condicoes", nivel: "ok", mensagem: "Condições da proposta definidas." }
      : { id: "condicoes", nivel: "bloqueio", mensagem: "Informe as condições (documentos, exame admissional etc.)." },
  );
  const disc = termosDiscriminatorios(texto);
  if (disc.length) {
    out.push({ id: "discriminatorio", nivel: "bloqueio", mensagem: `Texto com termo que discrimina: ${disc[0]}.` });
  }
  if (d.salario.trim() && formatarSalario(d.salario) === d.salario.trim() && !/^R\$/.test(d.salario.trim())) {
    out.push({ id: "salario", nivel: "aviso", mensagem: "Não consegui ler o salário como valor: confira se está sem ambiguidade." });
  }
  if (d.variavel.trim() && d.variavel.trim().length < 15) {
    out.push({ id: "variavel", nivel: "aviso", mensagem: "Descreva como funciona a remuneração variável (regras e metas)." });
  }
  out.push({
    id: "revisao",
    nivel: "aviso",
    mensagem: "Carta-oferta tem peso: peça a revisão do DP/RH (e do jurídico, se possível) antes de enviar.",
  });
  return out;
}

export function temBloqueioOferta(vs: Verificacao[]): boolean {
  return vs.some((v) => v.nivel === "bloqueio");
}

/** Lê os campos do formulário para os dados da carta (sem inventar nada). */
export function dadosDeFormulario(f: Record<string, string>): DadosOferta {
  const t = (k: string, max = 300) => (f[k] ?? "").trim().slice(0, max);
  return {
    empresa: t("empresa", 140),
    assinante_nome: t("assinante_nome", 120),
    assinante_cargo: t("assinante_cargo", 120),
    contato: t("contato", 200),
    candidato: t("candidato", 140),
    cargo: t("cargo", 140),
    reporta_a: t("reporta_a", 140),
    regime: t("regime", 40),
    salario: t("salario", 60),
    forma_pagamento: t("forma_pagamento", 120),
    variavel: t("variavel", 600),
    beneficios: linhas(f.beneficios ?? ""),
    modelo: t("modelo", 40),
    local: t("local", 140),
    jornada: t("jornada", 160),
    data_inicio: t("data_inicio", 40),
    experiencia: t("experiencia", 160),
    condicoes: t("condicoes", 600),
    validade: t("validade", 40),
    proximos_passos: t("proximos_passos", 800),
    extras: linhas(f.extras ?? ""),
    tom: f.tom === "descontraido" ? "descontraido" : "formal",
    cidade_carta: t("cidade_carta", 80),
  };
}
