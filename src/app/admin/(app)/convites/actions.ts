"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { validateFormData } from "@/lib/validation/validate-form";
import {
  CreateInviteSchema,
  DecideInviteSchema,
  type CreateInviteInput,
  type DecideInviteInput,
} from "@/lib/validation/schemas";
import { logAudit } from "@/lib/security/audit";

export async function criarConvite(formData: FormData) {
  const { user } = await requireInternalUser("pipeline.manage");
  const { candidate_id: candidateId, job_id: jobId, validade_horas: horas } =
    validateFormData<CreateInviteInput>(CreateInviteSchema, formData);

  const admin = createAdminClient();

  const [{ data: candidato }, { data: vaga }] = await Promise.all([
    admin.from("profiles").select("id, blacklisted").eq("id", candidateId).maybeSingle(),
    admin.from("jobs").select("id, status, modalidade").eq("id", jobId).maybeSingle(),
  ]);

  if (!candidato) throw new Error("Candidato não encontrado.");
  if (candidato.blacklisted) throw new Error("Candidato está na black list e não pode receber convite.");
  if (!vaga || vaga.status !== "publicada") throw new Error("A vaga precisa estar publicada.");
  if (vaga.modalidade !== "temporaria") throw new Error("Convite direto vale apenas para vaga temporária.");

  const { data: existente } = await admin
    .from("invites")
    .select("id")
    .eq("candidate_id", candidateId)
    .eq("job_id", jobId)
    .in("status", ["ofertado", "visualizado", "aceito", "confirmado", "em_execucao"])
    .maybeSingle();
  if (existente) throw new Error("Este candidato já tem um convite ativo para esta vaga.");

  const validade = new Date(Date.now() + horas * 3600_000).toISOString();
  const { data: convite, error } = await admin
    .from("invites")
    .insert({ candidate_id: candidateId, job_id: jobId, status: "ofertado", validade })
    .select("id")
    .single();
  if (error || !convite) throw new Error("Não foi possível criar o convite.");

  await logAudit({
    ator_id: user.id,
    acao: "convite_criado",
    objeto_tipo: "invite",
    objeto_id: convite.id,
    depois: { candidate_id: candidateId, job_id: jobId, validade },
  });

  revalidatePath("/admin/convites");
}

export async function decidirConvite(formData: FormData) {
  const { user } = await requireInternalUser("pipeline.manage");
  const { invite_id: inviteId, acao } = validateFormData<DecideInviteInput>(DecideInviteSchema, formData);

  const admin = createAdminClient();
  const { data: antes } = await admin.from("invites").select("id, status").eq("id", inviteId).maybeSingle();
  if (!antes) throw new Error("Convite não encontrado.");

  // Transições permitidas pela operação:
  //   aceito -> confirmado   |   ofertado/visualizado/aceito/confirmado -> cancelado
  const permitido =
    acao === "confirmar"
      ? antes.status === "aceito"
      : ["ofertado", "visualizado", "aceito", "confirmado"].includes(antes.status);
  if (!permitido) throw new Error("Esta ação não vale para o estado atual do convite.");

  const novo = acao === "confirmar" ? "confirmado" : "cancelado";
  const { error } = await admin.from("invites").update({ status: novo }).eq("id", inviteId).eq("status", antes.status);
  if (error) throw new Error("Não foi possível atualizar o convite.");

  await logAudit({
    ator_id: user.id,
    acao: acao === "confirmar" ? "convite_confirmado" : "convite_cancelado",
    objeto_tipo: "invite",
    objeto_id: inviteId,
    antes: { status: antes.status },
    depois: { status: novo },
  });

  revalidatePath("/admin/convites");
}
