"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * "Voltar" do primeiro passo do cadastro: a pessoa já está autenticada, então
 * voltar para /login a devolveria ao cadastro (o proxy a redireciona de
 * volta). Sair da conta é o retorno real à tela inicial.
 */
export async function sairDoCadastro() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

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
    { finalidade: "alertas_vagas", canal: "telegram" },
  ];

  // Telegram exige identificar o titular: @usuário (5-32) ou ID numérico.
  const quer = formData.get("canal_telegram") === "on";
  const idTelegram = String(formData.get("telegram_id") ?? "").trim();
  const idValido = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(idTelegram) || /^\d{5,15}$/.test(idTelegram);
  if (quer && !idValido) redirect("/termos?erro=telegram");

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
      identificador: canal === "telegram" && quer ? idTelegram : null,
      versao_texto: "v1.0",
      origem: "onboarding",
    })),
  ];

  await supabase.from("consents").insert(rows);

  redirect("/onboarding");
}
