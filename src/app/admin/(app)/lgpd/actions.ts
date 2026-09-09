"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

export async function atenderSolicitacao(formData: FormData) {
  const { user } = await requireInternalUser("privacy.manage");

  const requestId = String(formData.get("request_id"));
  const resposta = String(formData.get("resposta") ?? "").trim();

  const admin = createAdminClient();
  await admin
    .from("privacy_requests")
    .update({
      status: "atendida",
      resposta: resposta || null,
      atendido_por: user.id,
      atendido_em: new Date().toISOString(),
    })
    .eq("id", requestId);

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "lgpd_atendida",
    objeto_tipo: "privacy_request",
    objeto_id: requestId,
  });

  revalidatePath("/admin/lgpd");
}
