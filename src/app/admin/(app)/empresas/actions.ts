"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { validateFormData } from "@/lib/validation/validate-form";
import { CreateCompanySchema, DecideCompanySchema, CreateCompanyInput, DecideCompanyInput } from "@/lib/validation/schemas";
import { logAudit, logDelete } from "@/lib/security/audit";

export async function criarEmpresa(formData: FormData) {
  const { user } = await requireInternalUser("companies.manage");

  const input = validateFormData<CreateCompanyInput>(CreateCompanySchema, formData);
  const cnpj = input.cnpj?.replace(/\D/g, "") || null;

  const admin = createAdminClient();
  const { data: company, error } = await admin
    .from("companies")
    .insert({
      razao_social: input.razao_social,
      nome_fantasia: input.nome_fantasia || null,
      cnpj,
      endereco: input.endereco || null,
      status: "aprovada",
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !company) throw new Error("Não foi possível cadastrar a empresa.");

  await logAudit({
    ator_id: user.id,
    acao: "empresa_criada_internamente",
    objeto_tipo: "company",
    objeto_id: company.id,
    depois: company,
  });

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
}

export async function decidirEmpresa(formData: FormData) {
  const { user } = await requireInternalUser("companies.manage");

  const input = validateFormData<DecideCompanyInput>(DecideCompanySchema, formData);

  const admin = createAdminClient();
  const { data: before } = await admin.from("companies").select("*").eq("id", input.company_id).single();

  const status = input.acao === "aprovar" ? "aprovada" : input.acao === "rejeitar" ? "bloqueada" : "ajustes";

  const { data: after, error } = await admin
    .from("companies")
    .update({
      status,
      motivo_decisao: input.motivo || null,
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
    })
    .eq("id", input.company_id)
    .select()
    .single();

  if (error || !after) {
    throw new Error("Não foi possível atualizar a empresa. Tente de novo.");
  }

  await logAudit({
    ator_id: user.id,
    acao: `empresa_${input.acao}`,
    objeto_tipo: "company",
    objeto_id: input.company_id,
    antes: before,
    depois: after,
  });

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
}
