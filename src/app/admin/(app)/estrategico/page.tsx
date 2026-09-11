import { redirect } from "next/navigation";
import { requireInternalUser } from "@/lib/auth/internal";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FunnelBarChart,
  CategoryBarChart,
  TrendLineChart,
  DonutChart,
  GroupedBarChart,
} from "@/components/charts";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/data-table";
import { statusLabel, STATUS_CANDIDATURA_EM_ABERTO, CHART_COLORS } from "@/lib/format";
import type { Enums } from "@/lib/supabase/types";

const STATUS_CANDIDATURA_COLOR: Record<string, string> = {
  recebida: CHART_COLORS.neutro,
  triagem: CHART_COLORS.atencao,
  entrevista: CHART_COLORS.info,
  teste: CHART_COLORS.info,
  proposta: CHART_COLORS.destaque,
  contratado: CHART_COLORS.sucesso,
  rejeitada: CHART_COLORS.risco,
  reprovado_cliente: CHART_COLORS.risco,
  desistente: "#9aa0a8",
  expirada: "#9aa0a8",
};

const STATUS_CANDIDATO_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const STATUS_CANDIDATO_COLOR: Record<string, string> = {
  pendente: CHART_COLORS.atencao,
  aprovado: CHART_COLORS.sucesso,
  reprovado: CHART_COLORS.risco,
};

