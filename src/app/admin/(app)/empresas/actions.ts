"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

export async function criarEmpresa(formData: FormData) {
  const { user } = await requireInternalUser("companies.manage");
  const razaoSocial = String(formData.get("razao_social") ?? "").trim();
  const nomeFantasia = String(formData.get("nome_fantasia") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").replace(/\D/g, "");
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (razaoSocial.length < 2) throw new Error("Informe a razão social.");
  if (cnpj && cnpj.length !== 14) throw new Error("O CNPJ deve conter 14 dígitos.");

  const admin = createAdminClient();
  const { data: company, error } = await admin
    .from("companies")
    .insert({
      razao_social: razaoSocial,
      nome_fantasia: nomeFantasia || null,
      cnpj: cnpj || null,
      endereco: endereco || null,
      status: "aprovada",
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !company) throw new Error("Não foi possível cadastrar a empresa.");

  const { error: auditError } = await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "empresa_criada_internamente",
    objeto_tipo: "company",
    objeto_id: company.id,
    depois: company,
  });
  if (auditError) throw new Error("Empresa criada, mas a auditoria falhou.");

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
}

export async function decidirEmpresa(formData: FormData) {
  const { user } = await requireInternalUser("companies.manage");
  const companyId = String(formData.get("company_id"));
  const acao = String(formData.get("acao")); // "aprovar" | "rejeitar" | "corrigir"
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (!["aprovar", "rejeitar", "corrigir"].includes(acao)) {
    throw new Error("Ação inválida.");
  }

  const admin = createAdminClient();
  const { data: before } = await admin.from("companies").select("*").eq("id", companyId).single();

  const status = acao === "aprovar" ? "aprovada" : acao === "rejeitar" ? "bloqueada" : "ajustes";

  const { data: after, error } = await admin
    .from("companies")
    .update({
      status,
      motivo_decisao: motivo || null,
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
    })
    .eq("id", companyId)
    .select()
    .single();

  if (error || !after) {
    throw new Error("Não foi possível atualizar a empresa. Tente de novo.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: `empresa_${acao}`,
    objeto_tipo: "company",
    objeto_id: companyId,
    antes: before,
    depois: after,
  });

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
}
