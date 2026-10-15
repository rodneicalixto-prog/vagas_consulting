"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { validateFormData } from "@/lib/validation/validate-form";
import {
  CreateCompanySchema,
  DecideCompanySchema,
  UpdateCompanySchema,
  type CreateCompanyInput,
  type DecideCompanyInput,
  type UpdateCompanyInput,
} from "@/lib/validation/schemas";
import { montarEndereco, normalizarCep, telefoneOpcional, ufValida } from "@/lib/empresas";
import { logAudit, logDelete } from "@/lib/security/audit";

type Contato = Omit<CreateCompanyInput, "razao_social" | "nome_fantasia" | "cnpj" | "endereco">;

const vazio = (v: string | null | undefined) => (v ?? "").trim() || null;

/** Normaliza e valida telefone, CEP e UF; monta o endereço completo. */
function camposDeContato(i: Contato) {
  const telefone = telefoneOpcional(i.telefone);
  if (telefone === undefined) throw new Error("Telefone da empresa inválido. Use o DDD, ex.: (11) 3000-0000.");
  const telResp = telefoneOpcional(i.responsavel_telefone);
  if (telResp === undefined) throw new Error("Telefone do responsável inválido. Use o DDD, ex.: (11) 90000-0000.");

  const cepBruto = vazio(i.cep);
  const cep = cepBruto ? normalizarCep(cepBruto) : null;
  if (cepBruto && !cep) throw new Error("CEP inválido: informe os 8 dígitos.");

  const uf = vazio(i.uf)?.toUpperCase() ?? null;
  if (uf && !ufValida(uf)) throw new Error("UF inválida.");

  const email = vazio(i.email_contato);
  const emailResp = vazio(i.responsavel_email);
  const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (email && !reEmail.test(email)) throw new Error("E-mail da empresa inválido.");
  if (emailResp && !reEmail.test(emailResp)) throw new Error("E-mail do responsável inválido.");

  const estrutura = {
    cep,
    logradouro: vazio(i.logradouro),
    numero: vazio(i.numero),
    complemento: vazio(i.complemento),
    bairro: vazio(i.bairro),
    cidade: vazio(i.cidade),
    uf,
  };
  return {
    telefone,
    email_contato: email,
    ...estrutura,
    endereco: montarEndereco(estrutura),
    responsavel_nome: i.responsavel_nome.trim(),
    responsavel_cargo: vazio(i.responsavel_cargo),
    responsavel_telefone: telResp,
    responsavel_email: emailResp,
  };
}

export async function criarEmpresa(formData: FormData) {
  const { user } = await requireInternalUser("companies.approve");

  const input = validateFormData<CreateCompanyInput>(CreateCompanySchema, formData);
  const cnpj = input.cnpj?.replace(/\D/g, "") || null;

  const admin = createAdminClient();
  const { data: company, error } = await admin
    .from("companies")
    .insert({
      razao_social: input.razao_social,
      nome_fantasia: input.nome_fantasia || null,
      cnpj,
      ...camposDeContato(input),
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

/** Atualiza dados, endereço e responsável da empresa. */
export async function atualizarEmpresa(formData: FormData) {
  const { user } = await requireInternalUser("companies.approve");
  const input = validateFormData<UpdateCompanyInput>(UpdateCompanySchema, formData);
  const cnpj = input.cnpj?.replace(/\D/g, "") || null;

  const admin = createAdminClient();
  const { data: before } = await admin.from("companies").select("*").eq("id", input.company_id).single();
  if (!before) throw new Error("Empresa não encontrada.");

  const { data: after, error } = await admin
    .from("companies")
    .update({
      razao_social: input.razao_social,
      nome_fantasia: input.nome_fantasia?.trim() || null,
      cnpj,
      ...camposDeContato(input),
    })
    .eq("id", input.company_id)
    .select()
    .single();
  if (error || !after) throw new Error("Não foi possível salvar os dados da empresa.");

  await logAudit({
    ator_id: user.id,
    acao: "empresa_dados_atualizados",
    objeto_tipo: "company",
    objeto_id: input.company_id,
    antes: before,
    depois: after,
  });

  revalidatePath("/admin/empresas");
}

export async function decidirEmpresa(formData: FormData) {
  const { user } = await requireInternalUser("companies.approve");

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
