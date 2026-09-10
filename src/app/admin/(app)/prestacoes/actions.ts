"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

export async function criarPrestacao(formData: FormData) {
  const { user } = await requireInternalUser("pipeline.manage");

  const applicationId = String(formData.get("application_id"));
  const dataInicio = String(formData.get("data_inicio"));
  const valorRaw = String(formData.get("valor") ?? "").trim();
  const periodicidade = String(formData.get("periodicidade") ?? "").trim();

  const admin = createAdminClient();
  const { data: application, error: appError } = await admin
    .from("applications")
    .select("id, candidate_id, jobs(id, company_id, modalidade)")
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    throw new Error("Candidatura não encontrada.");
  }

  const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs;
  if (!job) throw new Error("Vaga da candidatura não encontrada.");

  const { error } = await admin.from("service_engagements").insert({
    application_id: application.id,
    candidate_id: application.candidate_id,
    job_id: job.id,
    company_id: job.company_id,
    modalidade: job.modalidade,
    data_inicio: dataInicio,
    valor: valorRaw ? Number(valorRaw) : null,
    periodicidade: periodicidade || null,
    criado_por: user.id,
  });

  if (error) {
    throw new Error("Não foi possível criar a prestação de serviço. Tente de novo.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "prestacao_criada",
    objeto_tipo: "service_engagement",
    objeto_id: applicationId,
  });

  revalidatePath("/admin/prestacoes");
}

export async function atualizarPagamento(formData: FormData) {
  const { user } = await requireInternalUser("pipeline.manage");

  const id = String(formData.get("id"));
  const status_pagamento = String(formData.get("status_pagamento"));
  const dataFim = String(formData.get("data_fim") ?? "").trim();

  const admin = createAdminClient();
  const { error } = await admin
    .from("service_engagements")
    .update({
      status_pagamento: status_pagamento as "pendente" | "pago" | "parcial" | "atrasado",
      data_fim: dataFim || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível atualizar a prestação de serviço. Tente de novo.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "prestacao_atualizada",
    objeto_tipo: "service_engagement",
    objeto_id: id,
    depois: { status_pagamento, data_fim: dataFim || null },
  });

  revalidatePath("/admin/prestacoes");
}
