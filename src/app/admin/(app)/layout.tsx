import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { normalizeInternalRole } from "@/lib/auth/internal";
import { createClient } from "@/lib/supabase/server";
import { empresaDaOperacao, numeroDaOperacao } from "@/lib/evolution";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Empresas clientes falam com a operação pelo número da instância conectada.
  // A equipe da própria operação (SOS Vagas) não precisa do botão.
  let equipeDaOperacao = false;
  if (role === "admin_empresa" || role === "operador") {
    const operacaoId = await empresaDaOperacao();
    if (operacaoId) {
      const { data: vinculo } = await createAdminClient()
        .from("company_assignments")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", operacaoId)
        .eq("ativo", true)
        .limit(1);
      equipeDaOperacao = (vinculo ?? []).length > 0;
    }
  }
  const numero =
    (role === "admin_empresa" || role === "operador") && !equipeDaOperacao ? await numeroDaOperacao() : null;
  const texto = encodeURIComponent("Olá! Preciso de ajuda com a plataforma de vagas.");
  const suporteHref = numero ? `https://wa.me/${numero}?text=${texto}` : null;

  return (
    <AdminShell adminName={account.nome_exibicao ?? user.email ?? "Usuário"} role={role} suporteHref={suporteHref}>
      {children}
    </AdminShell>
  );
}
