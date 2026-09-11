import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { criarPrestacao, atualizarPagamento } from "./actions";
import { SubmitButton } from "@/components/form-buttons";
import { IconCheck, IconBell, IconChecklist } from "@/components/icons";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-gold-bg text-gold-3" },
  pago: { label: "Pago", className: "bg-success-bg text-success" },
  parcial: { label: "Parcial", className: "bg-navy-bg text-navy" },
  atrasado: { label: "Atrasado", className: "bg-danger-bg text-danger" },
};

const STATUS_ICON: Record<string, { icon: React.ReactNode; className: string }> = {
  pendente: { icon: <IconBell size={17} />, className: "bg-gold-bg text-gold-3" },
  pago: { icon: <IconCheck size={17} />, className: "bg-success-bg text-success" },
  parcial: { icon: <IconChecklist size={17} />, className: "bg-navy-bg text-navy" },
  atrasado: { icon: <IconBell size={17} />, className: "bg-danger-bg text-danger" },
};

export default async function PrestacoesPage() {
  await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();

  const [{ data: engagements }, { data: candidatosContratados }, { data: perfis }] = await Promise.all([
    admin
      .from("service_engagements")
      .select("id, candidate_id, modalidade, data_inicio, data_fim, valor, periodicidade, status_pagamento, companies(razao_social)")
      .order("created_at", { ascending: false }),
    admin
      .from("applications")
      .select("id, candidate_id, status, jobs(titulo, modalidade, companies(razao_social))")
      .eq("status", "contratado")
      .order("created_at", { ascending: false })
      .limit(50),
    admin.from("profiles").select("id, nome_completo"),
  ]);

  const nomeById = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Prestações de serviço</h1>
        <p className="mt-1 text-xs text-text-2">
          Controle de datas de início/saída e pagamentos — todas as modalidades
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-extrabold text-text">Registrar nova prestação</h3>
          {!candidatosContratados || candidatosContratados.length === 0 ? (
            <p className="text-[12px] text-text-2">Nenhuma candidatura marcada como &quot;Contratado&quot; ainda.</p>
          ) : (
            <form action={criarPrestacao} className="flex flex-wrap items-end gap-2.5">
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold text-text-2">Candidatura contratada</span>
                <select name="application_id" required defaultValue="" className="min-w-[260px] rounded-lg border border-border bg-bg px-3 py-2 text-[12px]">
                  <option value="" disabled>Selecionar...</option>
                  {candidatosContratados.map((a) => {
                    const job = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
                    const company = job && (Array.isArray(job.companies) ? job.companies[0] : job.companies);
                    return (
                      <option key={a.id} value={a.id}>
                        {nomeById.get(a.candidate_id) ?? "Candidato"} — {job?.titulo} ({company?.razao_social})
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold text-text-2">Data de início</span>
                <input type="date" name="data_inicio" required className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold text-text-2">Valor</span>
                <input type="number" step="0.01" name="valor" placeholder="0,00" className="w-28 rounded-lg border border-border bg-bg px-3 py-2 text-[12px]" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold text-text-2">Periodicidade</span>
                <input name="periodicidade" placeholder="mensal / diária / único" className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]" />
              </label>
              <SubmitButton
                pendingLabel="Registrando..."
                className="rounded-lg bg-gold px-4 py-2.5 text-[12px] font-extrabold text-[#1c1508]"
              >
                + Registrar
              </SubmitButton>
            </form>
          )}
        </div>

        {!engagements || engagements.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhuma prestação de serviço registrada.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {engagements.map((e) => {
              const company = Array.isArray(e.companies) ? e.companies[0] : e.companies;
              const s = STATUS_LABEL[e.status_pagamento] ?? STATUS_LABEL.pendente;
              const icon = STATUS_ICON[e.status_pagamento] ?? STATUS_ICON.pendente;
              return (
                <div key={e.id} className="flex gap-3.5 rounded-2xl border border-border bg-surface p-4">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${icon.className}`}
                  >
                    {icon.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <b className="text-[13px] text-text">{nomeById.get(e.candidate_id) ?? "Candidato"}</b>
                        <span className="ml-2 rounded-md bg-navy-bg px-2 py-0.5 text-[9.5px] font-extrabold uppercase text-navy">
                          {e.modalidade}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {e.valor && (
                          <span className="text-[13px] font-extrabold text-text">
                            R$ {Number(e.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${s.className}`}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[11.5px] text-text-2">
                      {company?.razao_social} · início {new Date(e.data_inicio).toLocaleDateString("pt-BR")}
                      {e.data_fim ? ` · fim ${new Date(e.data_fim).toLocaleDateString("pt-BR")}` : " · em andamento"}
                      {e.periodicidade ? ` · ${e.periodicidade}` : ""}
                    </p>

                    <form action={atualizarPagamento} className="mt-3 flex flex-wrap items-end gap-2.5">
                      <input type="hidden" name="id" value={e.id} />
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-text-2">Status de pagamento</span>
                        <select name="status_pagamento" defaultValue={e.status_pagamento} className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]">
                          <option value="pendente">Pendente</option>
                          <option value="pago">Pago</option>
                          <option value="parcial">Parcial</option>
                          <option value="atrasado">Atrasado</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-text-2">Data de saída</span>
                        <input type="date" name="data_fim" defaultValue={e.data_fim ?? ""} className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]" />
                      </label>
                      <SubmitButton
                        pendingLabel="Salvando..."
                        className="rounded-lg bg-navy px-4 py-2 text-[11.5px] font-extrabold text-white"
                      >
                        Salvar
                      </SubmitButton>
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
