import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { validarCandidato } from "./actions";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-gold-bg text-gold-3" },
  aprovado: { label: "Aprovado", className: "bg-success-bg text-success" },
  reprovado: { label: "Reprovado", className: "bg-danger-bg text-danger" },
};

export default async function CandidatosPage() {
  await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();

  const [{ data: profiles }, { data: usersPage }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, nome_completo, cidade, titulo_profissional, modalidades_desejadas, status_validacao, created_at")
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email]) ?? []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Candidatos</h1>
        <p className="mt-1 text-xs text-text-2">
          Banco de candidatos da plataforma — busque, acompanhe e valide (aprovado/reprovado)
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        {!profiles || profiles.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhum candidato cadastrado.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="grid grid-cols-6 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
              <div className="col-span-2">Candidato</div>
              <div>Cidade</div>
              <div>Modalidades</div>
              <div>Status</div>
              <div>Ação</div>
            </div>
            {profiles.map((p) => {
              const s = STATUS_LABEL[p.status_validacao] ?? STATUS_LABEL.pendente;
              return (
                <div key={p.id} className="grid grid-cols-6 items-center gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none">
                  <div className="col-span-2 min-w-0">
                    <div className="truncate font-bold text-text">{p.nome_completo}</div>
                    <div className="truncate text-[11px] text-text-2">{emailById.get(p.id) ?? "—"}</div>
                  </div>
                  <div className="text-text-2">{p.cidade ?? "—"}</div>
                  <div className="text-text-2">{(p.modalidades_desejadas ?? []).join(", ") || "—"}</div>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${s.className}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <form action={validarCandidato}>
                      <input type="hidden" name="candidate_id" value={p.id} />
                      <input type="hidden" name="acao" value="aprovar" />
                      <button
                        type="submit"
                        disabled={p.status_validacao === "aprovado"}
                        className="rounded bg-success px-2.5 py-1.5 text-[10.5px] font-extrabold text-white disabled:opacity-40"
                      >
                        Aprovar
                      </button>
                    </form>
                    <form action={validarCandidato}>
                      <input type="hidden" name="candidate_id" value={p.id} />
                      <input type="hidden" name="acao" value="reprovar" />
                      <button
                        type="submit"
                        disabled={p.status_validacao === "reprovado"}
                        className="rounded bg-danger px-2.5 py-1.5 text-[10.5px] font-extrabold text-white disabled:opacity-40"
                      >
                        Reprovar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
