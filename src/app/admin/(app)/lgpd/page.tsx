import { createAdminClient } from "@/lib/supabase/admin";
import { atenderSolicitacao } from "./actions";
import { requireInternalUser } from "@/lib/auth/internal";

const TIPO_LABEL: Record<string, string> = {
  acesso: "Acesso aos dados",
  correcao: "Correção",
  exportacao: "Exportação de dados",
  revogacao: "Revogação de consentimento",
  eliminacao: "Eliminação de dados",
  revisao_decisao: "Revisão de decisão automatizada",
};

export default async function LgpdPage() {
  await requireInternalUser("privacy.manage");
  const admin = createAdminClient();

  const { data: requests } = await admin
    .from("privacy_requests")
    .select("id, tipo, status, origem, created_at, user_id")
    .order("created_at", { ascending: true });

  const abertas = (requests ?? []).filter((r) => r.status !== "atendida" && r.status !== "recusada");
  const atendidas = (requests ?? []).filter((r) => r.status === "atendida" || r.status === "recusada");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">LGPD</h1>
        <p className="mt-1 text-xs text-text-2">
          Solicitações dos titulares: acesso, correção, exportação, revogação, eliminação e
          revisão de decisão automatizada
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        <h3 className="mb-3 text-sm font-extrabold text-text">Abertas</h3>
        {abertas.length === 0 ? (
          <p className="text-[12px] text-text-2">Nenhuma solicitação aberta.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {abertas.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <b className="text-[13px] text-text">{TIPO_LABEL[r.tipo] ?? r.tipo}</b>
                  <span className="rounded-full bg-gold-bg px-2.5 py-1 text-[10px] font-extrabold text-gold-3">
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-text-2">Titular #{r.user_id.slice(0, 8)} · origem: {r.origem ?? "não informada"}</p>

                <form action={atenderSolicitacao} className="mt-3 flex gap-2">
                  <input type="hidden" name="request_id" value={r.id} />
                  <input
                    name="resposta"
                    placeholder="Resposta / o que foi feito"
                    className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-[12px]"
                  />
                  <button type="submit" className="rounded-lg bg-success px-4 text-[12px] font-extrabold text-white">
                    Marcar como atendida
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <h3 className="mb-3 mt-7 text-sm font-extrabold text-text">Concluídas</h3>
        {atendidas.length === 0 ? (
          <p className="text-[12px] text-text-2">Nenhuma ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {atendidas.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
                <span className="text-[12px] font-bold text-text">{TIPO_LABEL[r.tipo] ?? r.tipo}</span>
                <span className="rounded-full bg-success-bg px-2.5 py-1 text-[10px] font-extrabold text-success">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
