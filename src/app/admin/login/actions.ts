"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminAuthState = { error: string | null };

export async function adminLogin(
  _prevState: AdminAuthState,
  formData: FormData,
): Promise<AdminAuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "E-mail ou senha incorretos." };
  }

  const access = await supabase
    .from("admin_users")
    .select("user_id, ativo")
    .eq("user_id", data.user.id)
    .maybeSingle();

  let hasAccess = !access.error && Boolean(access.data?.ativo);

  // Compatibilidade durante o intervalo entre o deploy do código e a
  // aplicação da migration 0006, que adiciona a coluna `ativo`.
  if (access.error?.code === "42703") {
    const legacyAccess = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    hasAccess = !legacyAccess.error && Boolean(legacyAccess.data);
  }

  if (!hasAccess) {
    await supabase.auth.signOut();
    return { error: "Esta conta não tem acesso ao painel administrativo." };
  }

  redirect("/admin");
}
