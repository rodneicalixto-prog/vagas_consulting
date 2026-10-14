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
  const idadeBruta = String(formData.get("idade") ?? "").trim();
  const idadeNumero = idadeBruta ? Number(idadeBruta) : null;
  if (idadeNumero !== null && (!Number.isInteger(idadeNumero) || idadeNumero < 14 || idadeNumero > 100)) {
    throw new Error("Informe uma idade entre 14 e 100 anos.");
  }

  if (!nomeCompleto || !cidade || !telefone || !endereco) {
    throw new Error("Nome, cidade, telefone e endereço são obrigatórios.");
  }

  // Só atualiza estes 4 campos — nunca toca em experiências, modalidades ou
  // histórico de terceirizadoras já preenchidos em outras telas.
  const { data: atualizado, error } = await supabase
    .from("profiles")
    .update({ nome_completo: nomeCompleto, cidade, telefone, endereco, idade: idadeNumero })
    .eq("id", user.id)
    .select("id");

  if (error) {
    throw new Error("Não foi possível salvar. Tente de novo.");
  }
  // UPDATE em perfil inexistente não dá erro e não grava nada: manda para o
  // cadastro, que cria o perfil.
  if (!atualizado || atualizado.length === 0) redirect("/onboarding");

  revalidatePath("/perfil");
  redirect("/perfil");
}
