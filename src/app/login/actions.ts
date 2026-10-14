"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizarDestino } from "@/lib/destino";
import { consumirDestino, guardarDestino } from "@/lib/destino-cookie";

export type AuthState = { error: string | null; info?: string };

export async function login(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  // Volta para a vaga (ou página) de onde a pessoa veio, se houver.
  const destino = sanitizarDestino(formData.get("next")) ?? (await consumirDestino());
  redirect(destino ?? "/inicio");
}

export async function signup(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  // Lembra a vaga escolhida durante o cadastro (termos, perfil, currículo).
  await guardarDestino(formData.get("next"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message === "User already registered"
      ? "Já existe uma conta com esse e-mail."
      : "Não foi possível criar a conta. Tente de novo." };
  }

  if (!data.session) {
    return {
      error: null,
      info: "Conta criada. Confirme seu e-mail (verifique também o spam) e depois entre com Login.",
    };
  }

  redirect("/termos");
}
