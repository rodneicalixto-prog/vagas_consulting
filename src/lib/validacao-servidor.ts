import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import type { ResultadoTriagem } from "@/lib/triagem";
import { normalizarRegras } from "@/lib/regras-vaga";
import { calcularPrazo, motivoDaTriagem, type MotivoReprovacao } from "@/lib/validacao-reprovacao";

type Resultado = "criada" | "atualizada" | "ignorada_revertida" | "retirada" | "sem_caso";

/**
 * Leva a reprovação identificada pela triagem para a fila de validação humana.
 * A IA NÃO responde ao candidato: a candidatura fica como está até a pessoa decidir.
 *
 * - Eliminado: abre (ou atualiza) um caso ativo. Se já houve um caso REVERTIDO
 *   para os mesmos critérios, não reabre: a pessoa já decidiu isso.
 * - Não eliminado: se havia caso ativo, retira da fila (a reavaliação mudou o resultado).
 */
export async function sincronizarReprovacaoDaTriagem(p: {
  jobId: string;
  applicationId: string;
  candidateId: string;
  resultado: ResultadoTriagem;
  criteriosHash: string;
}): Promise<Resultado> {
  const admin = createAdminClient();
  const motivo = motivoDaTriagem(p.resultado, p.criteriosHash);

  const { data: existentes } = await admin
    .from("validacoes_reprovacao")
    .select("id, status, motivo")
    .eq("application_id", p.applicationId)
    .eq("etapa", "triagem");
  const ativo = (existentes ?? []).find((e) => e.status === "aguardando" || e.status === "aguardando_dados");

  if (!motivo) {
    if (!ativo) return "sem_caso";
    await admin
      .from("validacoes_reprovacao")
      .update({
        status: "revertida",
        observacao: "Retirado automaticamente: a nova triagem não elimina mais este candidato.",
        decidido_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ativo.id)
      // Se uma pessoa decidiu entre a leitura e esta escrita, a decisão dela prevalece.
      .in("status", ["aguardando", "aguardando_dados"]);
    return "retirada";
  }

  const jaRevertido = (existentes ?? []).some(
    (e) =>
      e.status === "revertida" &&
      (e.motivo as { criterios_hash?: string | null } | null)?.criterios_hash === p.criteriosHash,
  );
  if (jaRevertido && !ativo) {
    // A pessoa já decidiu manter este candidato no processo para estes critérios. A triagem
    // acabou de gravar `eliminado=true` por cima; devolve a decisão humana, sem alarde.
    await admin
      .from("job_screenings")
      .update({ eliminado: false, updated_at: new Date().toISOString() })
      .eq("job_id", p.jobId)
      .eq("application_id", p.applicationId);
    return "ignorada_revertida";
  }

  if (ativo) {
    await admin
      .from("validacoes_reprovacao")
      .update({ motivo: motivo as unknown as Json, updated_at: new Date().toISOString() })
      .eq("id", ativo.id)
      .in("status", ["aguardando", "aguardando_dados"]);
    return "atualizada";
  }

  const { data: vaga } = await admin.from("jobs").select("regras_ia").eq("id", p.jobId).maybeSingle();
  const { error } = await admin.from("validacoes_reprovacao").insert({
    job_id: p.jobId,
    application_id: p.applicationId,
    candidate_id: p.candidateId,
    etapa: "triagem",
    status: "aguardando",
    motivo: motivo as unknown as Json,
    prazo_em: calcularPrazo().toISOString(),
    regras_versao: normalizarRegras(vaga?.regras_ia).versao || null,
  });
  // Índice único parcial: duas triagens simultâneas não duplicam o caso.
  if (error && error.code !== "23505") throw new Error("Não foi possível abrir o caso na fila de validação.");
  return "criada";
}

export type CasoValidacao = {
  id: string;
  job_id: string;
  application_id: string;
  candidate_id: string;
  etapa: "triagem" | "entrevista_ia" | "competencias";
  status: "aguardando" | "confirmada" | "revertida" | "aguardando_dados";
  motivo: MotivoReprovacao;
  prazo_em: string;
  observacao: string;
  decidido_em: string | null;
  created_at: string;
};

/** Quantos casos ativos (esperando decisão ou dados) cada vaga tem. */
export async function contarCasosAtivos(jobIds: string[]): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (jobIds.length === 0) return mapa;
  const admin = createAdminClient();
  const { data } = await admin
    .from("validacoes_reprovacao")
    .select("job_id")
    .in("job_id", jobIds)
    .in("status", ["aguardando", "aguardando_dados"])
    .limit(5000);
  for (const l of data ?? []) mapa.set(l.job_id, (mapa.get(l.job_id) ?? 0) + 1);
  return mapa;
}
