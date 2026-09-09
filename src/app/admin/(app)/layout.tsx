import { AdminShell } from "@/components/admin-shell";
import { requireInternalUser } from "@/lib/auth/internal";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const { user, account, role } = await requireInternalUser();

  return (
    <AdminShell adminName={account.nome_exibicao ?? user.email ?? "Usuário"} role={role}>
      {children}
    </AdminShell>
  );
}
