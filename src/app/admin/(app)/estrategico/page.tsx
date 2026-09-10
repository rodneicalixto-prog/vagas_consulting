import { redirect } from "next/navigation";
import { requireInternalUser } from "@/lib/auth/internal";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function EstrategicoPage() {
  const { role } = await requireInternalUser();
  if (role !== "superadmin") redirect("/admin");

  const admin = createAdminClient();

  const [
    { count: totalInstalacoes },
    { count: totalLeads },
    { count: totalCandidatos },
    { count: totalContratados },
    { data: pagamentos },
  ] = await Promise.all([
    admin.from("app_install_events").select("id", { count: "exact", head: true }),
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("applications").select("id", { count: "exact", head: true }).eq("status", "contratado"),
    admin.from("service_engagements").select("status_pagamento, valor"),
  ]);

  const porStatusPagamento = { pendente: 0, pago: 0, parcial: 0, atrasado: 0 } as Record<string, number>;
  let valorPago = 0;
  let valorPendente = 0;
  for (const p of pagamentos ?? []) {
    porStatusPagamento[p.status_pagamento] = (porStatusPagamento[p.status_pagamento] ?? 0) + 1;
    if (p.valor) {
      if (p.status_pagamento === "pago") valorPago += p.valor;
      else valorPendente += p.valor;
    }
  }

  const maxPagamento = Math.max(1, ...Object.values(porStatusPagamento));

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Estratégico</h1>
        <p className="mt-1 text-xs text-text-2">
          Visível só para superadministrador — aceitação de mercado e saúde financeira
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          <Kpi label="Instalações do app" value={totalInstalacoes ?? 0} />
          <Kpi label="Leads capturados" value={totalLeads ?? 0} />
          <Kpi label="Candidatos cadastrados" value={totalCandidatos ?? 0} />
          <Kpi label="Contratações fechadas" value={totalContratados ?? 0} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Prestações por status de pagamento</h3>
            <p className="mb-4 mt-0.5 text-[11.5px] text-text-2">Todas as modalidades</p>
            <div className="flex items-end gap-4" style={{ height: 140 }}>
              {Object.entries(porStatusPagamento).map(([status, qtd]) => (
                <div key={status} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-navy"
                    style={{ height: `${Math.max(4, (qtd / maxPagamento) * 100)}%` }}
                  />
                  <span className="text-[10.5px] font-bold text-text-2 capitalize">{status}</span>
                  <span className="text-[11px] font-extrabold text-navy">{qtd}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Valores</h3>
            <p className="mb-4 mt-0.5 text-[11.5px] text-text-2">Somado das prestações com valor informado</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-xl bg-success-bg p-3">
                <span className="text-[12px] font-bold text-success">Pago</span>
                <span className="text-[15px] font-extrabold text-success">
                  R$ {valorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gold-bg p-3">
                <span className="text-[12px] font-bold text-gold-3">Pendente/parcial/atrasado</span>
                <span className="text-[15px] font-extrabold text-gold-3">
                  R$ {valorPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 rounded-xl bg-gold-bg p-3 text-[11px] font-semibold leading-relaxed text-gold-3">
          &quot;Instalações do app&quot; conta o evento de instalação da PWA (Add to Home Screen) —
          só dispara em navegadores/plataformas com suporte (Chrome/Edge/Android); iOS Safari
          não dispara esse evento, então o número tende a ficar abaixo da realidade em usuários
          de iPhone até virar app nativo publicado em loja.
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-[10.5px] font-bold uppercase text-text-2">{label}</div>
      <div className="mt-1.5 text-[23px] font-extrabold text-navy">{value}</div>
    </div>
  );
}
