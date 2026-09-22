"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SetConsentSchema, type SetConsentInput } from "@/lib/validation/schemas";

export async function setConsent(
  finalidade: string,
  canal: string | null,
  concedido: boolean,
) {
  // Validar com Zod
  const validated = SetConsentSchema.parse({ finalidade, canal, concedido });
  const { finalidade: validatedFinalidade, canal: validatedCanal, concedido: validatedConcedido } = validated;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("consents").insert({
    user_id: user.id,
    finalidade: validatedFinalidade,
    canal: validatedCanal,
    estado: validatedConcedido ? "concedido" : "revogado",
    versao_texto: "v1.0",
    origem: "perfil",
  });

  revalidatePath("/perfil");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
