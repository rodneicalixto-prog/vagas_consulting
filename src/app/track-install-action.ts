"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function registrarInstalacao(plataforma: string, userAgent: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  await admin.from("app_install_events").insert({
    user_id: user?.id ?? null,
    plataforma,
    user_agent: userAgent,
  });
}

export type RegistrarLeadState = { error: string | null; ok?: boolean };

export async function registrarLead(
  _prevState: RegistrarLeadState,
  formData: FormData,
): Promise<RegistrarLeadState> {
  const nomeCompleto = String(formData.get("nome_completo") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const idadeRaw = String(formData.get("idade") ?? "").trim();
  const latitudeRaw = String(formData.get("latitude") ?? "").trim();
  const longitudeRaw = String(formData.get("longitude") ?? "").trim();

  if (!nomeCompleto || !email || !telefone) {
    return { error: "Preencha nome, e-mail e telefone." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from("leads").insert({
    nome_completo: nomeCompleto,
    email,
    telefone,
    idade: idadeRaw ? Number(idadeRaw) : null,
    latitude: latitudeRaw ? Number(latitudeRaw) : null,
    longitude: longitudeRaw ? Number(longitudeRaw) : null,
    origem: "app_install",
    user_id: user?.id ?? null,
  });

  if (error) {
    return { error: "Não foi possível salvar seu cadastro. Tente de novo." };
  }

  return { error: null, ok: true };
}
