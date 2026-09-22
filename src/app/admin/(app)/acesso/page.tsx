import { Pagination } from "@/components/Pagination";
import { createAdminClient } from "@/lib/supabase/admin";
import { InviteAdminForm } from "./invite-form";
import { requireInternalUser } from "@/lib/auth/internal";

const PERFIL_LABEL: Record<string, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  operador: "Operador",
};

export default async function AcessoPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  await requireInternalUser("users.manage");
  const admin = createAdminClient();

  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: admins, count } = await admin
    .from("admin_users")
    .select("user_id, perfil, nome_exibicao, telefone, mfa_ativo, created_at", { count: "exact" })
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Acesso e permissões</h1>
        <p className="mt-1 text-xs text-text-2">
          Perfis, permissões, autenticação forte, sessões e segregação de funções
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <InviteAdminForm />

        <div className="flex justify-between items-center my-4">
          <p className="text-xs text-text-2">
            Total: {count} usuários | Página {page} de {totalPages}
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid grid-cols-5 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
            <div>Usuário</div>
            <div>Telefone</div>
            <div>Perfil</div>
            <div>MFA</div>
            <div>Desde</div>
          </div>
          {(admins ?? []).map((a) => (
            <div key={a.user_id} className="grid grid-cols-5 gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none">
              <div className="font-bold text-text">{a.nome_exibicao ?? `Admin #${a.user_id.slice(0, 8)}`}</div>
              <div className="text-text-2">{a.telefone ?? "—"}</div>
              <div>
                <span className="rounded-full bg-navy-bg px-2.5 py-1 text-[10px] font-extrabold text-navy">
                  {PERFIL_LABEL[a.perfil] ?? a.perfil}
                </span>
              </div>
              <div className={a.mfa_ativo ? "font-bold text-success" : "font-bold text-danger"}>
                {a.mfa_ativo ? "Ativo" : "Não configurado"}
              </div>
              <div className="text-text-2">{new Date(a.created_at).toLocaleDateString("pt-BR")}</div>
            </div>
          ))}
        </div>

        <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/acesso" />
      </div>
    </div>
  );
}
