"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TIPOS_ACEITOS = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5MB

export async function obterUrlAssinadaCurriculo(): Promise<
  { url: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("curriculo_url")
    .eq("id", user.id)
    .maybeSingle();

  const path = profile?.curriculo_url;
  // path vem do banco (não do cliente), mas mesmo assim confirmamos que aponta
  // pra dentro da própria pasta do usuário antes de gerar o link assinado.
  if (!path || !path.startsWith(`${user.id}/`) || path.includes("..")) {
    return { error: "Nenhum documento encontrado." };
  }

  const { data, error } = await supabase.storage
    .from("curriculos")
    .createSignedUrl(path, 60 * 5);

  if (error || !data?.signedUrl) {
    return { error: "Não foi possível gerar o link do documento." };
  }

  return { url: data.signedUrl };
}

export async function substituirDocumento(file: File): Promise<{ error?: string }> {
  if (!TIPOS_ACEITOS.has(file.type)) {
    return { error: "Envie um PDF, PNG, JPG ou WEBP." };
  }
  if (file.size > TAMANHO_MAXIMO_BYTES) {
    return { error: "Arquivo muito grande (máximo 5MB)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const buffer = Buffer.from(await file.arrayBuffer());
  const nomeSeguro = file.name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "");
  const caminho = `${user.id}/${Date.now()}-${nomeSeguro}`;

  const { error: uploadError } = await supabase.storage
    .from("curriculos")
    .upload(caminho, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: "Não foi possível salvar o arquivo. Tente de novo." };
  }

  // caminho é gerado aqui mesmo com o user.id do usuário autenticado, mas
  // ainda validamos o prefixo antes de gravar — mesmo cuidado anti-IDOR usado
  // em experiencias/actions.ts, pra nunca gravar um path fora da própria pasta.
  const caminhoValido =
    caminho.startsWith(`${user.id}/`) && !caminho.includes("..") ? caminho : undefined;

  if (!caminhoValido) {
    return { error: "Não foi possível salvar o arquivo. Tente de novo." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ curriculo_url: caminhoValido })
    .eq("id", user.id);

  if (error) {
    return { error: "Não foi possível salvar. Tente de novo." };
  }

  revalidatePath("/perfil/documentos");
  return {};
}
