/**
 * Devolutiva ao candidato (passo 3I): textos-base, verificação antes de
 * liberar e regra de envio de encerramento. Puro: sem banco nem rede.
 * Spec: docs/specs/AGENTE_IA_FASE3.md §14.5 e §14.18.
 */
import { termosDiscriminatorios, type Verificacao } from "./vaga-estruturada";
import { motivoProibido } from "./entrevista";

export type TipoDevolutiva = "aprovacao" | "generica" | "feedback";
export type CanalDevolutiva = "whatsapp" | "email" | "ligacao";
export type TomDevolutiva = "formal" | "descontraido";

export const ROTULO_TIPO: Record<TipoDevolutiva, string> = {
  aprovacao: "Aprovação",
  generica: "Reprovação genérica",
  feedback: "Reprovação com feedback",
};
export const ROTULO_CANAL: Record<CanalDevolutiva, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  ligacao: "Ligação (roteiro)",
};

export function tipoValido(v: unknown): v is TipoDevolutiva {
  return v === "aprovacao" || v === "generica" || v === "feedback";
}
export function canalValido(v: unknown): v is CanalDevolutiva {
  return v === "whatsapp" || v === "email" || v === "ligacao";
}
export function tomValido(v: unknown): v is TomDevolutiva {
  return v === "formal" || v === "descontraido";
}

export type DadosDevolutiva = {
  nome: string;
  cargo: string;
  empresa: string;
  recrutador: string;
  tom: TomDevolutiva;
  fortes: string;
  melhoria: string;
  proximo_passo: string;
  prazo: string;
  documentos: string[];
  banco_talentos: boolean;
};

/** Quem chegou à fase final merece conversa: a ligação vem antes do texto. */
export function sugerirTipo(p: { fichaFechada: boolean; statusCandidatura: string }): {
  tipo: TipoDevolutiva;
  sugerirLigacao: boolean;
} {
  if (p.statusCandidatura === "contratado" || p.statusCandidatura === "proposta") {
    return { tipo: "aprovacao", sugerirLigacao: false };
  }
  if (p.fichaFechada) return { tipo: "feedback", sugerirLigacao: true };
  return { tipo: "generica", sugerirLigacao: false };
}

// ---------------------------------------------------------------------------
// Textos-base (§14.5), preenchidos com dados da candidatura
// ---------------------------------------------------------------------------

function saudacao(d: DadosDevolutiva): string {
  return d.tom === "descontraido" ? `Oi, ${d.nome}!` : `Olá, ${d.nome},`;
}

