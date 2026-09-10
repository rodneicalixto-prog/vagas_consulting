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
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const hasAccess =
    !access.error &&
    access.data !== null &&
    (!("ativo" in access.data) || access.data.ativo !== false);

  if (!hasAccess) {
    await supabase.auth.signOut();
    return { error: "Esta conta não tem acesso ao painel administrativo." };
  }

  redirect("/admin");
}
