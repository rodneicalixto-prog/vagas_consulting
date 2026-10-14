import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import {
  candidatosVisiveis,
  empresasParaFiltro,
  filtroConfidencialJobs,
  obterEscopo,
} from "@/lib/auth/escopo";
import { CategoryBarChart, DonutChart, FunnelBarChart, GroupedBarChart } from "@/components/charts";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/data-table";
import { CHART_COLORS, statusLabel } from "@/lib/format";
import {
  ETAPAS_EM_ABERTO,
  GRUPOS_ETAPA,
  PERIODOS,
  diasDesde,
  inicioPeriodo,
  parsePeriodo,
  semaforoVaga,
  semanasRecentes,
  type GrupoEtapa,
} from "@/lib/dashboard";

const LIMITE_LINHAS = 5000;

function agoraMs(): number {
  return Date.now();
}

type EmpresaRef = { nome_fantasia: string | null; razao_social: string; segmento: string | null };
type VagaRow = {
  id: string;
  titulo: string;
  status: string;
  modalidade: string;
  company_id: string;
  publicada_em: string | null;
  created_at: string;
  confidencial: boolean;
  companies: EmpresaRef | EmpresaRef[] | null;
};
type CandRow = {
  id: string;
  candidate_id: string;
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const COR_ETAPA: Record<string, string> = {
  recebida: CHART_COLORS.neutro,
  triagem: CHART_COLORS.atencao,
  entrevista: CHART_COLORS.info,
  teste: CHART_COLORS.destaque,
  proposta: "#0d9488",
  contratado: CHART_COLORS.sucesso,
  reprovados: CHART_COLORS.risco,
};

const ROTULO_GRUPO: Record<string, string> = {
  recebida: "Recebidas",
  triagem: "Em triagem",
  entrevista: "Aguardando entrevista",
  teste: "Em teste",
  proposta: "Proposta enviada",
  contratado: "Aprovados (contratados)",
  reprovados: "Reprovados",
};

const COR_SEMAFORO = {
  verde: "bg-success-bg text-success",
  amarelo: "bg-gold-bg text-gold-3",
  vermelho: "bg-danger-bg text-danger",
};

function empresaDe(v: VagaRow): EmpresaRef | null {
  return Array.isArray(v.companies) ? (v.companies[0] ?? null) : v.companies;
}

function nomeEmpresa(v: VagaRow): string {
  const e = empresaDe(v);
  return e?.nome_fantasia ?? e?.razao_social ?? "—";
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; empresa?: string; detalhe?: string }>;
}) {
  const { user, role } = await requireInternalUser("dashboard.read");
  const sp = await searchParams;
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);
  const ehAdminEmpresa = role === "admin_empresa";
  // Operador e admin da empresa: sem denúncias nem dados da plataforma.
  const ehOperador = role === "operador" || ehAdminEmpresa;

  const periodo = parsePeriodo(sp.periodo);
  const agora = agoraMs();
  const inicio = inicioPeriodo(periodo, agora);
  const detalhe = sp.detalhe ?? "";

  // Carteira: tudo abaixo respeita o escopo (o painel usa a chave de serviço).
  let qVagas = admin
    .from("jobs")
    .select(
      "id, titulo, status, modalidade, company_id, publicada_em, created_at, confidencial, companies(nome_fantasia, razao_social, segmento)",
    )
    .neq("status", "arquivada")
    .order("created_at", { ascending: false })
    .limit(2000);
  if (!escopo.todos) {
    qVagas = qVagas.in("company_id", empresasParaFiltro(escopo)).or(filtroConfidencialJobs(escopo));
  }
  if (sp.empresa && /^[0-9a-f-]{36}$/i.test(sp.empresa)) qVagas = qVagas.eq("company_id", sp.empresa);

  const { data: vagasBrutas } = await qVagas;
  const vagas = (vagasBrutas ?? []) as unknown as VagaRow[];
  const idsVagas = vagas.map((v) => v.id);

  let candidaturas: CandRow[] = [];
  if (idsVagas.length > 0) {
    let qc = admin
      .from("applications")
      .select("id, candidate_id, job_id, status, created_at, updated_at")
      .in("job_id", idsVagas)
      .order("created_at", { ascending: false })
      .limit(LIMITE_LINHAS);
    if (inicio !== null) qc = qc.gte("created_at", new Date(inicio).toISOString());
    const { data } = await qc;
    candidaturas = (data ?? []) as CandRow[];
  }

  const vagaPorId = new Map(vagas.map((v) => [v.id, v]));
  const contaGrupo = (g: GrupoEtapa) =>
    candidaturas.filter((c) => (GRUPOS_ETAPA[g] as readonly string[]).includes(c.status));
  const parados = candidaturas.filter(
    (c) => ETAPAS_EM_ABERTO.includes(c.status) && diasDesde(c.updated_at, agora) >= 7,
  );
  const candidatosDistintos = new Set(candidaturas.map((c) => c.candidate_id));

  // Candidatos cadastrados: admin vê a base; operador, só a carteira.
  const visiveis = await candidatosVisiveis(escopo);
  let totalCadastrados = visiveis ? visiveis.filter((i) => !i.startsWith("00000000")).length : 0;
  if (!visiveis) {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
    totalCadastrados = count ?? 0;
  }

  const abertas = vagas.filter((v) => v.status === "publicada");
  const preenchidas = vagas.filter((v) => v.status === "preenchida");

  // ── gráficos ──────────────────────────────────────────────
  const funil = (Object.keys(GRUPOS_ETAPA) as GrupoEtapa[])
    .filter((g) => g !== "reprovados")
    .map((g) => ({ etapa: ROTULO_GRUPO[g], valor: contaGrupo(g).length, color: COR_ETAPA[g] }));

  const porSetor = new Map<string, number>();
  for (const v of vagas.filter((x) => x.status === "publicada")) {
    const s = empresaDe(v)?.segmento?.trim() || "Sem setor";
    porSetor.set(s, (porSetor.get(s) ?? 0) + 1);
  }
  const setores = [...porSetor.entries()].map(([categoria, valor]) => ({
    categoria,
    valor,
    color: CHART_COLORS.info,
  }));

  const statusVagas = new Map<string, number>();
  for (const v of vagas) statusVagas.set(v.status, (statusVagas.get(v.status) ?? 0) + 1);
  const rotuloVaga: Record<string, string> = {
    rascunho: "Rascunho",
    revisao: "Em revisão",
    publicada: "Publicada",
    pausada: "Pausada",
    preenchida: "Preenchida",
    encerrada: "Encerrada",
    rejeitada: "Rejeitada",
    suspensa: "Suspensa",
  };
  const donutVagas = [...statusVagas.entries()].map(([k, valor]) => ({
    categoria: rotuloVaga[k] ?? k,
    valor,
    color:
      k === "publicada" ? CHART_COLORS.sucesso : k === "preenchida" ? CHART_COLORS.info : CHART_COLORS.neutro,
  }));

  const semanas = semanasRecentes(8, agora).map((s) => ({
    semana: s.rotulo,
    "Candidaturas novas": candidaturas.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= s.inicio && t < s.fim;
    }).length,
    Contratações: candidaturas.filter((c) => {
      const t = new Date(c.updated_at).getTime();
      return c.status === "contratado" && t >= s.inicio && t < s.fim;
    }).length,
  }));

  // ── tabela: tempo das vagas em aberto ─────────────────────
  const colsVagas: DataTableColumn[] = [
    { key: "vaga", label: "Vaga", sortable: true },
    { key: "empresa", label: "Empresa", sortable: true },
    { key: "dias", label: "Aberta há", sortable: true },
    { key: "cand", label: "Candidaturas", sortable: true },
    { key: "andamento", label: "Em andamento", sortable: true },
    { key: "contratados", label: "Contratados", sortable: true },
  ];
  const linhasVagas: DataTableRow[] = abertas.map((v) => {
    const dias = diasDesde(v.publicada_em ?? v.created_at, agora);
    const cs = candidaturas.filter((c) => c.job_id === v.id);
    const andamento = cs.filter((c) => ETAPAS_EM_ABERTO.includes(c.status)).length;
    const contratados = cs.filter((c) => c.status === "contratado").length;
    return {
      id: v.id,
      sortValues: {
        vaga: v.titulo,
        empresa: nomeEmpresa(v),
        dias,
        cand: cs.length,
        andamento,
        contratados,
      },
      cells: {
        vaga: (
          <span className="font-bold text-text">
            {v.titulo}
            {v.confidencial && (
              <span className="ml-2 rounded bg-danger-bg px-1.5 py-0.5 text-[9px] font-extrabold text-danger">
                CONFIDENCIAL
              </span>
            )}
          </span>
        ),
        empresa: <span className="text-text-2">{nomeEmpresa(v)}</span>,
        dias: (
          <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${COR_SEMAFORO[semaforoVaga(dias)]}`}>
            {dias} dia{dias === 1 ? "" : "s"}
          </span>
        ),
        cand: <span className="text-text-2">{cs.length}</span>,
        andamento: <span className="text-text-2">{andamento}</span>,
        contratados: <span className="font-bold text-success">{contratados}</span>,
      },
    };
  });

  // ── detalhe (clique no card) ──────────────────────────────
  const gruposValidos = Object.keys(GRUPOS_ETAPA);
  let tituloDetalhe = "";
  let colsDetalhe: DataTableColumn[] = [];
  let linhasDetalhe: DataTableRow[] = [];

  const listaVagas = (lista: VagaRow[]) => {
    colsDetalhe = [
      { key: "vaga", label: "Vaga", sortable: true },
      { key: "empresa", label: "Empresa", sortable: true },
      { key: "status", label: "Status", sortable: true },
      { key: "dias", label: "Criada há", sortable: true },
    ];
    linhasDetalhe = lista.map((v) => ({
      id: v.id,
      sortValues: {
        vaga: v.titulo,
        empresa: nomeEmpresa(v),
        status: v.status,
        dias: diasDesde(v.created_at, agora),
      },
      cells: {
        vaga: <span className="font-bold text-text">{v.titulo}</span>,
        empresa: <span className="text-text-2">{nomeEmpresa(v)}</span>,
        status: <span className="text-text-2">{rotuloVaga[v.status] ?? v.status}</span>,
        dias: <span className="text-text-2">{diasDesde(v.created_at, agora)} dias</span>,
      },
    }));
  };

  let candDetalhe: CandRow[] | null = null;
  if (detalhe === "vagas_total") {
    tituloDetalhe = "Todas as vagas";
    listaVagas(vagas);
  } else if (detalhe === "vagas_abertas") {
    tituloDetalhe = "Vagas em aberto";
    listaVagas(abertas);
  } else if (detalhe === "vagas_preenchidas") {
    tituloDetalhe = "Vagas preenchidas";
    listaVagas(preenchidas);
  } else if (detalhe === "parados") {
    tituloDetalhe = "Candidaturas sem movimento há 7+ dias";
    candDetalhe = parados;
  } else if (detalhe === "candidatos") {
    tituloDetalhe = "Candidatos com candidatura no período";
    const vistos = new Set<string>();
    candDetalhe = candidaturas.filter((c) => (vistos.has(c.candidate_id) ? false : (vistos.add(c.candidate_id), true)));
  } else if (gruposValidos.includes(detalhe)) {
    tituloDetalhe = ROTULO_GRUPO[detalhe];
    candDetalhe = contaGrupo(detalhe as GrupoEtapa);
  }

  // Nomes: kanban (até 5 por coluna) + detalhe (até 100). Nunca contato.
  const colunasKanban = (Object.keys(GRUPOS_ETAPA) as GrupoEtapa[]).map((g) => ({
    grupo: g,
    itens: contaGrupo(g),
  }));
  const idsNomes = new Set<string>();
  for (const c of colunasKanban) c.itens.slice(0, 5).forEach((i) => idsNomes.add(i.candidate_id));
  (candDetalhe ?? []).slice(0, 100).forEach((i) => idsNomes.add(i.candidate_id));
  const { data: perfis } = idsNomes.size
    ? await admin.from("profiles").select("id, nome_completo").in("id", [...idsNomes])
    : { data: [] as { id: string; nome_completo: string }[] };
  const nomePorId = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));

  if (candDetalhe) {
    colsDetalhe = [
      { key: "cand", label: "Candidato", sortable: true },
      { key: "vaga", label: "Vaga", sortable: true },
      { key: "etapa", label: "Etapa", sortable: true },
      { key: "dias", label: "Na etapa há", sortable: true },
    ];
    linhasDetalhe = candDetalhe.slice(0, 100).map((c) => {
      const v = vagaPorId.get(c.job_id);
      const dias = diasDesde(c.updated_at, agora);
      return {
        id: c.id,
        sortValues: {
          cand: nomePorId.get(c.candidate_id) ?? "",
          vaga: v?.titulo ?? "",
          etapa: c.status,
          dias,
        },
        cells: {
          cand: (
            <Link href={`/admin/candidatos/${c.candidate_id}`} className="font-bold text-navy underline">
              {nomePorId.get(c.candidate_id) ?? "Candidato"}
            </Link>
          ),
          vaga: <span className="text-text-2">{v ? `${v.titulo} — ${nomeEmpresa(v)}` : "—"}</span>,
          etapa: (
            <span className="text-text-2">{statusLabel[c.status as keyof typeof statusLabel] ?? c.status}</span>
          ),
          dias: <span className="text-text-2">{dias} dias</span>,
        },
      };
    });
  }

  // ── filas administrativas (como antes) ────────────────────
  let qFilaEmpresas = admin
    .from("companies")
    .select("id, razao_social, nome_fantasia, status")
    .in("status", ["em_analise", "ajustes"]);
  if (!escopo.todos) qFilaEmpresas = qFilaEmpresas.in("id", empresasParaFiltro(escopo));
  const { data: filaEmpresas } = await qFilaEmpresas.order("created_at", { ascending: true }).limit(5);
  const filaVagas = vagas.filter((v) => v.status === "revisao").slice(0, 5);

  const { count: denunciasAbertas } = ehOperador
    ? { count: 0 }
    : await admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "aberta");

  // Empresas do filtro (apenas as que o usuário enxerga)
  let qEmp = admin.from("companies").select("id, nome_fantasia, razao_social").eq("status", "aprovada");
  if (!escopo.todos) qEmp = qEmp.in("id", empresasParaFiltro(escopo));
  const { data: empresasFiltro } = await qEmp.order("razao_social");

  const link = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      periodo: sp.periodo,
      empresa: sp.empresa,
      detalhe: sp.detalhe,
      ...extra,
    };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Visão geral</h1>
        <p className="mt-1 text-xs text-text-2">
          {ehAdminEmpresa ? "Indicadores da sua empresa" : ehOperador ? "Indicadores da sua carteira" : "Indicadores de todas as empresas"} · clique em um card para ver
          os dados
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {PERIODOS.map((p) => (
            <Link
              key={p.valor}
              href={link({ periodo: p.valor, detalhe: undefined })}
              className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                periodo === p.valor
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-surface text-text-2 hover:border-navy/40"
              }`}
            >
              {p.rotulo}
            </Link>
          ))}
          {(empresasFiltro ?? []).length > 1 && (
            <>
              <span className="mx-1 text-text-3">|</span>
              <Link
                href={link({ empresa: undefined, detalhe: undefined })}
                className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                  !sp.empresa ? "border-navy bg-navy text-white" : "border-border bg-surface text-text-2"
                }`}
              >
                Todas as empresas
              </Link>
              {(empresasFiltro ?? []).map((e) => (
                <Link
                  key={e.id}
                  href={link({ empresa: e.id, detalhe: undefined })}
                  className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                    sp.empresa === e.id ? "border-navy bg-navy text-white" : "border-border bg-surface text-text-2"
                  }`}
                >
                  {e.nome_fantasia ?? e.razao_social}
                </Link>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Vagas" value={vagas.length} href={link({ detalhe: "vagas_total" })} ativo={detalhe === "vagas_total"} />
          <Kpi label="Vagas em aberto" value={abertas.length} href={link({ detalhe: "vagas_abertas" })} ativo={detalhe === "vagas_abertas"} />
          <Kpi label="Vagas preenchidas" value={preenchidas.length} href={link({ detalhe: "vagas_preenchidas" })} ativo={detalhe === "vagas_preenchidas"} />
          <Kpi
            label={ehAdminEmpresa ? "Candidatos da sua empresa" : ehOperador ? "Candidatos da carteira" : "Candidatos cadastrados"}
            value={totalCadastrados}
            href="/admin/candidatos"
          />
          <Kpi label="Candidatos no período" value={candidatosDistintos.size} href={link({ detalhe: "candidatos" })} ativo={detalhe === "candidatos"} />
          <Kpi label="Em triagem" value={contaGrupo("triagem").length} href={link({ detalhe: "triagem" })} ativo={detalhe === "triagem"} />
          <Kpi label="Aguardando entrevista" value={contaGrupo("entrevista").length} href={link({ detalhe: "entrevista" })} ativo={detalhe === "entrevista"} />
          <Kpi label="Em teste" value={contaGrupo("teste").length} href={link({ detalhe: "teste" })} ativo={detalhe === "teste"} />
          <Kpi label="Aguardando exame médico" value={0} nota="Etapa em implantação" />
          <Kpi label="Proposta enviada" value={contaGrupo("proposta").length} href={link({ detalhe: "proposta" })} ativo={detalhe === "proposta"} />
          <Kpi label="Aprovados" value={contaGrupo("contratado").length} href={link({ detalhe: "contratado" })} ativo={detalhe === "contratado"} tom="ok" />
          <Kpi label="Reprovados" value={contaGrupo("reprovados").length} href={link({ detalhe: "reprovados" })} ativo={detalhe === "reprovados"} tom="alerta" />
          <Kpi label="Sem movimento 7+ dias" value={parados.length} href={link({ detalhe: "parados" })} ativo={detalhe === "parados"} tom="alerta" />
          {!ehOperador && (
            <Kpi label="Denúncias abertas" value={denunciasAbertas ?? 0} href="/admin/denuncias" tom="alerta" />
          )}
        </div>

        {tituloDetalhe && (
          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-text">{tituloDetalhe}</h3>
              <Link href={link({ detalhe: undefined })} className="text-[11.5px] font-bold text-navy underline">
                Fechar
              </Link>
            </div>
            {linhasDetalhe.length === 0 ? (
              <p className="rounded-2xl border border-border bg-surface px-5 py-6 text-xs text-text-2">
                Nada nesta categoria para o período e filtros escolhidos.
              </p>
            ) : (
              <DataTable columns={colsDetalhe} rows={linhasDetalhe} />
            )}
          </section>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Painel titulo="Funil de candidaturas" vazio={funil.every((f) => f.valor === 0)}>
            <FunnelBarChart data={funil} />
          </Painel>
          <Painel titulo="Evolução semanal" vazio={semanas.every((s) => s["Candidaturas novas"] + s.Contratações === 0)}>
            <GroupedBarChart
              data={semanas}
              series={[
                { key: "Candidaturas novas", name: "Candidaturas novas", color: CHART_COLORS.info },
                { key: "Contratações", name: "Contratações", color: CHART_COLORS.sucesso },
              ]}
            />
          </Painel>
          <Painel titulo="Vagas em aberto por setor" vazio={setores.length === 0}>
            <CategoryBarChart data={setores} />
          </Painel>
          <Painel titulo="Vagas por situação" vazio={donutVagas.length === 0}>
            <DonutChart data={donutVagas} />
          </Painel>
        </div>

        <section className="mt-6">
          <h3 className="mb-2 text-sm font-extrabold text-text">Tempo das vagas em aberto</h3>
          {linhasVagas.length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface px-5 py-6 text-xs text-text-2">
              Nenhuma vaga publicada neste filtro.
            </p>
          ) : (
            <DataTable columns={colsVagas} rows={linhasVagas} />
          )}
          <p className="mt-2 text-[11px] text-text-3">
            Verde até 15 dias, amarelo de 16 a 30, vermelho acima de 30.
          </p>
        </section>

        <section className="mt-6">
          <h3 className="mb-2 text-sm font-extrabold text-text">Quadro de candidaturas (somente leitura)</h3>
          <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
            {colunasKanban.map(({ grupo, itens }) => (
              <div key={grupo} className="rounded-2xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-text">{ROTULO_GRUPO[grupo]}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                    style={{ background: COR_ETAPA[grupo] }}
                  >
                    {itens.length}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {itens.slice(0, 5).map((c) => (
                    <div key={c.id} className="rounded-lg border border-border px-2 py-1.5">
                      <div className="truncate text-[11.5px] font-bold text-text">
                        {nomePorId.get(c.candidate_id) ?? "Candidato"}
                      </div>
                      <div className="truncate text-[10.5px] text-text-2">
                        {vagaPorId.get(c.job_id)?.titulo ?? "—"} · {diasDesde(c.updated_at, agora)}d
                      </div>
                    </div>
                  ))}
                  {itens.length > 5 && (
                    <Link href={link({ detalhe: grupo })} className="text-[11px] font-bold text-navy underline">
                      Ver todos ({itens.length})
                    </Link>
                  )}
                  {itens.length === 0 && <span className="text-[11px] text-text-3">Vazio</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Empresas em análise</h3>
            <div className="mt-3.5 flex flex-col gap-2">
              {(filaEmpresas ?? []).length === 0 && (
                <p className="text-[12px] text-text-2">Nenhuma empresa aguardando.</p>
              )}
              {(filaEmpresas ?? []).map((c) => (
                <Link
                  key={c.id}
                  href="/admin/empresas"
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 transition-colors hover:border-navy/30"
                >
                  <span className="text-[12.5px] font-bold text-text">{c.nome_fantasia ?? c.razao_social}</span>
                  <span className="rounded bg-danger-bg px-2 py-0.5 text-[10px] font-extrabold text-danger">
                    {c.status === "ajustes" ? "Ajustes pendentes" : "Em análise"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Vagas para cadastrar</h3>
            <div className="mt-3.5 flex flex-col gap-2">
              {filaVagas.length === 0 && <p className="text-[12px] text-text-2">Nenhuma solicitação aguardando.</p>}
              {filaVagas.map((j) => (
                <Link
                  key={j.id}
                  href="/admin/vagas"
                  className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 transition-colors hover:border-navy/30"
                >
                  <span className="rounded-md bg-navy-bg px-2 py-1 text-[9.5px] font-extrabold uppercase text-navy">
                    {j.modalidade}
                  </span>
                  <span className="text-[12.5px] font-bold text-text">{j.titulo}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {candidaturas.length >= LIMITE_LINHAS && (
          <p className="mt-4 rounded-xl bg-gold-bg px-4 py-3 text-xs text-text-2">
            Mostrando as {LIMITE_LINHAS} candidaturas mais recentes do período; reduza o período para ver tudo.
          </p>
        )}
      </div>
    </div>
  );
}

function Painel({ titulo, vazio, children }: { titulo: string; vazio: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-3 text-sm font-extrabold text-text">{titulo}</h3>
      {vazio ? <p className="py-8 text-center text-xs text-text-3">Sem dados no período.</p> : children}
    </div>
  );
}

function Kpi({
  label,
  value,
  href,
  ativo = false,
  tom = "normal",
  nota,
}: {
  label: string;
  value: number;
  href?: string;
  ativo?: boolean;
  tom?: "normal" | "ok" | "alerta";
  nota?: string;
}) {
  const cor = tom === "alerta" ? "text-danger" : tom === "ok" ? "text-success" : "text-navy";
  const conteudo = (
    <>
      <div className="text-[10.5px] font-bold uppercase text-text-2">{label}</div>
      <div className={`mt-1.5 text-[23px] font-extrabold ${cor}`}>{value}</div>
      {nota && <div className="mt-0.5 text-[10px] text-text-3">{nota}</div>}
    </>
  );
  const base = `rounded-2xl border bg-surface p-4 transition-colors ${
    ativo ? "border-navy ring-1 ring-navy/20" : "border-border"
  }`;
  if (!href) return <div className={`${base} opacity-70`}>{conteudo}</div>;
  return (
    <Link href={href} className={`${base} hover:border-navy/40`}>
      {conteudo}
    </Link>
  );
}
