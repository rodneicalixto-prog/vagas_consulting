"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

export async function criarVaga(formData: FormData) {
  const { user } = await requireInternalUser("jobs.manage");
  const companyId = String(formData.get("company_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const modalidade = String(formData.get("modalidade") ?? "");
  const local = String(formData.get("local") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const requisitos = String(formData.get("requisitos") ?? "").trim();
  const remuneracao = String(formData.get("remuneracao_texto") ?? "").trim();

  if (!companyId || titulo.length < 2 || !["efetiva", "pj", "temporaria"].includes(modalidade)) {
    throw new Error("Preencha empresa, título e modalidade com valores válidos.");
  }

  const admin = createAdminClient();
  const { data: job, error } = await admin
    .from("jobs")
    .insert({
      company_id: companyId,
      titulo,
      modalidade: modalidade as "efetiva" | "pj" | "temporaria",
      local: local || null,
      descricao: descricao || null,
      requisitos: requisitos || null,
      remuneracao_texto: remuneracao || null,
      status: "rascunho",
      responsavel_id: user.id,
    })
    .select()
    .single();

  if (error || !job) throw new Error("Não foi possível cadastrar a vaga.");

  const { error: auditError } = await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "vaga_criada_internamente",
    objeto_tipo: "job",
    objeto_id: job.id,
    depois: job,
  });
  if (auditError) throw new Error("Vaga criada, mas a auditoria falhou.");

  revalidatePath("/admin/vagas");
  revalidatePath("/admin");
}

export async function decidirVaga(formData: FormData) {
  const jobId = String(formData.get("job_id"));
  const acao = String(formData.get("acao"));
  const { user } = await requireInternalUser(acao === "publicar" ? "jobs.publish" : "jobs.manage");
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!["publicar", "encerrar", "corrigir"].includes(acao)) {
    throw new Error("Ação inválida.");
  }

  const admin = createAdminClient();
  const { data: before } = await admin.from("jobs").select("*").eq("id", jobId).single();

  const status = acao === "publicar" ? "publicada" : acao === "encerrar" ? "encerrada" : "rascunho";

  const { data: after, error } = await admin
    .from("jobs")
    .update({
      status,
      motivo_decisao: motivo || null,
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
      publicada_em: acao === "publicar" ? new Date().toISOString() : undefined,
    })
    .eq("id", jobId)
    .select()
    .single();

  if (error || !after) {
    throw new Error("Não foi possível atualizar a vaga. Tente de novo.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: `vaga_${acao}`,
    objeto_tipo: "job",
    objeto_id: jobId,
    antes: before,
    depois: after,
  });

  revalidatePath("/admin/vagas");
  revalidatePath("/admin");
}
