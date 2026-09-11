"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

export async function salvarPreferencias(
  modeloTrabalho: Enums<"modelo_trabalho">[],
  modalidades: Enums<"modalidade_vaga">[],
  disponibilidade: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Só atualiza estes 3 campos — nunca toca em dados pessoais, experiências
  // ou currículo já preenchidos em outras telas.
  const { error } = await supabase
    .from("profiles")
    .update({
      modelo_trabalho: modeloTrabalho,
      modalidades_desejadas: modalidades,
      disponibilidade,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error("Não foi possível salvar. Tente de novo.");
  }

  revalidatePath("/perfil");
  redirect("/perfil");
}
