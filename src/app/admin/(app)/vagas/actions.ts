"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirEmpresa, exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { validateFormData } from "@/lib/validation/validate-form";
import { CreateJobSchema, DecideJobSchema, type CreateJobInput, type DecideJobInput } from "@/lib/validation/schemas";

export async function criarVaga(formData: FormData) {
  const { user, role } = await requireInternalUser("jobs.manage");

  // Validar com Zod
  const validated = validateFormData<CreateJobInput>(CreateJobSchema, formData);

  // Carteira: o operador só cadastra vaga em empresa atribuída e ativa.
  const escopo = await obterEscopo(user.id, role);
  exigirEmpresa(escopo, validated.company_id);
  if (!escopo.todos) {
    const { data: empresa } = await createAdminClient()
      .from("companies")
      .select("status")
      .eq("id", validated.company_id)
      .maybeSingle();
    if (empresa?.status !== "aprovada") {
      throw new Error("A empresa precisa estar aprovada para cadastrar vagas.");
    }
  }
  // Admin, superadmin e admin da empresa marcam vaga como confidencial.
  const confidencial = role !== "operador" && formData.get("confidencial") === "on";

  const { company_id: companyId, titulo, modalidade, local, descricao, requisitos, remuneracao_texto: remuneracao } = validated;

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
      confidencial,
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

/**
 * Marca/desmarca vaga confidencial. Admin, superadmin e admin da empresa
 * (este só nas vagas da própria empresa, garantido por exigirVaga).
 */
export async function alternarConfidencial(formData: FormData) {
  const { user, role } = await requireInternalUser("jobs.manage");
  if (role === "operador") redirect("/admin/acesso-negado");
  const jobId = String(formData.get("job_id") ?? "");
  const valor = formData.get("valor") === "true";
  if (!/^[0-9a-f-]{36}$/.test(jobId)) throw new Error("Vaga inválida.");

  const escopo = await obterEscopo(user.id, role);
  const vaga = await exigirVaga(escopo, jobId);

  const admin = createAdminClient();
  const { data: atualizada, error } = await admin
    .from("jobs")
    .update({ confidencial: valor })
    .eq("id", jobId)
    .select("id");
  if (error || !atualizada || atualizada.length === 0) {
    throw new Error("Não foi possível alterar a confidencialidade.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: valor ? "vaga_marcada_confidencial" : "vaga_desmarcada_confidencial",
    objeto_tipo: "job",
    objeto_id: jobId,
    antes: { confidencial: vaga.confidencial },
    depois: { confidencial: valor },
  });

  revalidatePath("/admin/vagas");
}

export async function decidirVaga(formData: FormData) {
  // Validar com Zod
  const validated = validateFormData<DecideJobInput>(DecideJobSchema, formData);
  const { job_id: jobId, acao, motivo } = validated;

  const { user, role } = await requireInternalUser(acao === "publicar" ? "jobs.publish" : "jobs.manage");

  // Carteira: a vaga precisa estar no escopo (e visível, se confidencial).
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, jobId);

  const admin = createAdminClient();
  const { data: before } = await admin.from("jobs").select("*").eq("id", jobId).single();

  // Vaga já publicada só sai do ar por admin/superadmin (decisão do Rodnei).
  if (before?.status === "publicada" && acao !== "publicar") {
    await requireInternalUser("jobs.publish");
  }

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
