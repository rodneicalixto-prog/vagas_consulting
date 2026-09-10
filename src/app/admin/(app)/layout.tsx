import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { normalizeInternalRole } from "@/lib/auth/internal";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: account } = await supabase
    .from("admin_users")
    .select("perfil, nome_exibicao")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) redirect("/admin/acesso-negado");

  const role = normalizeInternalRole(account.perfil);

  return (
    <AdminShell adminName={account.nome_exibicao ?? user.email ?? "Usuário"} role={role}>
      {children}
    </AdminShell>
  );
}
