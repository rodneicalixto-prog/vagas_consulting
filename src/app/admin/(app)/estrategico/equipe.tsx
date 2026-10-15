import { createAdminClient } from "@/lib/supabase/admin";
import { candidatosVisiveis, obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import { CategoryBarChart, DonutChart, FunnelBarChart, GroupedBarChart } from "@/components/charts";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/data-table";
import { CHART_COLORS, STATUS_CANDIDATURA_EM_ABERTO, statusLabel } from "@/lib/format";
import type { Enums } from "@/lib/supabase/types";

function agoraMs(): number {
  return Date.now();
}

type EmpresaRef = { nome_fantasia: string | null; razao_social: string };

const MODALIDADE_LABEL: Record<string, string> = { efetiva: "Efetiva", pj: "PJ", temporaria: "Temporária" };

const COR_ETAPA: Record<string, string> = {
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

function mesChave(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesLabel(chave: string): string {
  return new Date(`${chave}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

/**
 * Estratégico da equipe (operador e admin da empresa): a mesma leitura, mas
 * só com a carteira de quem está vendo. Sem leads, instalações nem valores.
 */
export async function EstrategicoEquipe({ userId, role }: { userId: string; role: string }) {
  const admin = createAdminClient();
  const escopo = await obterEscopo(userId, role as Parameters<typeof obterEscopo>[1]);
  const [vagasIds, candidatosIds] = await Promise.all([vagasVisiveis(escopo), candidatosVisiveis(escopo)]);
  const semVagas = vagasIds !== null && vagasIds.length === 0;

  type VagaRow = {
    id: string;
    status: string;
    modalidade: string;
    created_at: string;
    companies: EmpresaRef | EmpresaRef[] | null;
  };
  type CandRow = { status: Enums<"status_candidatura">; job_id: string };

  let vagas: VagaRow[] = [];
  let candidaturas: CandRow[] = [];
  if (!semVagas) {
    let qv = admin
      .from("jobs")
      .select("id, status, modalidade, created_at, companies(nome_fantasia, razao_social)")
      .neq("status", "arquivada")
      .limit(2000);
    if (vagasIds) qv = qv.in("id", vagasIds);
    const { data: v } = await qv;
    vagas = (v ?? []) as unknown as VagaRow[];

    if (vagas.length > 0) {
      const { data: c } = await admin
        .from("applications")
        .select("status, job_id")
        .in(
          "job_id",
          vagas.map((x) => x.id),
        )
        .limit(5000);
      candidaturas = (c ?? []) as CandRow[];
    }
  }

  const empresaDe = (v: VagaRow) => {
    const e = Array.isArray(v.companies) ? v.companies[0] : v.companies;
    return e?.nome_fantasia ?? e?.razao_social ?? "Sem empresa";
  };
  const vagaPorId = new Map(vagas.map((v) => [v.id, v]));

  const contratados = candidaturas.filter((c) => c.status === "contratado").length;
  const totalEmpresas = escopo.todos ? new Set(vagas.map(empresaDe)).size : escopo.empresas.length;
  const totalCandidatos = candidatosIds ? candidatosIds.length : 0;

  const funil = [
    { etapa: "Candidatos", valor: totalCandidatos, color: CHART_COLORS.destaque },
    { etapa: "Candidaturas", valor: candidaturas.length, color: CHART_COLORS.atencao },
    {
      etapa: "Em andamento",
      valor: candidaturas.filter((c) => STATUS_CANDIDATURA_EM_ABERTO.includes(c.status)).length,
      color: CHART_COLORS.info,
    },
    { etapa: "Contratados", valor: contratados, color: CHART_COLORS.sucesso },
  ];

  const porEtapa: Partial<Record<Enums<"status_candidatura">, number>> = {};
  for (const c of candidaturas) porEtapa[c.status] = (porEtapa[c.status] ?? 0) + 1;
  const etapasChart = Object.entries(porEtapa)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([status, n]) => ({
      categoria: statusLabel[status as Enums<"status_candidatura">],
      valor: n as number,
      color: COR_ETAPA[status] ?? CHART_COLORS.neutro,
    }));

  const modal: Record<string, { publicadas: number; preenchidas: number }> = {};
  for (const v of vagas) {
    if (v.status !== "publicada" && v.status !== "preenchida") continue;
    const b = (modal[v.modalidade] ??= { publicadas: 0, preenchidas: 0 });
    if (v.status === "publicada") b.publicadas += 1;
    else b.preenchidas += 1;
  }
  const modalidadeChart = Object.entries(modal).map(([m, v]) => ({
    categoria: MODALIDADE_LABEL[m] ?? m,
    publicadas: v.publicadas,
    preenchidas: v.preenchidas,
  }));

  const porMes = new Map<string, number>();
  const limiteMes = agoraMs() - 365 * 86_400_000;
  for (const v of vagas) {
    if (new Date(v.created_at).getTime() < limiteMes) continue;
    const k = mesChave(v.created_at);
    porMes.set(k, (porMes.get(k) ?? 0) + 1);
  }
  const mesesChart = [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, valor]) => ({ categoria: mesLabel(k), valor, color: CHART_COLORS.destaque }));

  const porEmpresa = new Map<
    string,
    { vagasAbertas: number; contratados: number; reprovados: number; desistencias: number; emAberto: number }
  >();
  const bucket = (nome: string) => {
    let b = porEmpresa.get(nome);
    if (!b) {
      b = { vagasAbertas: 0, contratados: 0, reprovados: 0, desistencias: 0, emAberto: 0 };
      porEmpresa.set(nome, b);
    }
    return b;
  };
  for (const v of vagas) if (v.status === "publicada") bucket(empresaDe(v)).vagasAbertas += 1;
  for (const c of candidaturas) {
    const vaga = vagaPorId.get(c.job_id);
    if (!vaga) continue;
    const b = bucket(empresaDe(vaga));
    if (c.status === "contratado") b.contratados += 1;
    else if (c.status === "reprovado_cliente" || c.status === "rejeitada") b.reprovados += 1;
    else if (c.status === "desistente") b.desistencias += 1;
    else if (STATUS_CANDIDATURA_EM_ABERTO.includes(c.status)) b.emAberto += 1;
  }

  const colunas: DataTableColumn[] = [
    { key: "empresa", label: "Empresa", sortable: true },
    { key: "vagasAbertas", label: "Vagas abertas", sortable: true, align: "right" },
    { key: "contratados", label: "Contratados", sortable: true, align: "right" },
    { key: "reprovados", label: "Reprovados", sortable: true, align: "right" },
    { key: "desistencias", label: "Desistências", sortable: true, align: "right" },
    { key: "emAberto", label: "Em aberto", sortable: true, align: "right" },
  ];
  const linhas: DataTableRow[] = [...porEmpresa.entries()].map(([nome, v], i) => ({
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Estratégico</h1>
        <p className="mt-1 text-xs text-text-2">
          Visão da sua carteira: funil, etapas, vagas e resultado por empresa. Sem valores financeiros.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          <Kpi label="Empresas na carteira" value={totalEmpresas} />
          <Kpi label="Candidatos da carteira" value={totalCandidatos} />
          <Kpi label="Candidaturas" value={candidaturas.length} />
          <Kpi label="Contratações fechadas" value={contratados} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Funil de conversão</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Candidatos → candidaturas → em andamento → contratados</p>
            <FunnelBarChart data={funil} />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Candidaturas por etapa</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Onde as candidaturas estão hoje</p>
            {etapasChart.length === 0 ? (
              <p className="mt-8 text-center text-[12px] text-text-2">Nenhuma candidatura ainda.</p>
            ) : (
              <DonutChart data={etapasChart} />
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Vagas publicadas × preenchidas</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Por modalidade</p>
            {modalidadeChart.length === 0 ? (
              <p className="mt-8 text-center text-[12px] text-text-2">Nenhuma vaga publicada ainda.</p>
            ) : (
              <GroupedBarChart
                data={modalidadeChart}
                series={[
                  { key: "publicadas", name: "Publicadas (em aberto)", color: CHART_COLORS.info },
                  { key: "preenchidas", name: "Preenchidas", color: CHART_COLORS.sucesso },
                ]}
              />
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Vagas cadastradas por mês</h3>
            <p className="mb-1 mt-0.5 text-[11.5px] text-text-2">Últimos 12 meses</p>
            {mesesChart.length === 0 ? (
              <p className="mt-8 text-center text-[12px] text-text-2">Sem dados no período.</p>
            ) : (
              <CategoryBarChart data={mesesChart} />
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-text">Histórico por empresa</h3>
          <p className="mb-3 mt-0.5 text-[11.5px] text-text-2">
            Contratados, reprovados, desistências e candidaturas em aberto, por empresa da carteira
          </p>
          {linhas.length === 0 ? (
            <p className="text-[12px] text-text-2">Nenhuma candidatura registrada ainda.</p>
          ) : (
            <DataTable columns={colunas} rows={linhas} />
          )}
        </div>
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
