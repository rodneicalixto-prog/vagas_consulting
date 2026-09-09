"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

export async function moverCandidatura(formData: FormData) {
  const supabase = await createClient();
  const applicationId = String(formData.get("application_id"));
  const jobId = String(formData.get("job_id"));
  const status = String(formData.get("status")) as Enums<"status_candidatura">;

  await supabase.from("applications").update({ status }).eq("id", applicationId);
  revalidatePath(`/portal/vagas/${jobId}`);
}

export async function adicionarNota(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const applicationId = String(formData.get("application_id"));
  const jobId = String(formData.get("job_id"));
  const nota = String(formData.get("nota") ?? "").trim();
  if (!nota) return;

  await supabase
    .from("application_notes")
    .insert({ application_id: applicationId, autor_id: user.id, nota });
  revalidatePath(`/portal/vagas/${jobId}`);
}
