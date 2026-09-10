import { redirect } from "next/navigation";
import { requireInternalUser } from "@/lib/auth/internal";
import { createAdminClient } from "@/lib/supabase/admin";
import { FunnelBarChart, CategoryBarChart, TrendLineChart, CHART_COLORS } from "@/components/charts";

const STATUS_PAGAMENTO_COLOR: Record<string, string> = {
  pendente: CHART_COLORS.atencao,
  pago: CHART_COLORS.sucesso,
  parcial: CHART_COLORS.info,
  atrasado: CHART_COLORS.risco,
};

const MODALIDADE_COLOR: Record<string, string> = {
  efetiva: CHART_COLORS.neutro,
  pj: CHART_COLORS.destaque,
  temporaria: CHART_COLORS.atencao,
};

const MODALIDADE_LABEL: Record<string, string> = {
  efetiva: "Efetiva",
  pj: "PJ",
  temporaria: "Temporária",
};

function inicioDaSemana(iso: string): Date {
  const d = new Date(iso);
  const dia = d.getDay();
  const diff = (dia === 0 ? -6 : 1) - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function semanaLabel(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function dataDeCorte(diasAtras: number): string {
  return new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000).toISOString();
}

export default async function EstrategicoPage() {
  const { role } = await requireInternalUser();
  if (role !== "superadmin") redirect("/admin");

  const admin = createAdminClient();
  const setentaDiasAtras = dataDeCorte(70);

  const [
    { count: totalInstalacoes },
    { count: totalLeads },
    { count: totalCandidatos },
    { count: totalCandidaturas },
    { count: totalContratados },
    { data: pagamentos },
    { data: vagasPorModalidade },
    { data: leadsRecentes },
    { data: candidatosRecentes },
  ] = await Promise.all([
    admin.from("app_install_events").select("id", { count: "exact", head: true }),
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("applications").select("id", { count: "exact", head: true }),
    admin.from("applications").select("id", { count: "exact", head: true }).eq("status", "contratado"),
    admin.from("service_engagements").select("status_pagamento, valor"),
    admin.from("jobs").select("modalidade").eq("status", "publicada"),
    admin.from("leads").select("created_at").gte("created_at", setentaDiasAtras),
    admin.from("profiles").select("created_at").gte("created_at", setentaDiasAtras),
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
  const pagamentosChart = Object.entries(porStatusPagamento).map(([status, valor]) => ({
    categoria: status.charAt(0).toUpperCase() + status.slice(1),
    valor,
    color: STATUS_PAGAMENTO_COLOR[status] ?? CHART_COLORS.info,
  }));

  const porModalidade = { efetiva: 0, pj: 0, temporaria: 0 } as Record<string, number>;
  for (const j of vagasPorModalidade ?? []) {
    porModalidade[j.modalidade] = (porModalidade[j.modalidade] ?? 0) + 1;
  }
  const modalidadeChart = Object.entries(porModalidade).map(([modalidade, valor]) => ({
    categoria: MODALIDADE_LABEL[modalidade] ?? modalidade,
    valor,
    color: MODALIDADE_COLOR[modalidade] ?? CHART_COLORS.neutro,
  }));

  const funilChart = [
    { etapa: "Leads", valor: totalLeads ?? 0, color: CHART_COLORS.neutro },
    { etapa: "Candidatos", valor: totalCandidatos ?? 0, color: CHART_COLORS.destaque },
    { etapa: "Candidaturas", valor: totalCandidaturas ?? 0, color: CHART_COLORS.atencao },
    { etapa: "Contratados", valor: totalContratados ?? 0, color: CHART_COLORS.sucesso },
  ];

  const semanas = new Map<string, { leads: number; candidatos: number }>();
  for (const l of leadsRecentes ?? []) {
    const key = inicioDaSemana(l.created_at).toISOString();
    const atual = semanas.get(key) ?? { leads: 0, candidatos: 0 };
    atual.leads += 1;
    semanas.set(key, atual);
  }
  for (const c of candidatosRecentes ?? []) {
    const key = inicioDaSemana(c.created_at).toISOString();
    const atual = semanas.get(key) ?? { leads: 0, candidatos: 0 };
    atual.candidatos += 1;
    semanas.set(key, atual);
  }
  const tendenciaChart = Array.from(semanas.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ semana: semanaLabel(new Date(key)), ...v }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
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
            <h3 className="text-sm font-extrabold text-text">Funil de conversão</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Leads → candidatos → candidaturas → contratados</p>
            <FunnelBarChart data={funilChart} />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Evolução semanal</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Leads e candidatos cadastrados, últimos 70 dias</p>
            {tendenciaChart.length === 0 ? (
              <p className="mt-8 text-center text-[12px] text-text-2">Sem dados no período.</p>
            ) : (
              <TrendLineChart data={tendenciaChart} />
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Prestações por status de pagamento</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Todas as modalidades</p>
            <CategoryBarChart data={pagamentosChart} />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Vagas publicadas por modalidade</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Composição do portfólio ativo</p>
            <CategoryBarChart data={modalidadeChart} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-success-bg p-3">
            <span className="text-[12px] font-bold text-success">Pago</span>
            <div className="text-[17px] font-extrabold text-success">
              R$ {valorPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="rounded-xl bg-gold-bg p-3">
            <span className="text-[12px] font-bold text-gold-3">Pendente/parcial/atrasado</span>
            <div className="text-[17px] font-extrabold text-gold-3">
              R$ {valorPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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
