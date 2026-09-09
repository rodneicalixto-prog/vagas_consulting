"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PortalAuthState = { error: string | null };

export async function portalLogin(
  _prevState: PortalAuthState,
  formData: FormData,
): Promise<PortalAuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "E-mail ou senha incorretos." };
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    await supabase.auth.signOut();
    return { error: "Esta conta não tem acesso ao portal da empresa." };
  }

  redirect("/portal/dashboard");
}
