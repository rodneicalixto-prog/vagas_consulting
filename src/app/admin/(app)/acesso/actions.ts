"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

export type ConvidarState = { error: string | null; info?: string };

export async function convidarAdmin(
  _prevState: ConvidarState,
  formData: FormData,
): Promise<ConvidarState> {
  const { user } = await requireInternalUser("users.manage");

  const email = String(formData.get("email") ?? "").trim();
  const perfil = String(formData.get("perfil") ?? "") as "admin" | "operador";
  const nome = String(formData.get("nome") ?? "").trim();

  if (!email || !["admin", "operador"].includes(perfil)) {
    return { error: "Preencha e-mail e perfil com valores válidos." };
  }

  const admin = createAdminClient();
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email);

  if (error || !invited.user) {
    return { error: "Não foi possível convidar. Verifique o e-mail e tente de novo." };
  }

  const { error: insertError } = await admin.from("admin_users").insert({
    user_id: invited.user.id,
    perfil,
    nome_exibicao: nome || null,
  });

  if (insertError) {
    return {
      error: "Convite enviado, mas não foi possível registrar o perfil de admin. Tente de novo ou avise o suporte.",
    };
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "admin_convidado",
    objeto_tipo: "admin_users",
    objeto_id: invited.user.id,
    depois: { email, perfil },
  });

  revalidatePath("/admin/acesso");
  return { error: null, info: `Convite enviado para ${email}.` };
}
