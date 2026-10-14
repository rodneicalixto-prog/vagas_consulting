import type { Enums } from "@/lib/supabase/types";

export type StatusConvite = Enums<"status_convite_temp">;

export const conviteLabel: Record<StatusConvite, string> = {
  ofertado: "Novo convite",
  visualizado: "Aguardando resposta",
  aceito: "Aceito — aguardando confirmação",
  recusado: "Recusado",
  confirmado: "Confirmado",
  em_execucao: "Em execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
  ocorrencia: "Ocorrência",
};

export const convitePillClass: Record<StatusConvite, string> = {
  ofertado: "bg-gold-bg text-gold-3",
  visualizado: "bg-gold-bg text-gold-3",
  aceito: "bg-navy-bg text-navy",
  recusado: "bg-black/5 text-text-3",
  confirmado: "bg-success-bg text-success",
  em_execucao: "bg-success-bg text-success",
  concluido: "bg-success-bg text-success",
  cancelado: "bg-black/5 text-text-3",
  ocorrencia: "bg-danger-bg text-danger",
};

/** Convites que ainda aguardam resposta do candidato. */
export const CONVITES_ABERTOS: StatusConvite[] = ["ofertado", "visualizado"];

/** Convites que ainda ocupam a vaga para o candidato (impedem um novo convite). */
export const CONVITES_ATIVOS: StatusConvite[] = [
  "ofertado",
  "visualizado",
  "aceito",
  "confirmado",
  "em_execucao",
];

/** Convites que a operação ainda pode cancelar. */
export const CONVITES_CANCELAVEIS: StatusConvite[] = ["ofertado", "visualizado", "aceito", "confirmado"];

/** O enum não tem "expirado": o estado é calculado pela validade. */
export function conviteExpirado(c: { status: StatusConvite; validade: string | null }): boolean {
  return (
    CONVITES_ABERTOS.includes(c.status) &&
    c.validade !== null &&
    new Date(c.validade).getTime() < Date.now()
  );
}

export function formatPrazo(iso: string | null): string {
  if (!iso) return "sem prazo definido";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
