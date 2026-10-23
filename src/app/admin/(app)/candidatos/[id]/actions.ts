"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import type { Enums } from "@/lib/supabase/types";
import { validateFormData } from "@/lib/validation/validate-form";
import {
  AgendarEntrevistaOnlineSchema,
  type AgendarEntrevistaOnlineInput,
} from "@/lib/validation/schemas";

const STATUS_VALIDOS: Enums<"status_candidatura">[] = [
  "recebida",
  "triagem",
  "entrevista",
  "teste",
  "proposta",
  "contratado",
  "rejeitada",
  "reprovado_cliente",
  "desistente",
  "expirada",
];

export async function atualizarStatusCandidatura(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const escopo = await obterEscopo(user.id, role);

  const applicationId = String(formData.get("application_id"));
  const candidateId = String(formData.get("candidate_id"));
  const status = String(formData.get("status")) as Enums<"status_candidatura">;
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!STATUS_VALIDOS.includes(status)) {
    throw new Error("Status inválido.");
  }

  const admin = createAdminClient();
  const { data: before } = await admin.from("applications").select("*").eq("id", applicationId).single();
  if (!before) throw new Error("Candidatura não encontrada.");
  // Carteira: a vaga da candidatura precisa estar no escopo do usuário.
  await exigirVaga(escopo, before.job_id);

  const { data: after, error } = await admin
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .select()
    .single();

  if (error || !after) {
    throw new Error("Não foi possível atualizar o status da candidatura. Tente de novo.");
  }

  if (motivo) {
    await admin.from("application_notes").insert({
      application_id: applicationId,
      autor_id: user.id,
      nota: `Status alterado para "${status}": ${motivo}`,
    });
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "candidatura_status_alterado",
    objeto_tipo: "application",
    objeto_id: applicationId,
    antes: before,
    depois: after,
  });

  revalidatePath(`/admin/candidatos/${candidateId}`);
  revalidatePath("/admin/estrategico");
}

/** Marca a entrevista online: manda data e link ao candidato (aba Mensagens) e registra na candidatura. */
export async function agendarEntrevistaOnline(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const { application_id: applicationId, candidate_id: candidateId, data_hora: dataHora, link } =
    validateFormData<AgendarEntrevistaOnlineInput>(AgendarEntrevistaOnlineSchema, formData);
  const escopo = await obterEscopo(user.id, role);

  const admin = createAdminClient();
  const { data: candidatura } = await admin
    .from("applications")
    .select("id, job_id, status, candidate_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!candidatura || candidatura.candidate_id !== candidateId) throw new Error("Candidatura não encontrada.");
  await exigirVaga(escopo, candidatura.job_id);
  if (candidatura.status !== "entrevista") {
    throw new Error("Agende a entrevista depois de mover a candidatura para Entrevista.");
  }

  // Data e hora vêm do campo datetime-local e são mantidas como digitadas (sem fuso do servidor).
  const [dia, hora] = dataHora.split("T");
  const [ano, mes, diaMes] = dia.split("-");
  const quando = `${diaMes}/${mes}/${ano} às ${hora}`;

  const { error } = await admin.from("messages").insert({
    application_id: applicationId,
    remetente_id: user.id,
    destinatario_id: candidateId,
    conteudo: `Entrevista online marcada para ${quando}. Entre pelo link da reunião: ${link}`,
  });
  if (error) throw new Error("Não foi possível enviar a mensagem ao candidato.");

  await admin.from("application_notes").insert({
    application_id: applicationId,
    autor_id: user.id,
    nota: `Entrevista online agendada para ${quando}: ${link}`,
  });

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "entrevista_online_agendada",
    objeto_tipo: "application",
    objeto_id: applicationId,
    depois: { data_hora: dataHora, link },
  });

  revalidatePath(`/admin/candidatos/${candidateId}`);
}
