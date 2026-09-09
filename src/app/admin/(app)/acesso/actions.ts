"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ConvidarState = { error: string | null; info?: string };

export async function convidarAdmin(
  _prevState: ConvidarState,
  formData: FormData,
): Promise<ConvidarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: isAdmin } = await supabase
    .from("admin_users")
    .select("perfil")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!isAdmin) return { error: "Sem permissão." };
  if (isAdmin.perfil !== "superadmin") {
    return { error: "Só o superadministrador pode convidar novos usuários do painel." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const perfil = String(formData.get("perfil") ?? "") as
    | "superadmin"
    | "operacoes"
    | "compliance"
    | "suporte"
    | "financeiro";
  const nome = String(formData.get("nome") ?? "").trim();

  if (!email || !perfil) return { error: "Preencha e-mail e perfil." };

  const admin = createAdminClient();
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email);

  if (error || !invited.user) {
    return { error: "Não foi possível convidar. Verifique o e-mail e tente de novo." };
  }

  await admin.from("admin_users").insert({
    user_id: invited.user.id,
    perfil,
    nome_exibicao: nome || null,
  });

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
