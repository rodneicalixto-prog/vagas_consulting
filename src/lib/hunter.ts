/**
 * Hunter H1: prospects captados para uma vaga. Puro: sem banco nem rede.
 * Spec: docs/specs/HUNTER_PREPARACAO.md.
 *
 * Regras: contato só de fonte legítima; score às cegas; mensagem determinística e
 * identificada, com "responda SAIR"; teto diário; janela de horário; 30 dias de retenção.
 */
import { createHash, randomBytes } from "node:crypto";
import { filtrarPerfil } from "./abordagem";
import { normalizarTelefoneBR } from "./whatsapp";
import { termosDiscriminatorios, type Verificacao } from "./vaga-estruturada";
import type { ResultadoTriagem } from "./triagem";

export const FONTES = ["vagascom", "infojobs", "linkedin", "csv", "manual", "outra"] as const;
export type FonteHunter = (typeof FONTES)[number];

export const ROTULO_FONTE: Record<FonteHunter, string> = {
  vagascom: "Vagas.com",
  infojobs: "InfoJobs",
  linkedin: "LinkedIn",
  csv: "Planilha",
  manual: "Cadastro manual",
  outra: "Outra fonte",
};

export function fonteValida(v: unknown): v is FonteHunter {
  return typeof v === "string" && (FONTES as readonly string[]).includes(v);
}

export type EstadoProspect =
  | "novo"
  | "avaliado"
  | "mensagem_pronta"
  | "aprovado"
  | "enviado"
  | "clicou"
  | "candidatou"
  | "respondeu"
  | "nao_contactar"
  | "descartado"
  | "expirado";

export const ROTULO_ESTADO: Record<EstadoProspect, string> = {
  novo: "Novo",
  avaliado: "Avaliado",
  mensagem_pronta: "Mensagem pronta",
  aprovado: "Aprovado para envio",
  enviado: "Enviado",
  clicou: "Abriu o link",
  candidatou: "Candidatou-se",
  respondeu: "Respondeu",
  nao_contactar: "Não contactar",
  descartado: "Descartado",
  expirado: "Expirado (dados apagados)",
};

export type Fit = "alto" | "medio" | "baixo" | "nao_avaliado";
export type CanalHunter = "whatsapp" | "email";

export const LIMITE_IMPORTACAO = 200;
export const LIMITE_AVALIACAO_POR_RODADA = 15;
export const DIAS_RETENCAO = 30;
/** Teto de WhatsApp frio por dia (a linha é única). Sobe só com taxa de reclamação baixa. */
export const TETO_DIARIO_PADRAO = 20;
export const LIMITE_MENSAGEM_WHATSAPP = 700;

// ---------------------------------------------------------------------------
// Contato
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizarEmail(bruto: string | null | undefined): string | null {
  const e = (bruto ?? "").trim().toLowerCase();
  return e.length <= 160 && EMAIL_RE.test(e) ? e : null;
}

export function hashContato(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

export function tokenRastreio(): string {
  return randomBytes(18).toString("base64url");
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

export function retencaoAte(de: Date = new Date(), dias = DIAS_RETENCAO): Date {
  return new Date(de.getTime() + dias * 86400000);
}

/** Candidatos que já interagiram não são apagados pela retenção automática. */
const PROTEGIDOS_DA_RETENCAO: EstadoProspect[] = ["clicou", "candidatou", "respondeu"];

export function precisaAnonimizar(p: { estado: EstadoProspect; retencao_ate: string; anonimizado_em: string | null }, agora = new Date()): boolean {
  if (p.anonimizado_em) return false;
  if (PROTEGIDOS_DA_RETENCAO.includes(p.estado)) return false;
  return new Date(p.retencao_ate).getTime() <= agora.getTime();
}

// ---------------------------------------------------------------------------
// Importação (planilha)
// ---------------------------------------------------------------------------

export type LinhaImportada = {
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  cargo: string;
  perfil: string;
};

const ALIAS: Record<keyof LinhaImportada, string[]> = {
  nome: ["nome", "nome completo", "candidato"],
  telefone: ["telefone", "celular", "whatsapp", "fone", "tel"],
  email: ["email", "e-mail", "mail"],
  cidade: ["cidade", "localizacao", "local"],
  cargo: ["cargo", "titulo", "titulo profissional", "ultimo cargo", "cargo atual"],
  perfil: ["perfil", "resumo", "experiencia", "experiencias", "sobre", "historico"],
};

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

function detectarSeparador(primeira: string): string {
  const c = (s: string) => primeira.split(s).length - 1;
  const opcoes: [string, number][] = [[";", c(";")], ["\t", c("\t")], [",", c(",")]];
  return opcoes.sort((a, b) => b[1] - a[1])[0][0];
}

/** Lê CSV com aspas, quebras de linha dentro de campo e separador `;`, `,` ou tab. */
export function lerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const sep = detectarSeparador(t.split("\n")[0] ?? "");
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) {
      linha.push(campo);
      campo = "";
    } else if (ch === "\n") {
      linha.push(campo);
      if (linha.some((c) => c.trim() !== "")) linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += ch;
  }
  linha.push(campo);
  if (linha.some((c) => c.trim() !== "")) linhas.push(linha);
  return linhas;
}

