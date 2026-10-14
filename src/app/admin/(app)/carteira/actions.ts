"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function id(formData: FormData, campo: string): string {
  const v = String(formData.get(campo) ?? "");
  if (!UUID.test(v)) throw new Error("Dados inválidos.");
  return v;
}

/** Atribui (ou reativa) um operador a uma empresa. Só superadmin. */
export async function atribuirOperador(formData: FormData) {
  const { user } = await requireInternalUser("carteira.manage");
  const companyId = id(formData, "company_id");
  const userId = id(formData, "user_id");
  const confidenciais = formData.get("acessa_confidenciais") === "on";

  const admin = createAdminClient();

  // Só operadores ativos podem ter carteira.
  const { data: alvo } = await admin
    .from("admin_users")
    .select("user_id, perfil, ativo")
    .eq("user_id", userId)
    .maybeSingle();
  if (!alvo || alvo.perfil !== "operador" || alvo.ativo === false) {
    throw new Error("Usuário não é um operador ativo.");
  }

  const { data: linha, error } = await admin
    .from("company_assignments")
    .upsert(
      {
        company_id: companyId,
        user_id: userId,
        ativo: true,
        acessa_confidenciais: confidenciais,
        criado_por: user.id,
      },
      { onConflict: "company_id,user_id" },
    )
    .select("id");
  if (error || !linha || linha.length === 0) {
    throw new Error("Não foi possível atribuir o operador.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "carteira_atribuida",
    objeto_tipo: "company_assignment",
    objeto_id: linha[0].id,
    depois: { company_id: companyId, user_id: userId, acessa_confidenciais: confidenciais },
  });
  revalidatePath("/admin/carteira");
}

/** Remove (desativa) a atribuição; o histórico fica. Só superadmin. */
export async function desativarAtribuicao(formData: FormData) {
  const { user } = await requireInternalUser("carteira.manage");
  const assignmentId = id(formData, "assignment_id");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("company_assignments")
    .update({ ativo: false })
    .eq("id", assignmentId)
    .select("id, company_id, user_id");
  if (error || !data || data.length === 0) throw new Error("Atribuição não encontrada.");

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "carteira_removida",
    objeto_tipo: "company_assignment",
    objeto_id: assignmentId,
    antes: { company_id: data[0].company_id, user_id: data[0].user_id, ativo: true },
    depois: { ativo: false },
  });
  revalidatePath("/admin/carteira");
}

/** Liga/desliga o acesso a vagas confidenciais da atribuição. Só superadmin. */
export async function alternarConfidenciais(formData: FormData) {
  const { user } = await requireInternalUser("carteira.manage");
  const assignmentId = id(formData, "assignment_id");
  const valor = formData.get("valor") === "true";
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("company_assignments")
    .update({ acessa_confidenciais: valor })
    .eq("id", assignmentId)
    .select("id");
  if (error || !data || data.length === 0) throw new Error("Atribuição não encontrada.");

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: valor ? "carteira_confidenciais_liberadas" : "carteira_confidenciais_revogadas",
    objeto_tipo: "company_assignment",
    objeto_id: assignmentId,
    depois: { acessa_confidenciais: valor },
  });
  revalidatePath("/admin/carteira");
}
