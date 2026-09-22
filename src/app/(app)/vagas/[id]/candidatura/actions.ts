"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplyJobSchema, type ApplyJobInput } from "@/lib/validation/schemas";

export async function enviarCandidatura(jobId: string, respostas: Record<string, boolean>) {
  // Validar com Zod
  const validated = ApplyJobSchema.parse({ job_id: jobId, respostas });
  const { job_id: validatedJobId, respostas: validatedRespostas } = validated;

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
    job_id: validatedJobId,
    candidate_id: user.id,
    respostas: validatedRespostas,
    origem: "app_candidato",
  });

  if (error && error.code !== "23505") {
    // 23505 = já existe candidatura pra essa vaga (unique constraint) — trata como sucesso silencioso
    return { error: "Não foi possível enviar a candidatura. Tente novamente." };
  }

  return { error: null };
}
