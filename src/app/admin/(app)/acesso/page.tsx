import { createAdminClient } from "@/lib/supabase/admin";
import { InviteAdminForm } from "./invite-form";

const PERFIL_LABEL: Record<string, string> = {
  superadmin: "Superadministrador",
  operacoes: "Operações",
  compliance: "Compliance e privacidade",
  suporte: "Suporte",
  financeiro: "Financeiro",
};

export default async function AcessoPage() {
  const admin = createAdminClient();

  const { data: admins } = await admin
    .from("admin_users")
    .select("user_id, perfil, nome_exibicao, mfa_ativo, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Acesso e permissões</h1>
        <p className="mt-1 text-xs text-text-2">
          Perfis, permissões, autenticação forte, sessões e segregação de funções
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        <InviteAdminForm />

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid grid-cols-4 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
            <div>Usuário</div>
            <div>Perfil</div>
            <div>MFA</div>
            <div>Desde</div>
          </div>
          {(admins ?? []).map((a) => (
            <div key={a.user_id} className="grid grid-cols-4 gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none">
              <div className="font-bold text-text">{a.nome_exibicao ?? `Admin #${a.user_id.slice(0, 8)}`}</div>
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
      </div>
    </div>
  );
}
