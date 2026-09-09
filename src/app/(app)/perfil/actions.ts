"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setConsent(
  finalidade: string,
  canal: string | null,
  concedido: boolean,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("consents").insert({
    user_id: user.id,
    finalidade,
    canal,
    estado: concedido ? "concedido" : "revogado",
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
