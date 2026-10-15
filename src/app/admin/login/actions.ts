"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient as createClientImplicito } from "@supabase/supabase-js";
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

export type EstadoLinkSenha = { enviado: boolean; erro: string | null };

/**
 * Primeiro acesso / esqueci a senha: envia o link por e-mail. A resposta é
 * sempre a mesma, exista ou não a conta (não revela quem tem cadastro).
 */
export async function enviarLinkDeSenha(
  _anterior: EstadoLinkSenha,
  formData: FormData,
): Promise<EstadoLinkSenha> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
    return { enviado: false, erro: "Informe um e-mail válido." };
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return { enviado: false, erro: "Não foi possível enviar agora. Tente de novo." };
  const protocolo = host.startsWith("localhost") ? "http" : "https";

  // Fluxo implícito: o link funciona em qualquer navegador/aparelho.
  const supabase = createClientImplicito(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } },
  );
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocolo}://${host}/admin/definir-senha`,
  });
  return { enviado: true, erro: null };
}
