"use server";

import { redirect } from "next/navigation";
import { checkBotId } from "botid/server";
import { createClient } from "@/lib/supabase/server";

export async function enviarCandidatura(jobId: string, respostas: Record<string, boolean>) {
  const { isBot } = await checkBotId();
  if (isBot) {
    return { error: "Não foi possível enviar a candidatura. Tente novamente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("telefone, endereco, curriculo_url")
    .eq("id", user.id)
    .maybeSingle();

  const temCurriculo = Boolean(profile?.curriculo_url);
  const temDadosDeContato = Boolean(profile?.telefone?.trim() && profile?.endereco?.trim());

  if (!temCurriculo && !temDadosDeContato) {
    return {
      error:
        "Complete seu perfil (telefone e endereço) antes de se candidatar — sem currículo, é isso que a empresa recebe.",
    };
  }

  const { error } = await supabase.from("applications").insert({
    job_id: jobId,
    candidate_id: user.id,
    respostas,
    origem: "app_candidato",
  });

  if (error && error.code !== "23505") {
    // 23505 = já existe candidatura pra essa vaga (unique constraint) — trata como sucesso silencioso
    return { error: "Não foi possível enviar a candidatura. Tente novamente." };
  }

  return { error: null };
}
