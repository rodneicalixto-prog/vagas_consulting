"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { candidatosVisiveis, obterEscopo } from "@/lib/auth/escopo";
import { normalizarTelefoneBR } from "@/lib/whatsapp";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Empresa do admin da empresa, derivada da sessão (nunca do formulário). */
async function contexto() {
  const { user, role } = await requireInternalUser("blacklist.empresa");
  const admin = createAdminClient();
  const { data } = await admin
    .from("company_assignments")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("papel", "admin_empresa")
    .eq("ativo", true)
    .limit(1);
  const companyId = data?.[0]?.company_id as string | undefined;
  if (!companyId) throw new Error("Você não é administrador de nenhuma empresa.");
  return { user, role, admin, companyId };
}

/**
 * Cadastra um candidato problemático na black list DA EMPRESA.
 * Informe um candidato já cadastrado (candidate_id) e/ou um telefone: com
 * telefone, o bloqueio vale mesmo se a pessoa ainda não se cadastrou.
 */
export async function bloquearNaEmpresa(formData: FormData) {
  const { user, role, admin, companyId } = await contexto();

  const candidatoBruto = String(formData.get("candidate_id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim().slice(0, 120);
  const telefoneBruto = String(formData.get("telefone") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();

  if (motivo.length < 3) throw new Error("Informe o motivo do bloqueio.");
  if (motivo.length > 500) throw new Error("O motivo é longo demais (máximo 500 caracteres).");

  let candidateId: string | null = null;
  if (candidatoBruto) {
    if (!UUID.test(candidatoBruto)) throw new Error("Candidato inválido.");
    // Só quem aparece para a empresa (candidatura ou convite em vaga dela).
    const escopo = await obterEscopo(user.id, role);
    const visiveis = await candidatosVisiveis(escopo);
    if (visiveis && !visiveis.includes(candidatoBruto)) {
      throw new Error("Este candidato não está entre os candidatos da sua empresa.");
    }
    candidateId = candidatoBruto;
  }

  let telefone: string | null = null;
  if (telefoneBruto) {
    telefone = normalizarTelefoneBR(telefoneBruto);
    if (!telefone) throw new Error("Telefone inválido. Use o formato com DDD, ex.: (11) 99999-9999.");
  }

  if (!candidateId && !telefone) {
    throw new Error("Escolha um candidato da lista ou informe o telefone da pessoa.");
  }

  const { data: linha, error } = await admin
    .from("company_blacklist")
    .insert({
      company_id: companyId,
      candidate_id: candidateId,
      nome_informado: nome || null,
      telefone_normalizado: telefone,
      motivo,
      criado_por: user.id,
    })
    .select("id");

  if (error?.code === "23505") throw new Error("Esta pessoa já está na black list da empresa.");
  if (error || !linha || linha.length === 0) throw new Error("Não foi possível cadastrar na black list.");

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "blacklist_empresa_adicionado",
    objeto_tipo: "company_blacklist",
    objeto_id: linha[0].id,
    depois: { company_id: companyId, candidate_id: candidateId, telefone_informado: !!telefone, motivo },
  });
  revalidatePath("/admin/blacklist");
}

/** Libera a pessoa da black list da empresa (o histórico permanece). */
export async function liberarNaEmpresa(formData: FormData) {
  const { user, admin, companyId } = await contexto();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) throw new Error("Registro inválido.");

  const { data, error } = await admin
    .from("company_blacklist")
    .update({ ativo: false, removido_por: user.id, removido_em: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId)
    .eq("ativo", true)
    .select("id");
  if (error || !data || data.length === 0) throw new Error("Registro não encontrado.");

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "blacklist_empresa_removido",
    objeto_tipo: "company_blacklist",
    objeto_id: id,
    depois: { company_id: companyId, ativo: false },
  });
  revalidatePath("/admin/blacklist");
}
