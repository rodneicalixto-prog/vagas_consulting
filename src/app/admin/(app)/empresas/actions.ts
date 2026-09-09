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

export async function decidirEmpresa(formData: FormData) {
  const user = await requireAdmin();
  const companyId = String(formData.get("company_id"));
  const acao = String(formData.get("acao")); // "aprovar" | "rejeitar" | "corrigir"
  const motivo = String(formData.get("motivo") ?? "").trim();

  const admin = createAdminClient();
  const { data: before } = await admin.from("companies").select("*").eq("id", companyId).single();

  const status = acao === "aprovar" ? "aprovada" : acao === "rejeitar" ? "bloqueada" : "ajustes";

  const { data: after } = await admin
    .from("companies")
    .update({
      status,
      motivo_decisao: motivo || null,
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
    })
    .eq("id", companyId)
    .select()
    .single();

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: `empresa_${acao}`,
    objeto_tipo: "company",
    objeto_id: companyId,
    antes: before,
    depois: after,
  });

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
}
