"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import type { Enums } from "@/lib/supabase/types";

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
  const { user } = await requireInternalUser("pipeline.manage");

  const applicationId = String(formData.get("application_id"));
  const candidateId = String(formData.get("candidate_id"));
  const status = String(formData.get("status")) as Enums<"status_candidatura">;
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!STATUS_VALIDOS.includes(status)) {
    throw new Error("Status inválido.");
  }

  const admin = createAdminClient();
  const { data: before } = await admin.from("applications").select("*").eq("id", applicationId).single();

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
