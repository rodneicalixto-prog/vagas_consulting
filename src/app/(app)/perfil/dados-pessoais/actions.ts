"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function atualizarDadosPessoais(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nomeCompleto = String(formData.get("nome_completo") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!nomeCompleto || !cidade || !telefone || !endereco) {
    throw new Error("Nome, cidade, telefone e endereço são obrigatórios.");
  }

  // Só atualiza estes 4 campos — nunca toca em experiências, modalidades ou
  // histórico de terceirizadoras já preenchidos em outras telas.
  const { error } = await supabase
    .from("profiles")
    .update({ nome_completo: nomeCompleto, cidade, telefone, endereco })
    .eq("id", user.id);

  if (error) {
    throw new Error("Não foi possível salvar. Tente de novo.");
  }

  revalidatePath("/perfil");
  redirect("/perfil");
}
