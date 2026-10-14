"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { validateFormData } from "@/lib/validation/validate-form";
import { InviteAdminSchema, type InviteAdminInput } from "@/lib/validation/schemas";
import { erroLimiteExcedido } from "@/lib/operadores";

export type ConvidarState = { error: string | null; info?: string };

export type EmpresaOpcao = { id: string; nome: string };

/** Empresas aprovadas para o select do convite de admin da empresa. Só quem gerencia usuários. */
export async function listarEmpresasAprovadas(): Promise<EmpresaOpcao[]> {
  await requireInternalUser("users.manage");
  const admin = createAdminClient();
  const { data } = await admin
    .from("companies")
    .select("id, razao_social, nome_fantasia")
    .eq("status", "aprovada")
    .order("razao_social");
  return (data ?? []).map((e) => ({ id: e.id, nome: e.nome_fantasia ?? e.razao_social }));
}

export async function convidarAdmin(
  _prevState: ConvidarState,
  formData: FormData,
): Promise<ConvidarState> {
  const { user } = await requireInternalUser("users.manage");

  // Validar com Zod
  try {
    const validated = validateFormData<InviteAdminInput>(InviteAdminSchema, formData);
    const { email, perfil, nome, telefone } = validated;
    const ehAdminEmpresa = perfil === "admin_empresa";
    const companyId = ehAdminEmpresa ? (validated.company_id ?? "") : "";

    const admin = createAdminClient();

    if (ehAdminEmpresa) {
      // A empresa precisa existir e estar aprovada.
      const { data: empresa } = await admin
        .from("companies")
        .select("id")
        .eq("id", companyId)
        .eq("status", "aprovada")
        .maybeSingle();
      if (!empresa) {
        return { error: "Empresa não encontrada ou não aprovada." };
      }
    }

    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email);

    if (error || !invited.user) {
      return { error: "Não foi possível convidar. Verifique o e-mail e tente de novo." };
    }

    if (ehAdminEmpresa) {
      // Uma pessoa, um admin de empresa ativo (índice único; checagem amigável antes).
      const { data: jaAdmin } = await admin
        .from("company_assignments")
        .select("id")
        .eq("user_id", invited.user.id)
        .eq("papel", "admin_empresa")
        .eq("ativo", true)
        .limit(1);
      if (jaAdmin && jaAdmin.length > 0) {
        return { error: "Esta pessoa já é admin de uma empresa. Cada pessoa administra uma empresa." };
      }
    }

    // O admin da empresa é um operador com atribuição de papel admin_empresa.
    const { error: insertError } = await admin.from("admin_users").insert({
      user_id: invited.user.id,
      perfil: ehAdminEmpresa ? "operador" : perfil,
      nome_exibicao: nome || null,
      telefone: telefone || null,
    });

    if (insertError) {
      return {
        error: "Convite enviado, mas não foi possível registrar o perfil de admin. Tente de novo ou avise o suporte.",
      };
    }

    if (ehAdminEmpresa) {
      const { data: linha, error: atribError } = await admin
        .from("company_assignments")
        .insert({
          company_id: companyId,
          user_id: invited.user.id,
          papel: "admin_empresa",
          ativo: true,
          acessa_confidenciais: true,
          criado_por: user.id,
        })
        .select("id");

      if (atribError || !linha || linha.length === 0) {
        if (erroLimiteExcedido(atribError)) {
          return { error: "Convite enviado, mas a empresa atingiu o limite de operadores. Ajuste o limite na Carteira." };
        }
        if (atribError?.code === "23505") {
          return { error: "Esta pessoa já é admin de uma empresa. Cada pessoa administra uma empresa." };
        }
        return {
          error: "Convite enviado, mas não foi possível vincular o admin à empresa. Tente de novo ou avise o suporte.",
        };
      }

      await admin.from("audit_log").insert({
        ator_id: user.id,
        acao: "admin_empresa_convidado",
        objeto_tipo: "company_assignment",
        objeto_id: linha[0].id,
        depois: { email, company_id: companyId, user_id: invited.user.id, papel: "admin_empresa" },
      });
    } else {
      await admin.from("audit_log").insert({
        ator_id: user.id,
        acao: "admin_convidado",
        objeto_tipo: "admin_users",
        objeto_id: invited.user.id,
        depois: { email, perfil },
      });
    }

    revalidatePath("/admin/acesso");
    return { error: null, info: `Convite enviado para ${email}.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao processar dados.";
    return { error: message };
  }
}
