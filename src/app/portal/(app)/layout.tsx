import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/portal/login");

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, papel, companies(razao_social, nome_fantasia, status)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/portal/login");

  const company = Array.isArray(membership.companies)
    ? membership.companies[0]
    : membership.companies;

  return (
    <PortalShell
      companyName={company?.nome_fantasia ?? company?.razao_social ?? "Empresa"}
      memberName={user.email ?? "Usuário"}
    >
      {children}
    </PortalShell>
  );
}
