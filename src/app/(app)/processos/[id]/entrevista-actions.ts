"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateFormData } from "@/lib/validation/validate-form";
import { RespostaEntrevistaSchema, type RespostaEntrevistaInput } from "@/lib/validation/schemas";

/**
 * O candidato confirma ou recusa a entrevista online proposta pela equipe.
 * Resultado volta por querystring (não por throw): erro lançado no servidor
 * chega ao navegador sem mensagem em produção.
 */
export async function responderEntrevistaOnline(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { entrevista_id: entrevistaId, application_id: applicationId, acao } =
    validateFormData<RespostaEntrevistaInput>(RespostaEntrevistaSchema, formData);

  const admin = createAdminClient();
  const { data: candidatura } = await admin
    .from("applications")
    .select("id, candidate_id, jobs(titulo)")
    .eq("id", applicationId)
    .maybeSingle();
  if (!candidatura || candidatura.candidate_id !== user.id) redirect(`/processos/${applicationId}?entrevista=indisponivel`);

  const { data: entrevista } = await admin
    .from("entrevistas_online")
    .select("id, status, data_hora, link, criada_por")
    .eq("id", entrevistaId)
    .eq("application_id", applicationId)
    .maybeSingle();
  if (!entrevista) redirect(`/processos/${applicationId}?entrevista=indisponivel`);
  if (entrevista.status !== "proposta") redirect(`/processos/${applicationId}?entrevista=ja-respondida`);

  const confirmou = acao === "confirmar";
  const agora = new Date().toISOString();

  // Confirmada: cria o compromisso na agenda da equipe (1 hora, responsável quem propôs).
  let compromissoId: string | null = null;
  if (confirmou) {
    const inicio = new Date(entrevista.data_hora);
    const { data: compromisso, error: erroCompromisso } = await admin
      .from("compromissos")
      .insert({
        tipo: "entrevista",
        titulo: `Entrevista online: ${candidatura.jobs?.titulo ?? "vaga"}`,
        descricao: entrevista.link,
        application_id: applicationId,
        responsavel_id: entrevista.criada_por,
        criado_por: entrevista.criada_por,
        inicio: inicio.toISOString(),
        fim: new Date(inicio.getTime() + 3600_000).toISOString(),
        status: "agendado",
      })
      .select("id")
      .single();
    if (erroCompromisso || !compromisso) redirect(`/processos/${applicationId}?entrevista=indisponivel`);
    compromissoId = compromisso.id;
  }

  const { data: atualizado } = await admin
    .from("entrevistas_online")
    .update({
      status: confirmou ? "confirmada" : "recusada",
      respondida_em: agora,
      updated_at: agora,
      compromisso_id: compromissoId,
    })
    .eq("id", entrevistaId)
    .eq("status", "proposta")
    .select("id");
  if (!atualizado || atualizado.length === 0) redirect(`/processos/${applicationId}?entrevista=ja-respondida`);

  await admin.from("application_notes").insert({
    application_id: applicationId,
    autor_id: user.id,
    nota: confirmou
      ? "Candidato confirmou a entrevista online."
      : "Candidato recusou a entrevista online. A equipe precisa propor outro horário.",
  });

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: confirmou ? "entrevista_online_confirmada" : "entrevista_online_recusada",
    objeto_tipo: "application",
    objeto_id: applicationId,
    depois: { entrevista_id: entrevistaId },
  });

  revalidatePath(`/processos/${applicationId}`);
  redirect(`/processos/${applicationId}?entrevista=${confirmou ? "confirmada" : "recusada"}`);
}
