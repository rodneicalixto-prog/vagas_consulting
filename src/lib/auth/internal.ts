import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type InternalRole = "superadmin" | "admin" | "admin_empresa" | "operador";

export type Capability =
  | "dashboard.read"
  | "companies.manage"
  | "jobs.manage"
  | "jobs.publish"
  | "pipeline.manage"
  | "privacy.manage"
  | "audit.read"
  | "users.manage"
  | "companies.approve" // cadastrar/aprovar empresa (admin e superadmin)
  | "finance.read" // prestações e valores (admin e superadmin)
  | "platform.data" // leads, black list e dados da plataforma (admin e superadmin)
  | "carteira.manage" // atribuir operadores a empresas e definir limites (superadmin)
  | "operadores.manage" // convidar/ativar/desativar operadores da própria empresa (admin da empresa)
  | "finance.empresa"; // prestações da própria empresa, somente leitura (admin da empresa)

const CAPABILITIES: Record<InternalRole, readonly Capability[]> = {
  superadmin: [
    "dashboard.read",
    "companies.manage",
    "jobs.manage",
    "jobs.publish",
    "pipeline.manage",
    "privacy.manage",
    "audit.read",
    "users.manage",
    "companies.approve",
    "finance.read",
    "platform.data",
    "carteira.manage",
  ],
  admin: [
    "dashboard.read",
    "companies.manage",
    "jobs.manage",
    "jobs.publish",
    "pipeline.manage",
    "privacy.manage",
    "audit.read",
    "companies.approve",
    "finance.read",
    "platform.data",
  ],
  // Admin da empresa: operador + gestão dos próprios operadores. Não publica
  // vaga (E4), não aprova empresa e só lê prestações da própria empresa (E5).
  admin_empresa: [
    "dashboard.read",
    "companies.manage",
    "jobs.manage",
    "pipeline.manage",
    "operadores.manage",
    "finance.empresa",
  ],
  operador: ["dashboard.read", "companies.manage", "jobs.manage", "pipeline.manage"],
};

export function normalizeInternalRole(role: string): InternalRole {
  if (role === "superadmin") return "superadmin";
  if (role === "admin" || role === "operacoes" || role === "compliance") return "admin";
  return "operador";
}

export function can(role: InternalRole, capability: Capability) {
  return CAPABILITIES[role].includes(capability);
}

export async function requireInternalUser(capability?: Capability) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const currentAccount = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const account = currentAccount.error ? null : currentAccount.data;

  if (!account || (("ativo" in account) && account.ativo === false)) {
    redirect("/admin/acesso-negado");
  }

  let role = normalizeInternalRole(account.perfil);

  // Admin da empresa = operador com atribuição ativa de papel admin_empresa.
  if (role === "operador") {
    const { data: atribuicao } = await createAdminClient()
      .from("company_assignments")
      .select("id")
      .eq("user_id", user.id)
      .eq("papel", "admin_empresa")
      .eq("ativo", true)
      .limit(1);
    if (atribuicao && atribuicao.length > 0) role = "admin_empresa";
  }

  if (capability && !can(role, capability)) redirect("/admin/acesso-negado");

  return { user, account, role };
}
