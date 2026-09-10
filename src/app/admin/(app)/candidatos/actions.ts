"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

export async function validarCandidato(formData: FormData) {
  const { user } = await requireInternalUser("pipeline.manage");
  const candidateId = String(formData.get("candidate_id"));
  const acao = String(formData.get("acao")); // "aprovar" | "reprovar"

  const admin = createAdminClient();
  const { data: before } = await admin.from("profiles").select("*").eq("id", candidateId).single();

  const status_validacao = acao === "aprovar" ? "aprovado" : "reprovado";

  const { data: after, error } = await admin
    .from("profiles")
    .update({
      status_validacao,
      validado_por: user.id,
      validado_em: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .select()
    .single();

  if (error || !after) {
    throw new Error("Não foi possível atualizar a validação do candidato. Tente de novo.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: `candidato_${status_validacao}`,
    objeto_tipo: "profile",
    objeto_id: candidateId,
    antes: before,
    depois: after,
  });

  revalidatePath("/admin/candidatos");
}
