"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) throw new Error("not_admin");

  return user;
}

export async function decidirVaga(formData: FormData) {
  const user = await requireAdmin();
  const jobId = String(formData.get("job_id"));
  const acao = String(formData.get("acao")); // "publicar" | "rejeitar" | "corrigir"
  const motivo = String(formData.get("motivo") ?? "").trim();

  const admin = createAdminClient();
  const { data: before } = await admin.from("jobs").select("*").eq("id", jobId).single();

  const status = acao === "publicar" ? "publicada" : acao === "rejeitar" ? "rejeitada" : "rascunho";

  const { data: after, error } = await admin
    .from("jobs")
    .update({
      status,
      motivo_decisao: motivo || null,
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
      publicada_em: acao === "publicar" ? new Date().toISOString() : undefined,
    })
    .eq("id", jobId)
    .select()
    .single();

  if (error || !after) {
    throw new Error("Não foi possível atualizar a vaga. Tente de novo.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: `vaga_${acao}`,
    objeto_tipo: "job",
    objeto_id: jobId,
    antes: before,
    depois: after,
  });

  revalidatePath("/admin/vagas");
  revalidatePath("/admin");
}
