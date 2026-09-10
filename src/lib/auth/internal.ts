import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type InternalRole = "superadmin" | "admin" | "operador";

export type Capability =
  | "dashboard.read"
  | "companies.manage"
  | "jobs.manage"
  | "jobs.publish"
  | "pipeline.manage"
  | "privacy.manage"
  | "audit.read"
  | "users.manage";

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
  ],
  admin: [
    "dashboard.read",
    "companies.manage",
    "jobs.manage",
    "jobs.publish",
    "pipeline.manage",
    "privacy.manage",
    "audit.read",
  ],
  operador: ["dashboard.read", "companies.manage", "jobs.manage", "pipeline.manage"],
};

function normalizeRole(role: string): InternalRole {
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
    .select("perfil, nome_exibicao, ativo")
    .eq("user_id", user.id)
    .maybeSingle();

  let account: { perfil: string; nome_exibicao: string | null; ativo: boolean } | null =
    currentAccount.data;

  // Mantém o painel acessível enquanto a migration 0006 ainda não tiver sido
  // aplicada. Outros erros continuam bloqueando o acesso.
  if (currentAccount.error?.code === "42703") {
    const legacyAccount = await supabase
      .from("admin_users")
      .select("perfil, nome_exibicao")
      .eq("user_id", user.id)
      .maybeSingle();
    account = legacyAccount.data ? { ...legacyAccount.data, ativo: true } : null;
  }

  if (!account || account.ativo === false) redirect("/admin/acesso-negado");

  const role = normalizeRole(account.perfil);
  if (capability && !can(role, capability)) redirect("/admin/acesso-negado");

  return { user, account, role };
}
