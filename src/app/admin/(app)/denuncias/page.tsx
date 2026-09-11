import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { resolverDenuncia } from "./actions";
import { SubmitButton } from "@/components/form-buttons";

const TIPO_LABEL: Record<string, string> = {
  cobranca_indevida: "Cobrança indevida",
  discriminacao: "Discriminação",
  assedio: "Assédio",
  dado_falso: "Dado falso",
  outro: "Outro",
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  aberta: { label: "Aberta", className: "bg-danger-bg text-danger" },
  em_analise: { label: "Em análise", className: "bg-gold-bg text-gold-3" },
  resolvida: { label: "Resolvida", className: "bg-success-bg text-success" },
  improcedente: { label: "Improcedente", className: "bg-black/5 text-text-3" },
};

export default async function DenunciasPage() {
  await requireInternalUser("privacy.manage");
  const admin = createAdminClient();

  const { data: reports } = await admin
    .from("reports")
    .select("id, tipo, status, descricao, alvo_tipo, alvo_id, resolucao, created_at")
    .order("created_at", { ascending: true });

  const abertas = (reports ?? []).filter((r) => r.status === "aberta" || r.status === "em_analise");
  const fechadas = (reports ?? []).filter((r) => r.status === "resolvida" || r.status === "improcedente");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Denúncias</h1>
        <p className="mt-1 text-xs text-text-2">
          Cobrança indevida, discriminação, assédio, dado falso e outras denúncias
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <h3 className="mb-3 text-sm font-extrabold text-text">Abertas ({abertas.length})</h3>
        {abertas.length === 0 ? (
          <p className="text-[12px] text-text-2">Nenhuma denúncia aberta.</p>
        ) : (
          <div className="mb-6 flex flex-col gap-3">
            {abertas.map((r) => {
              const s = STATUS_LABEL[r.status] ?? STATUS_LABEL.aberta;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <b className="text-[13px] text-text">{TIPO_LABEL[r.tipo] ?? r.tipo}</b>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${s.className}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-text-2">
                    Alvo: {r.alvo_tipo}
                    {r.alvo_id ? ` #${r.alvo_id.slice(0, 8)}` : ""} · recebida em{" "}
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  {r.descricao && (
                    <p className="mt-2 rounded-lg bg-bg p-3 text-[12px] leading-relaxed text-text-2">
                      {r.descricao}
                    </p>
                  )}

                  <form action={resolverDenuncia} className="mt-3 flex flex-wrap items-end gap-2.5">
                    <input type="hidden" name="report_id" value={r.id} />
                    <input
                      name="resolucao"
                      placeholder="O que foi apurado / resolução"
                      className="min-w-[220px] flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-[12px]"
                    />
                    {r.status !== "em_analise" && (
                      <SubmitButton
                        name="acao"
                        value="em_analise"
                        pendingLabel="Salvando..."
                        className="rounded-lg border border-border bg-bg px-3 py-2 text-[11.5px] font-extrabold text-text-2"
                      >
                        Marcar em análise
                      </SubmitButton>
                    )}
                    <SubmitButton
                      name="acao"
                      value="improcedente"
                      pendingLabel="Salvando..."
                      className="rounded-lg border border-border bg-bg px-3 py-2 text-[11.5px] font-extrabold text-text-2"
                    >
                      Improcedente
                    </SubmitButton>
                    <SubmitButton
                      name="acao"
                      value="resolvida"
                      pendingLabel="Salvando..."
                      className="rounded-lg bg-success px-4 py-2 text-[11.5px] font-extrabold text-white"
                    >
                      Marcar resolvida
                    </SubmitButton>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        <h3 className="mb-3 text-sm font-extrabold text-text">Fechadas ({fechadas.length})</h3>
        {fechadas.length === 0 ? (
          <p className="text-[12px] text-text-2">Nenhuma denúncia fechada ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fechadas.map((r) => {
              const s = STATUS_LABEL[r.status] ?? STATUS_LABEL.resolvida;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-surface p-3 text-[12px]">
                  <div className="flex items-center justify-between">
                    <b className="text-text">{TIPO_LABEL[r.tipo] ?? r.tipo}</b>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${s.className}`}>
                      {s.label}
                    </span>
                  </div>
                  {r.resolucao && <p className="mt-1 text-text-2">{r.resolucao}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
