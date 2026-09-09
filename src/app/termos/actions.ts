"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveConsentsAndContinue(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const canais: { finalidade: string; canal: string }[] = [
    { finalidade: "alertas_vagas", canal: "whatsapp" },
    { finalidade: "alertas_vagas", canal: "email" },
    { finalidade: "alertas_vagas", canal: "sms" },
  ];

  const rows = [
    {
      user_id: user.id,
      finalidade: "termos_uso",
      canal: null,
      estado: "concedido",
      versao_texto: "v1.0",
      origem: "onboarding",
    },
    {
      user_id: user.id,
      finalidade: "aviso_privacidade",
      canal: null,
      estado: "ciente",
      versao_texto: "v1.0",
      origem: "onboarding",
    },
    ...canais.map(({ finalidade, canal }) => ({
      user_id: user.id,
      finalidade,
      canal,
      estado: formData.get(`canal_${canal}`) === "on" ? "concedido" : "revogado",
      versao_texto: "v1.0",
      origem: "onboarding",
    })),
  ];

  await supabase.from("consents").insert(rows);

  redirect("/onboarding");
}
