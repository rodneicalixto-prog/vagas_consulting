import type { Enums } from "@/lib/supabase/types";

export const modalidadeLabel: Record<Enums<"modalidade_vaga">, string> = {
  efetiva: "Efetiva",
  pj: "PJ",
  temporaria: "Temporária",
};

export const modalidadeTagClass: Record<Enums<"modalidade_vaga">, string> = {
  efetiva: "bg-navy-bg text-navy",
  pj: "bg-gold-bg text-gold-3",
  temporaria: "bg-teal-bg text-teal",
};

export const statusLabel: Record<Enums<"status_candidatura">, string> = {
  recebida: "Recebida",
  triagem: "Em análise",
  entrevista: "Entrevista",
  teste: "Teste",
  proposta: "Proposta",
  contratado: "Contratado",
  rejeitada: "Não seguiu",
  desistente: "Desistência",
  expirada: "Expirada",
};

export const statusPillClass: Record<Enums<"status_candidatura">, string> = {
  recebida: "bg-gold-bg text-gold-3",
  triagem: "bg-gold-bg text-gold-3",
  entrevista: "bg-navy-bg text-navy",
  teste: "bg-navy-bg text-navy",
  proposta: "bg-success-bg text-success",
  contratado: "bg-success-bg text-success",
  rejeitada: "bg-black/5 text-text-3",
  desistente: "bg-black/5 text-text-3",
  expirada: "bg-black/5 text-text-3",
};

export const statusProgress: Record<Enums<"status_candidatura">, number> = {
  recebida: 1,
  triagem: 2,
  entrevista: 3,
  teste: 3,
  proposta: 4,
  contratado: 5,
  rejeitada: 5,
  desistente: 5,
  expirada: 5,
};