function listaFrase(itens: string[]): string {
  return itens.length <= 1 ? itens.join("") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

export function textoBase(tipo: TipoDevolutiva, canal: CanalDevolutiva, d: DadosDevolutiva): string {
  if (canal === "ligacao") return roteiroLigacao(tipo, d);
  const fim = d.banco_talentos
    ? ` Se quiser, podemos guardar seu currículo em nosso banco de talentos para novas vagas. Responda SIM para autorizar; você pode pedir a exclusão a qualquer momento respondendo SAIR.`
    : "";
  if (tipo === "aprovacao") {
    const docs = d.documentos.length > 0 ? ` Para avançarmos, preciso de: ${listaFrase(d.documentos)}.` : "";
    return [
      `${saudacao(d)} tenho boas notícias: seu perfil foi aprovado no processo para ${d.cargo}.`,
      `O próximo passo é: ${d.proximo_passo} (prazo: ${d.prazo}).${docs}`,
      `Qualquer dúvida, é só responder. ${d.recrutador}.`,
    ].join("\n");
  }
  if (tipo === "generica") {
    return [
      `${saudacao(d)} agradeço por participar do processo para ${d.cargo}.`,
      `Nesta vaga, seguimos com candidatos cuja experiência ficou mais próxima do que ela pede agora. Foi um prazer te conhecer e desejo muito sucesso na sua busca.${fim}`,
      `Abraço, ${d.recrutador}.`,
    ].join("\n");
  }
  return [
    `${saudacao(d)} agradeço o tempo dedicado ao processo para ${d.cargo}. Quero ser transparente: para esta vaga, não vamos seguir com a sua candidatura.`,
    `Como pontos fortes, destaco ${d.fortes}. Para vagas como esta, um ponto de desenvolvimento seria: ${d.melhoria}.`,
    `Essa decisão diz respeito apenas a esta vaga, não ao seu valor como profissional.${fim}`,
    `Fico à disposição. ${d.recrutador}.`,
  ].join("\n");
}

function roteiroLigacao(tipo: TipoDevolutiva, d: DadosDevolutiva): string {
  const linhas = [
    `Roteiro de ligação para ${d.nome} (${d.cargo})`,
    `1. Abertura: cumprimente, confirme se é um bom momento e agradeça o tempo dedicado ao processo.`,
  ];
  if (tipo === "aprovacao") {
    linhas.push(
      `2. Notícia: informe a aprovação para ${d.cargo}.`,
      `3. Próximo passo: ${d.proximo_passo}. Prazo: ${d.prazo}.`,
      `4. Escuta: abra espaço para dúvidas e combinados.`,
    );
  } else {
    linhas.push(
      `2. Decisão: diga com clareza que não seguiremos desta vez, sem rodeios.`,
      tipo === "feedback"
        ? `3. Feedback: destaque os pontos fortes (${d.fortes}) e, como desenvolvimento, ${d.melhoria}. Reforce que foi o fit com esta vaga.`
        : `3. Reconhecimento: agradeça e reforce que foi o fit com esta vaga específica.`,
      `4. Escuta: deixe a pessoa falar, sem justificar a decisão da empresa nem prometer nada.`,
    );
  }
  linhas.push(`5. Encerramento: agradeça e deseje sucesso. ${d.recrutador}.`);
  return linhas.join("\n");
}

// ---------------------------------------------------------------------------
// Verificação antes de liberar (§14.18)
// ---------------------------------------------------------------------------

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const PROMESSA = /\b(guardar|guardaremos|manteremos|vamos manter|vamos te chamar|entraremos em contato|banco de talentos|reencontrar|proxima oportunidade|proxima vaga|proximas oportunidades garantidas)\b/;
const MOTIVO_PESSOAL =
  /\b(mais jov|muito jov|jovem demais|velh|idos[oa]|por ser (mulher|homem)|gravid|filhos|casad[oa]|solteir)\w*/;
const DEPRECIATIVO = /\b(incompetent|despreparad|fraco|preguic|burr|ruim|pouco inteligente|nao serve|falta de capacidade|sem potencial|amador)\w*/;

export type ContextoVerificacao = {
  tipo: TipoDevolutiva;
  nome: string;
  cargo: string;
  bancoTalentos: boolean;
  proximoPasso: string;
  prazo: string;
  fortes: string;
  melhoria: string;
};

export function verificarDevolutiva(texto: string, c: ContextoVerificacao): Verificacao[] {
  const out: Verificacao[] = [];
  const t = semAcento(texto);

  out.push(
    /\{[^}]+\}/.test(texto)
      ? { id: "placeholder", nivel: "bloqueio", mensagem: "Há campo {…} sem preencher no texto." }
      : { id: "placeholder", nivel: "ok", mensagem: "Sem campos em branco." },
  );

  const primeiroNome = semAcento(c.nome.split(/\s+/)[0] ?? "");
  const temNome = primeiroNome.length >= 2 && t.includes(primeiroNome);
  const temCargo = semAcento(c.cargo).length >= 2 && t.includes(semAcento(c.cargo));
  out.push(
    temNome && temCargo
      ? { id: "personalizada", nivel: "ok", mensagem: "Personalizada com nome e vaga." }
      : { id: "personalizada", nivel: "bloqueio", mensagem: "A mensagem precisa citar o nome da pessoa e a vaga." },
  );

  const disc = termosDiscriminatorios(texto);
  const proibido = motivoProibido(texto);
  const pessoal = MOTIVO_PESSOAL.test(t);
  out.push(
    disc.length || proibido || pessoal
      ? { id: "discriminatorio", nivel: "bloqueio", mensagem: `Texto com ${disc[0] ? `termo discriminatório (${disc[0]})` : (proibido ?? "referência a característica pessoal")}.` }
      : { id: "discriminatorio", nivel: "ok", mensagem: "Sem critério discriminatório." },
  );

  if (PROMESSA.test(t) && !c.bancoTalentos) {
    out.push({
      id: "promessa",
      nivel: "bloqueio",
      mensagem: "Há promessa de guardar currículo ou chamar de novo, mas o campo banco de talentos não está marcado.",
    });
  } else {
    out.push({ id: "promessa", nivel: "ok", mensagem: "Sem promessa vazia." });
  }

  if (DEPRECIATIVO.test(t)) {
    out.push({ id: "tom_pessoal", nivel: "aviso", mensagem: "Há termo pessoal ou depreciativo: descreva uma melhoria acionável." });
  }

  if (c.tipo === "aprovacao") {
    const ok = c.proximoPasso.trim().length >= 3 && c.prazo.trim().length >= 2;
    out.push(
      ok
        ? { id: "proximos_passos", nivel: "ok", mensagem: "Próximo passo e prazo informados." }
        : { id: "proximos_passos", nivel: "bloqueio", mensagem: "Aprovação exige próximo passo e prazo." },
    );
  }
  if (c.tipo === "feedback") {
    const ok = c.fortes.trim().length >= 3 && c.melhoria.trim().length >= 3;
    out.push(
      ok
        ? { id: "evidencia", nivel: "ok", mensagem: "Feedback com pontos fortes e de melhoria." }
        : { id: "evidencia", nivel: "bloqueio", mensagem: "Feedback exige pontos fortes e de melhoria vindos da ficha ou digitados." },
    );
  }

  if (c.tipo !== "aprovacao" && texto.trim().length < 140 && !/obrigad/.test(t)) {
    out.push({ id: "tom_seco", nivel: "aviso", mensagem: "Texto seco: agradeça o tempo dedicado e reconheça a pessoa." });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Regra de envio de encerramento
// ---------------------------------------------------------------------------

export const JANELA_ENCERRAMENTO_DIAS = 30;
const STATUS_ENCERRADOS = ["rejeitada", "desistente", "expirada", "contratado"];

export function podeEnviarEncerramento(p: {
  descadastrado: boolean;
  bloqueado: boolean;
  jaEnviada: boolean;
  statusCandidatura: string;
  decididaEm: Date | null;
  agora?: Date;
}): { ok: boolean; motivo: string | null } {
  if (p.descadastrado) return { ok: false, motivo: "A pessoa pediu para não receber mensagens (descadastro)." };
  if (p.bloqueado) return { ok: false, motivo: "A pessoa está na black list da empresa." };
  if (p.jaEnviada) return { ok: false, motivo: "A devolutiva de encerramento já foi enviada: só é permitida uma." };
  if (STATUS_ENCERRADOS.includes(p.statusCandidatura) && p.decididaEm) {
    const dias = ((p.agora ?? new Date()).getTime() - p.decididaEm.getTime()) / 86_400_000;
    if (dias > JANELA_ENCERRAMENTO_DIAS) {
      return { ok: false, motivo: `Passaram mais de ${JANELA_ENCERRAMENTO_DIAS} dias da decisão: a janela de encerramento fechou.` };
    }
  }
  return { ok: true, motivo: null };
}

export function temBloqueioDevolutiva(vs: Verificacao[]): boolean {
  return vs.some((v) => v.nivel === "bloqueio");
}