export type LeituraPlanilha = { linhas: LinhaImportada[]; ignoradas: number; semCabecalho: boolean; truncada: boolean };

/** Planilha → linhas com os campos que o hunter usa. Colunas desconhecidas são ignoradas. */
export function lerPlanilha(texto: string): LeituraPlanilha {
  const bruto = lerCsv(texto);
  if (bruto.length < 2) return { linhas: [], ignoradas: 0, semCabecalho: bruto.length === 0, truncada: false };
  const cab = bruto[0].map(semAcento);
  const idx = (campo: keyof LinhaImportada) => cab.findIndex((c) => ALIAS[campo].includes(c));
  const col = Object.fromEntries((Object.keys(ALIAS) as (keyof LinhaImportada)[]).map((k) => [k, idx(k)])) as Record<keyof LinhaImportada, number>;
  const temContato = col.telefone >= 0 || col.email >= 0;
  if (!temContato) return { linhas: [], ignoradas: bruto.length - 1, semCabecalho: true, truncada: false };

  const linhas: LinhaImportada[] = [];
  let ignoradas = 0;
  for (const r of bruto.slice(1)) {
    const v = (k: keyof LinhaImportada) => (col[k] >= 0 ? (r[col[k]] ?? "").trim() : "");
    const l: LinhaImportada = {
      nome: v("nome").slice(0, 120),
      telefone: v("telefone"),
      email: v("email"),
      cidade: v("cidade").slice(0, 80),
      cargo: v("cargo").slice(0, 120),
      perfil: v("perfil"),
    };
    if (!l.telefone && !l.email) {
      ignoradas++;
      continue;
    }
    linhas.push(l);
  }
  const truncada = linhas.length > LIMITE_IMPORTACAO;
  return { linhas: linhas.slice(0, LIMITE_IMPORTACAO), ignoradas, semCabecalho: false, truncada };
}

export type ProspectPreparado = {
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string;
  perfil: string;
  chave_tel: string | null;
  chave_email: string | null;
  removidosDoPerfil: number;
};

/**
 * Normaliza contato, tira do perfil o que é dado pessoal (família, endereço, telefone, e-mail)
 * e calcula os hashes. `null` se não houver telefone nem e-mail válidos.
 */
export function prepararProspect(l: LinhaImportada): ProspectPreparado | null {
  const telefone = normalizarTelefoneBR(l.telefone);
  const email = normalizarEmail(l.email);
  if (!telefone && !email) return null;
  const base = [l.cargo ? `Cargo: ${l.cargo}` : "", l.perfil].filter(Boolean).join("\n");
  const f = filtrarPerfil(base);
  return {
    nome: l.nome,
    telefone,
    email,
    cidade: l.cidade,
    perfil: f.limpo.slice(0, 2500),
    chave_tel: telefone ? hashContato(telefone) : null,
    chave_email: email ? hashContato(email) : null,
    removidosDoPerfil: f.removidos,
  };
}

// ---------------------------------------------------------------------------
// Fit
// ---------------------------------------------------------------------------

/** Só "alto" segue por padrão; "médio" a pessoa escolhe; eliminatório não atendido é "baixo". */
export function fitDaTriagem(r: ResultadoTriagem): Fit {
  if (r.eliminado) return "baixo";
  if (r.pontuacao >= 70) return "alto";
  if (r.pontuacao >= 50) return "medio";
  return "baixo";
}

// ---------------------------------------------------------------------------
// Mensagem
// ---------------------------------------------------------------------------

export const OPERACAO = "SOS Vagas";

export type DadosMensagem = {
  nome: string;
  fonte: FonteHunter;
  tituloVaga: string;
  /** Nome da empresa; `null` em vaga sigilosa (a mensagem não a revela). */
  empresa: string | null;
  link: string;
};

function primeiroNome(nome: string): string {
  const n = nome.trim().split(/\s+/)[0] ?? "";
  return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";
}

function origemDoDado(f: FonteHunter): string {
  switch (f) {
    case "vagascom":
    case "infojobs":
    case "linkedin":
      return `seu perfil público no ${ROTULO_FONTE[f]}`;
    default:
      return "um cadastro profissional";
  }
}

/** Mensagem de primeiro contato por WhatsApp. Determinística: sempre identifica, informa a origem e dá a saída. */
export function mensagemWhatsApp(d: DadosMensagem): string {
  const nome = primeiroNome(d.nome);
  const onde = d.empresa ? ` em ${d.empresa}` : "";
  return [
    `Olá${nome ? `, ${nome}` : ""}! Aqui é a equipe de seleção da ${OPERACAO}.`,
    `Encontramos ${origemDoDado(d.fonte)} e achamos que seu perfil combina com a vaga de ${d.tituloVaga}${onde}.`,
    `Se tiver interesse, veja os detalhes e se candidate aqui: ${d.link}`,
    "",
    "Se não quiser receber mais mensagens, responda SAIR.",
  ].join("\n");
}

