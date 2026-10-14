import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { SubmitButton } from "@/components/form-buttons";
import { calcularVagasOperador, rotuloVagasOperador } from "@/lib/operadores";
import {
  atribuirOperador,
  alternarConfidenciais,
  desativarAtribuicao,
  definirLimiteOperadores,
} from "./actions";

export default async function CarteiraPage() {
  await requireInternalUser("carteira.manage");
  const admin = createAdminClient();

  const [{ data: operadores }, { data: empresas }, { data: atribuicoes }] = await Promise.all([
    admin
      .from("admin_users")
      .select("user_id, nome_exibicao")
      .eq("perfil", "operador")
      .eq("ativo", true)
      .order("nome_exibicao"),
    admin
      .from("companies")
      .select("id, razao_social, nome_fantasia, max_operadores")
      .eq("status", "aprovada")
      .order("razao_social"),
    admin
      .from("company_assignments")
      .select("id, company_id, user_id, papel, ativo, acessa_confidenciais, created_at")
      .eq("ativo", true)
      .order("created_at", { ascending: true }),
  ]);

  const nomeOperador = new Map(
    (operadores ?? []).map((o) => [o.user_id, o.nome_exibicao ?? `Operador #${o.user_id.slice(0, 8)}`]),
  );
  const nomeEmpresa = new Map((empresas ?? []).map((e) => [e.id, e.nome_fantasia ?? e.razao_social]));

  // Operadores ativos por empresa (o admin da empresa não conta).
  const emUsoPorEmpresa = new Map<string, number>();
  for (const a of atribuicoes ?? []) {
    if (a.papel === "admin_empresa") continue;
    emUsoPorEmpresa.set(a.company_id, (emUsoPorEmpresa.get(a.company_id) ?? 0) + 1);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Carteira por atendente</h1>
        <p className="mt-1 text-xs text-text-2">
          Define quais empresas cada operador enxerga. Operador sem empresa atribuída não vê nada.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <form
          action={atribuirOperador}
          className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-3"
        >
          <select name="user_id" required className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
            <option value="">Operador…</option>
            {(operadores ?? []).map((o) => (
              <option key={o.user_id} value={o.user_id}>
                {nomeOperador.get(o.user_id)}
              </option>
            ))}
          </select>
          <select name="company_id" required className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
            <option value="">Empresa…</option>
            {(empresas ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {nomeEmpresa.get(e.id)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-[12.5px] text-text-2">
            <input type="checkbox" name="acessa_confidenciais" />
            Pode ver vagas confidenciais
          </label>
          <SubmitButton
            pendingLabel="Atribuindo..."
            className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white md:col-span-3"
          >
            Atribuir à carteira
          </SubmitButton>
        </form>

        <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
            Vagas de operador por empresa
          </div>
          {(empresas ?? []).length === 0 && (
            <div className="px-5 py-6 text-xs text-text-2">Nenhuma empresa aprovada.</div>
          )}
          {(empresas ?? []).map((e) => {
            const v = calcularVagasOperador(e.max_operadores ?? 0, emUsoPorEmpresa.get(e.id) ?? 0);
            return (
              <div
                key={e.id}
                className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none"
              >
                <div className="min-w-40 flex-1 font-bold text-text">{nomeEmpresa.get(e.id)}</div>
                <div className={v.cheio ? "font-semibold text-danger" : "text-text-2"}>{rotuloVagasOperador(v)}</div>
                <form action={definirLimiteOperadores} className="flex items-center gap-2">
                  <input type="hidden" name="company_id" value={e.id} />
                  <label className="flex items-center gap-1.5 text-[11px] text-text-2">
                    Limite
                    <input
                      type="number"
                      name="limite"
                      min={0}
                      max={500}
                      step={1}
                      required
                      defaultValue={v.limite}
                      className="w-20 rounded-lg border border-border bg-bg px-2 py-1.5 text-[12px]"
                    />
                  </label>
                  <SubmitButton pendingLabel="..." className="text-[11px] font-bold text-navy underline">
                    Salvar limite
                  </SubmitButton>
                </form>
              </div>
            );
          })}
        </div>

        {(operadores ?? []).length === 0 && (
          <p className="mb-4 rounded-xl bg-navy-bg px-4 py-3 text-xs text-text-2">
            Nenhum operador ativo ainda. Convide um em <b>Acesso</b> com o perfil Operador.
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid grid-cols-4 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
            <div>Operador</div>
            <div>Empresa</div>
            <div>Confidenciais</div>
            <div>Ações</div>
          </div>
          {(atribuicoes ?? []).length === 0 && (
            <div className="px-5 py-6 text-xs text-text-2">Nenhuma atribuição ativa.</div>
          )}
          {(atribuicoes ?? []).map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-4 items-center gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none"
            >
              <div className="font-bold text-text">{nomeOperador.get(a.user_id) ?? `#${a.user_id.slice(0, 8)}`}
                {a.papel === "admin_empresa" && (
                  <span className="ml-1.5 text-[10px] font-extrabold uppercase text-gold">Admin da empresa</span>
                )}
              </div>
              <div className="text-text-2">{nomeEmpresa.get(a.company_id) ?? "—"}</div>
              <form action={alternarConfidenciais}>
                <input type="hidden" name="assignment_id" value={a.id} />
                <input type="hidden" name="valor" value={a.acessa_confidenciais ? "false" : "true"} />
                <SubmitButton pendingLabel="..." className="text-[11px] font-bold text-navy underline">
                  {a.acessa_confidenciais ? "Sim — revogar" : "Não — liberar"}
                </SubmitButton>
              </form>
              <form action={desativarAtribuicao}>
                <input type="hidden" name="assignment_id" value={a.id} />
                <SubmitButton pendingLabel="..." className="text-[11px] font-bold text-danger underline">
                  Remover da carteira
                </SubmitButton>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
