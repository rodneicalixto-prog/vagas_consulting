"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function enviarCandidatura(jobId: string, respostas: Record<string, boolean>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