/** Primeiro contato por e-mail: assunto e corpo. */
export function mensagemEmail(d: DadosMensagem): { assunto: string; texto: string } {
  const nome = primeiroNome(d.nome);
  const onde = d.empresa ? ` em ${d.empresa}` : "";
  return {
    assunto: `Vaga de ${d.tituloVaga}${onde}`.slice(0, 120),
    texto: [
      `Olá${nome ? `, ${nome}` : ""}!`,
      "",
      `Somos a equipe de seleção da ${OPERACAO}. Encontramos ${origemDoDado(d.fonte)} e achamos que seu perfil combina com a vaga de ${d.tituloVaga}${onde}.`,
      "",
      `Se tiver interesse, veja os detalhes e se candidate: ${d.link}`,
      "",
      "Você recebeu este contato por causa do seu perfil profissional. Se não quiser receber mais mensagens, responda SAIR a este e-mail.",
    ].join("\n"),
  };
}

export type ContextoVerificacaoMensagem = {
  canal: CanalHunter;
  vagaSigilosa: boolean;
  nomeEmpresa: string | null;
  link: string;
};

/** OK / Aviso / Bloqueia antes de aprovar. Bloqueio impede a aprovação. */
export function verificarMensagem(texto: string, c: ContextoVerificacaoMensagem): Verificacao[] {
  const out: Verificacao[] = [];
  const t = semAcento(texto);

  out.push(
    texto.includes(c.link)
      ? { id: "link", nivel: "ok", mensagem: "Tem o link rastreado da vaga." }
      : { id: "link", nivel: "bloqueio", mensagem: "Falta o link rastreado da vaga." },
  );
  out.push(
    /\bresponda sair\b/.test(t)
      ? { id: "saida", nivel: "ok", mensagem: "Tem a saída: responda SAIR." }
      : { id: "saida", nivel: "bloqueio", mensagem: "Falta o aviso 'responda SAIR'. Sem saída clara a mensagem não pode ir." },
  );
  out.push(
    t.includes(semAcento(OPERACAO))
      ? { id: "identificacao", nivel: "ok", mensagem: "Identifica quem está falando." }
      : { id: "identificacao", nivel: "bloqueio", mensagem: "A mensagem não diz quem somos." },
  );
  if (c.vagaSigilosa && c.nomeEmpresa && t.includes(semAcento(c.nomeEmpresa))) {
    out.push({ id: "sigilo", nivel: "bloqueio", mensagem: "Vaga sigilosa: a mensagem cita a empresa." });
  } else if (c.vagaSigilosa) {
    out.push({ id: "sigilo", nivel: "ok", mensagem: "Vaga sigilosa: a empresa não aparece." });
  }
  const disc = termosDiscriminatorios(texto);
  out.push(
    disc.length
      ? { id: "discriminatorio", nivel: "bloqueio", mensagem: `Termo que discrimina: ${[...new Set(disc)].join(", ")}.` }
      : { id: "discriminatorio", nivel: "ok", mensagem: "Sem termo discriminatório." },
  );
  if (/(garantid|garantimos|contrata(cao|do) certa|vaga certa para voce|salario de r\$)/.test(t)) {
    out.push({ id: "promessa", nivel: "aviso", mensagem: "Há promessa ou valor de salário na mensagem. Confira antes de aprovar." });
  }
  if (c.canal === "whatsapp" && texto.length > LIMITE_MENSAGEM_WHATSAPP) {
    out.push({ id: "tamanho", nivel: "aviso", mensagem: `Mensagem longa para um primeiro contato (${texto.length} caracteres).` });
  }
  return out;
}

export function temBloqueio(vs: Verificacao[]): boolean {
  return vs.some((v) => v.nivel === "bloqueio");
}

// ---------------------------------------------------------------------------
// Envio: teto diário e janela de horário
// ---------------------------------------------------------------------------

export function restanteDoDia(enviadosHoje: number, teto: number = TETO_DIARIO_PADRAO): number {
  return Math.max(0, teto - enviadosHoje);
}

/** Hora e minuto em São Paulo ("HH:MM"). */
export function horaEmSaoPaulo(agora: Date): string {
  const f = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });
  return f.format(agora).replace(/^24:/, "00:");
}

/** Dentro da janela de contato da vaga? Sem janela definida, usa 08:00 às 20:00. */
export function dentroDaJanela(agora: Date, inicio: string, fim: string): boolean {
  const i = inicio || "08:00";
  const f = fim || "20:00";
  const h = horaEmSaoPaulo(agora);
  return h >= i && h < f;
}

/** Início do dia em São Paulo (UTC-3, sem horário de verão desde 2019), em ISO UTC. */
export function inicioDoDiaSaoPaulo(agora: Date): string {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
  return new Date(`${ymd}T00:00:00-03:00`).toISOString();
}

export function origemDaCandidatura(fonte: FonteHunter): string {
  return `hunter_${fonte}`;
}