const STATUS_PAGAMENTO_COLOR: Record<string, string> = {
  pendente: CHART_COLORS.atencao,
  pago: CHART_COLORS.sucesso,
  parcial: CHART_COLORS.info,
  atrasado: CHART_COLORS.risco,
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

function mesLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function mesChave(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
    { data: candidaturasPorStatus },
    { data: candidatosPorValidacao },
  ] = await Promise.all([
    admin.from("app_install_events").select("id", { count: "exact", head: true }),
    admin.from("leads").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("applications").select("id", { count: "exact", head: true }),
    admin.from("applications").select("id", { count: "exact", head: true }).eq("status", "contratado"),
    admin.from("service_engagements").select("status_pagamento, valor"),
    admin.from("jobs").select("modalidade, status").in("status", ["publicada", "preenchida"]),
    admin.from("leads").select("created_at").gte("created_at", setentaDiasAtras),
    admin.from("profiles").select("created_at").gte("created_at", setentaDiasAtras),
    admin.from("applications").select("status"),
    admin.from("profiles").select("status_validacao"),
  ]);

  const trezentosSessentaCincoDiasAtras = dataDeCorte(365);

  const [{ count: totalEmpresas }, { data: candidaturasPorEmpresa }, { data: vagasAbertasRaw }, { data: vagasPorMesRaw }] =
    await Promise.all([
      admin.from("companies").select("id", { count: "exact", head: true }),
      admin.from("applications").select("status, jobs(companies(nome_fantasia, razao_social))"),
      admin
        .from("jobs")
        .select("status, companies(nome_fantasia, razao_social)")
        .eq("status", "publicada"),
      admin.from("jobs").select("created_at").gte("created_at", trezentosSessentaCincoDiasAtras),
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

  const porModalidadeStatus: Record<string, { publicadas: number; preenchidas: number }> = {
    efetiva: { publicadas: 0, preenchidas: 0 },
    pj: { publicadas: 0, preenchidas: 0 },
    temporaria: { publicadas: 0, preenchidas: 0 },
  };
  for (const j of vagasPorModalidade ?? []) {
    const bucket = porModalidadeStatus[j.modalidade] ?? (porModalidadeStatus[j.modalidade] = { publicadas: 0, preenchidas: 0 });
    if (j.status === "publicada") bucket.publicadas += 1;
    else bucket.preenchidas += 1;
  }
  const modalidadeComparativo = Object.entries(porModalidadeStatus).map(([modalidade, v]) => ({
    categoria: MODALIDADE_LABEL[modalidade] ?? modalidade,
    publicadas: v.publicadas,
    preenchidas: v.preenchidas,
  }));

  const porStatusCandidatura: Partial<Record<Enums<"status_candidatura">, number>> = {};
  for (const a of candidaturasPorStatus ?? []) {
    porStatusCandidatura[a.status] = (porStatusCandidatura[a.status] ?? 0) + 1;
  }
  const candidaturasChart = Object.entries(porStatusCandidatura)
    .filter(([, valor]) => valor > 0)
    .map(([status, valor]) => ({
      categoria: statusLabel[status as Enums<"status_candidatura">],
      valor,
      color: STATUS_CANDIDATURA_COLOR[status] ?? CHART_COLORS.neutro,
    }));

  const porStatusCandidato = { pendente: 0, aprovado: 0, reprovado: 0 } as Record<string, number>;
  for (const p of candidatosPorValidacao ?? []) {
    porStatusCandidato[p.status_validacao] = (porStatusCandidato[p.status_validacao] ?? 0) + 1;
  }
  const candidatosValidacaoChart = Object.entries(porStatusCandidato).map(([status, valor]) => ({
    categoria: STATUS_CANDIDATO_LABEL[status] ?? status,
    valor,
    color: STATUS_CANDIDATO_COLOR[status] ?? CHART_COLORS.neutro,
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

  const porEmpresa = new Map<
    string,
    { contratados: number; reprovados: number; desistencias: number; emAberto: number; vagasAbertas: number }
  >();
  function empresaBucket(nome: string) {
    return (
      porEmpresa.get(nome) ??
      (porEmpresa.set(nome, { contratados: 0, reprovados: 0, desistencias: 0, emAberto: 0, vagasAbertas: 0 }),
      porEmpresa.get(nome)!)
    );
  }
  for (const a of candidaturasPorEmpresa ?? []) {
    const job = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
    const company = job && (Array.isArray(job.companies) ? job.companies[0] : job.companies);
    const nome = company?.nome_fantasia ?? company?.razao_social ?? "Sem empresa";
    const atual = empresaBucket(nome);
    if (a.status === "contratado") atual.contratados += 1;
    else if (a.status === "reprovado_cliente" || a.status === "rejeitada") atual.reprovados += 1;
    else if (a.status === "desistente") atual.desistencias += 1;
    else if (STATUS_CANDIDATURA_EM_ABERTO.includes(a.status)) atual.emAberto += 1;
  }
  for (const j of vagasAbertasRaw ?? []) {
    const company = Array.isArray(j.companies) ? j.companies[0] : j.companies;
    const nome = company?.nome_fantasia ?? company?.razao_social ?? "Sem empresa";
    empresaBucket(nome).vagasAbertas += 1;
  }

  const empresaColumns: DataTableColumn[] = [
    { key: "empresa", label: "Empresa", sortable: true },
    { key: "vagasAbertas", label: "Vagas abertas", sortable: true, align: "right" },
    { key: "contratados", label: "Contratados", sortable: true, align: "right" },
    { key: "reprovados", label: "Reprovados", sortable: true, align: "right" },
    { key: "desistencias", label: "Desistências", sortable: true, align: "right" },
    { key: "emAberto", label: "Candidaturas em aberto", sortable: true, align: "right" },
  ];

  const empresaRows: DataTableRow[] = Array.from(porEmpresa.entries()).map(([nome, v], i) => ({
    id: String(i),
    sortValues: { empresa: nome, ...v },
    cells: {
      empresa: <span className="font-bold text-text">{nome}</span>,
      vagasAbertas: <span className="font-extrabold text-navy">{v.vagasAbertas}</span>,
      contratados: <span className="font-extrabold text-success">{v.contratados}</span>,
      reprovados: <span className="font-extrabold text-danger">{v.reprovados}</span>,
      desistencias: <span className="text-text-2">{v.desistencias}</span>,
      emAberto: <span className="font-extrabold text-gold-3">{v.emAberto}</span>,
    },
  }));

  const vagasPorMes = new Map<string, number>();
  for (const j of vagasPorMesRaw ?? []) {
    const chave = mesChave(j.created_at);
    vagasPorMes.set(chave, (vagasPorMes.get(chave) ?? 0) + 1);
  }
  const vagasPorMesChart = Array.from(vagasPorMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, valor]) => ({ categoria: mesLabel(`${chave}-01`), valor, color: CHART_COLORS.destaque }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Estratégico</h1>
        <p className="mt-1 text-xs text-text-2">
          Visível só para superadministrador — aceitação de mercado e saúde financeira
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-5">
          <Kpi label="Empresas cadastradas" value={totalEmpresas ?? 0} />
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
            <h3 className="text-sm font-extrabold text-text">Vagas publicadas × preenchidas</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Taxa de preenchimento por modalidade</p>
            <GroupedBarChart
              data={modalidadeComparativo}
              series={[
                { key: "publicadas", name: "Publicadas (em aberto)", color: CHART_COLORS.info },
                { key: "preenchidas", name: "Preenchidas", color: CHART_COLORS.sucesso },
              ]}
            />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Candidaturas por etapa do pipeline</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Onde as candidaturas estão paradas hoje</p>
            {candidaturasChart.length === 0 ? (
              <p className="mt-8 text-center text-[12px] text-text-2">Nenhuma candidatura ainda.</p>
            ) : (
              <DonutChart data={candidaturasChart} />
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Candidatos por validação de cadastro</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Fila de moderação de perfis</p>
            <DonutChart data={candidatosValidacaoChart} />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Vagas cadastradas por mês</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Últimos 12 meses</p>
            {vagasPorMesChart.length === 0 ? (
              <p className="mt-8 text-center text-[12px] text-text-2">Sem dados no período.</p>
            ) : (
              <CategoryBarChart data={vagasPorMesChart} />
            )}
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-navy-bg p-3 text-[11px] font-semibold leading-relaxed text-navy">
          Quebra por região ainda não é possível: o cadastro de empresa hoje só tem um campo de
          endereço em texto livre, sem estado/região estruturados. Pra ter esse gráfico, precisa
          adicionar um campo de UF/região no cadastro (`/admin/empresas`) — não é ajuste de
          gráfico, é dado que ainda não é coletado de forma estruturada.
        </p>

        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-text">Histórico por empresa</h3>
          <p className="mb-3 mt-0.5 text-[11.5px] text-text-2">
            Contratados, reprovados (pelo cliente ou internamente), desistências e candidaturas
            ainda em aberto/aguardando tratativa — por empresa
          </p>
          {empresaRows.length === 0 ? (
            <p className="text-[12px] text-text-2">Nenhuma candidatura registrada ainda.</p>
          ) : (
            <DataTable columns={empresaColumns} rows={empresaRows} />
          )}
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
