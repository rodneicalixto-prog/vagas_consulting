"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

export async function resolverDenuncia(formData: FormData) {
  const { user } = await requireInternalUser("privacy.manage");

  const reportId = String(formData.get("report_id"));
  const acao = String(formData.get("acao")); // "resolvida" | "improcedente" | "em_analise"
  const resolucao = String(formData.get("resolucao") ?? "").trim();

  if (!["resolvida", "improcedente", "em_analise"].includes(acao)) {
    throw new Error("Ação inválida.");
  }

  const admin = createAdminClient();
  await admin
    .from("reports")
    .update({
      status: acao as "resolvida" | "improcedente" | "em_analise",
      resolucao: resolucao || null,
      resolvido_por: acao === "em_analise" ? null : user.id,
      resolvido_em: acao === "em_analise" ? null : new Date().toISOString(),
    })
    .eq("id", reportId);

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: `denuncia_${acao}`,
    objeto_tipo: "report",
    objeto_id: reportId,
  });

  revalidatePath("/admin/denuncias");
  revalidatePath("/admin");
}
