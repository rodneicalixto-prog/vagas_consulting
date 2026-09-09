"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function atenderSolicitacao(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");

  const { data: isAdmin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!isAdmin) throw new Error("not_admin");

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
