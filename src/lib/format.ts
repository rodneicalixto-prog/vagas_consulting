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

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dia${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months === 1 ? "" : "es"}`;
}

export function companyInitial(name: string | null | undefined): string {
  return (name ?? "?").trim().charAt(0).toUpperCase() || "?";
}
