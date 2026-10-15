import Link from "next/link";
import { exibirRemuneracao } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { alternarConfidencial, decidirVaga } from "./actions";
import { can, requireInternalUser } from "@/lib/auth/internal";
import { empresasParaFiltro, filtroConfidencialJobs, obterEscopo } from "@/lib/auth/escopo";
import { SubmitButton } from "@/components/form-buttons";
import { ETAPAS_EM_ABERTO } from "@/lib/dashboard";
import { CriarVagaForm } from "./criar-vaga-form";

const LIMITE_VAGAS = 500;

const FILTROS = [
  { valor: "ativas", rotulo: "Ativas", status: ["publicada", "pausada", "revisao", "rascunho"] },
  { valor: "abertas", rotulo: "Abertas", status: ["publicada"] },
  { valor: "pausadas", rotulo: "Pausadas", status: ["pausada"] },
  { valor: "pendentes", rotulo: "Rascunho e revisão", status: ["rascunho", "revisao"] },
  { valor: "canceladas", rotulo: "Canceladas", status: ["encerrada", "rejeitada", "suspensa", "arquivada"] },
  { valor: "todas", rotulo: "Todas", status: [] as string[] },
] as const;

const FECHADAS = ["encerrada", "rejeitada", "suspensa", "arquivada", "preenchida"];

const ROTULO_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  revisao: "Em revisão",
  publicada: "Publicada",
  pausada: "Pausada",
  preenchida: "Preenchida",
  encerrada: "Cancelada",
  rejeitada: "Rejeitada",
  suspensa: "Suspensa",
  arquivada: "Arquivada",
};

const COR_STATUS: Record<string, string> = {
  publicada: "bg-success-bg text-success",
  revisao: "bg-gold-bg text-gold-3",
  rascunho: "bg-black/5 text-text-2",
  pausada: "bg-gold-bg text-gold-3",
  preenchida: "bg-navy-bg text-navy",
  encerrada: "bg-danger-bg text-danger",
};

// Abertas, depois pausadas, depois o que ainda não abriu e, por fim, as canceladas.
const ORDEM_STATUS = ["publicada", "pausada", "revisao", "rascunho", "preenchida", "encerrada", "rejeitada", "suspensa", "arquivada"];

const ROTULO_MODALIDADE: Record<string, string> = { efetiva: "Efetiva", pj: "PJ", temporaria: "Temporária" };

type Empresa = { razao_social: string; nome_fantasia: string | null };

export default async function CadastroDeVagasPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string }>;
}) {
  const { role, user } = await requireInternalUser("jobs.manage");
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);
  const podePublicar = can(role, "jobs.publish");
  const sp = await searchParams;

  const filtro = FILTROS.find((f) => f.valor === sp.filtro) ?? FILTROS[0];
  const busca = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);

  let consultaVagas = admin
    .from("jobs")
    .select(
      "id, titulo, modalidade, status, descricao, requisitos, remuneracao_texto, local, company_id, confidencial, created_at, companies(razao_social, nome_fantasia)",
    )
    .order("created_at", { ascending: false })
    .limit(LIMITE_VAGAS);
  let consultaEmpresas = admin
    .from("companies")
    .select("id, razao_social, nome_fantasia")
    .eq("status", "aprovada");
  // Carteira: operador só vê as empresas atribuídas (e vagas confidenciais só
  // com acesso de confiança).
  if (!escopo.todos) {
    consultaVagas = consultaVagas
      .in("company_id", empresasParaFiltro(escopo))
      .or(filtroConfidencialJobs(escopo));
    consultaEmpresas = consultaEmpresas.in("id", empresasParaFiltro(escopo));
  }

  const [{ data: todasVagas }, { data: companies }] = await Promise.all([
    consultaVagas,
    consultaEmpresas.order("razao_social"),
  ]);
  const vagasBase = todasVagas ?? [];

  // Contagem por situação (alimenta os chips) e filtros aplicados.
  const contagem = new Map<string, number>();
  for (const f of FILTROS) {
    contagem.set(
      f.valor,
      f.status.length === 0 ? vagasBase.length : vagasBase.filter((v) => (f.status as readonly string[]).includes(v.status)).length,
    );
  }
  const jobs = vagasBase.filter(
    (v) =>
      (filtro.status.length === 0 || (filtro.status as readonly string[]).includes(v.status)) &&
      (!busca || v.titulo.toLowerCase().includes(busca.toLowerCase())),
  );

  // Candidaturas por vaga (total e em andamento).
  const ids = jobs.map((j) => j.id);
  const { data: apps } = ids.length
    ? await admin.from("applications").select("job_id, status").in("job_id", ids).limit(5000)
    : { data: [] as { job_id: string; status: string }[] };
  const total = new Map<string, number>();
  const andamento = new Map<string, number>();
  for (const a of apps ?? []) {
    total.set(a.job_id, (total.get(a.job_id) ?? 0) + 1);
    if (ETAPAS_EM_ABERTO.includes(a.status)) andamento.set(a.job_id, (andamento.get(a.job_id) ?? 0) + 1);
  }

  // Valores sugeridos ao criar vaga (última vaga da empresa).
  const defaultsByCompany: Record<
    string,
    { modalidade: string; local: string; remuneracao_texto: string; descricao: string; requisitos: string }
  > = {};
  for (const job of vagasBase) {
    if (!job.company_id || defaultsByCompany[job.company_id]) continue;
    defaultsByCompany[job.company_id] = {
      modalidade: job.modalidade ?? "",
      local: job.local ?? "",
      remuneracao_texto: job.remuneracao_texto ?? "",
      descricao: job.descricao ?? "",
      requisitos: job.requisitos ?? "",
    };
  }

  // Cascata: empresa → vagas.
  const grupos = new Map<string, { nome: string; vagas: typeof jobs }>();
  for (const j of jobs) {
    const emp = (Array.isArray(j.companies) ? j.companies[0] : j.companies) as Empresa | null;
    const nome = emp?.nome_fantasia ?? emp?.razao_social ?? "Sem empresa";
    const g = grupos.get(j.company_id) ?? { nome, vagas: [] };
    g.vagas.push(j);
    grupos.set(j.company_id, g);
  }
  const listaGrupos = [...grupos.entries()]
    .map(([id, g]) => ({
      id,
      nome: g.nome,
      vagas: [...g.vagas].sort(
        (a, b) => ORDEM_STATUS.indexOf(a.status) - ORDEM_STATUS.indexOf(b.status),
      ),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const abrirTodas = listaGrupos.length <= 3 || !!busca;

  const href = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = { filtro: sp.filtro, q: sp.q, ...extra };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/vagas?${s}` : "/admin/vagas";
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-text">Cadastro de vagas</h1>
            <p className="mt-1 text-xs text-text-2">
              {vagasBase.length} vaga{vagasBase.length === 1 ? "" : "s"} em {new Set(vagasBase.map((v) => v.company_id)).size}{" "}
              empresa(s) · toque na empresa e na vaga para abrir
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={href({ filtro: f.valor === "ativas" ? undefined : f.valor })}
              className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                filtro.valor === f.valor
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-surface text-text-2 hover:border-navy/40"
              }`}
            >
              {f.rotulo} <span className="opacity-70">{contagem.get(f.valor) ?? 0}</span>
            </Link>
          ))}
          <form className="ml-auto flex gap-2">
            {sp.filtro && <input type="hidden" name="filtro" value={sp.filtro} />}
            <input
              name="q"
              defaultValue={busca}
              placeholder="Buscar vaga"
              className="w-40 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] md:w-56"
            />
          </form>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-5">
        <details className="group mb-5 rounded-2xl border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[13px] font-extrabold text-navy">
            <span>+ Nova vaga</span>
            <span className="text-[11px] transition-transform group-open:rotate-90">▸</span>
          </summary>
          <div className="border-t border-border p-4">
            <CriarVagaForm
              companies={companies ?? []}
              defaultsByCompany={defaultsByCompany}
              podeConfidencial={role !== "operador"}
            />
          </div>
        </details>

        {listaGrupos.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">
            Nenhuma vaga neste filtro.{" "}
            <Link href={href({ filtro: "todas", q: undefined })} className="font-bold text-navy underline">
              Ver todas
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {listaGrupos.map((g) => {
              const publicadas = g.vagas.filter((v) => v.status === "publicada").length;
              const pendentes = g.vagas.filter((v) => v.status === "revisao" || v.status === "rascunho").length;
              return (
                <details
                  key={g.id}
                  open={abrirTodas}
                  className="group overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                    <span className="text-[11px] text-text-3 transition-transform group-open:rotate-90">▸</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-bg text-[13px] font-extrabold text-navy">
                      {g.nome.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-text">{g.nome}</span>
                    <span className="hidden gap-1.5 sm:flex">
                      {publicadas > 0 && (
                        <span className="rounded-full bg-success-bg px-2.5 py-1 text-[10.5px] font-extrabold text-success">
                          {publicadas} publicada{publicadas === 1 ? "" : "s"}
                        </span>
                      )}
                      {pendentes > 0 && (
                        <span className="rounded-full bg-gold-bg px-2.5 py-1 text-[10.5px] font-extrabold text-gold-3">
                          {pendentes} pendente{pendentes === 1 ? "" : "s"}
                        </span>
                      )}
                    </span>
                    <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10.5px] font-extrabold text-text-2">
                      {g.vagas.length}
                    </span>
                  </summary>

                  <div className="border-t border-border">
                    {g.vagas.map((job) => {
                      // Vaga publicada só sai do ar por quem tem jobs.publish.
                      const podeDecidir = podePublicar || job.status !== "publicada";
                      return (
                        <details key={job.id} className="group/vaga border-b border-border last:border-b-0">
                          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 hover:bg-bg">
                            <span className="text-[10px] text-text-3 transition-transform group-open/vaga:rotate-90">▸</span>
                            <span className="min-w-0 flex-1 basis-48 truncate text-[13px] font-bold text-text">
                              {job.titulo}
                              {job.confidencial && (
                                <span className="ml-2 rounded bg-danger-bg px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-danger">
                                  Sigilosa
                                </span>
                              )}
                            </span>
                            <span className="rounded-md bg-navy-bg px-2 py-0.5 text-[9.5px] font-extrabold uppercase text-navy">
                              {ROTULO_MODALIDADE[job.modalidade] ?? job.modalidade}
                            </span>
                            <span className="hidden w-32 truncate text-[11.5px] text-text-2 md:block">
                              {job.local ?? "—"}
                            </span>
                            <span className="hidden w-24 text-right text-[11.5px] font-bold text-text md:block">
                              {job.remuneracao_texto ? exibirRemuneracao(job.remuneracao_texto) : "—"}
                            </span>
                            <span className="w-24 text-right text-[11px] text-text-2">
                              {total.get(job.id) ?? 0} cand.
                              {(andamento.get(job.id) ?? 0) > 0 && (
                                <span className="text-text-3"> · {andamento.get(job.id)} ativas</span>
                              )}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                                COR_STATUS[job.status] ?? "bg-black/5 text-text-3"
                              }`}
                            >
                              {ROTULO_STATUS[job.status] ?? job.status}
                            </span>
                          </summary>

                          <div className="border-t border-border bg-bg/60 px-5 py-4">
                            {job.descricao && (
                              <p className="text-[12px] leading-relaxed text-text-2">{job.descricao}</p>
                            )}
                            {job.requisitos && (
                              <p className="mt-2 text-[11.5px] text-text-2">
                                <b className="text-text">Requisitos:</b> {job.requisitos}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]">
                              {job.status === "publicada" && (
                                <a
                                  href={`/vagas/${job.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-navy underline"
                                >
                                  Ver publicação →
                                </a>
                              )}
                              <Link href={`/admin/vagas/${job.id}`} className="font-bold text-navy underline">
                                Critérios e qualidade →
                              </Link>
                              <Link
                                href={`/admin?empresa=${job.company_id}&detalhe=candidatos`}
                                className="font-bold text-navy underline"
                              >
                                Ver candidatos no painel →
                              </Link>
                              {role !== "operador" && (
                                <form action={alternarConfidencial}>
                                  <input type="hidden" name="job_id" value={job.id} />
                                  <input type="hidden" name="valor" value={job.confidencial ? "false" : "true"} />
                                  <SubmitButton
                                    pendingLabel="Salvando..."
                                    className="font-bold text-navy underline"
                                  >
                                    {job.confidencial ? "Remover sigilo" : "Marcar como sigilosa"}
                                  </SubmitButton>
                                </form>
                              )}
                            </div>

                            <form action={decidirVaga} className="mt-3 flex flex-wrap items-center gap-2">
                              <input type="hidden" name="job_id" value={job.id} />
                              <input
                                name="motivo"
                                placeholder="Motivo (recomendado ao pausar, cancelar ou voltar a rascunho)"
                                className="min-w-0 flex-1 basis-60 rounded-lg border border-border bg-surface px-3 py-2 text-[12px]"
                              />
                              {job.status === "pausada" && podePublicar && (
                                <SubmitButton
                                  name="acao"
                                  value="reativar"
                                  pendingLabel="..."
                                  className="rounded-lg bg-success px-3 py-2 text-[11.5px] font-extrabold text-white"
                                >
                                  Reativar vaga
                                </SubmitButton>
                              )}
                              {job.status === "publicada" && podePublicar && (
                                <SubmitButton
                                  name="acao"
                                  value="pausar"
                                  pendingLabel="..."
                                  className="rounded-lg bg-gold px-3 py-2 text-[11.5px] font-extrabold text-[#1c1508]"
                                >
                                  Pausar
                                </SubmitButton>
                              )}
                              {(job.status === "rascunho" || job.status === "revisao") && podePublicar && (
                                <SubmitButton
                                  name="acao"
                                  value="publicar"
                                  pendingLabel="..."
                                  className="rounded-lg bg-success px-3 py-2 text-[11.5px] font-extrabold text-white"
                                >
                                  Publicar
                                </SubmitButton>
                              )}
                              {podeDecidir && job.status !== "rascunho" && (
                                <SubmitButton
                                  name="acao"
                                  value="corrigir"
                                  pendingLabel="..."
                                  className="rounded-lg border border-border bg-surface px-3 py-2 text-[11.5px] font-extrabold text-text-2"
                                >
                                  {FECHADAS.includes(job.status) ? "Reabrir como rascunho" : "Voltar a rascunho"}
                                </SubmitButton>
                              )}
                              {podeDecidir && !FECHADAS.includes(job.status) && (
                                <SubmitButton
                                  name="acao"
                                  value="encerrar"
                                  pendingLabel="..."
                                  className="rounded-lg bg-danger px-3 py-2 text-[11.5px] font-extrabold text-white"
                                >
                                  Cancelar vaga
                                </SubmitButton>
                              )}
                            </form>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {vagasBase.length >= LIMITE_VAGAS && (
          <p className="mt-4 rounded-xl bg-gold-bg px-4 py-3 text-xs text-text-2">
            Mostrando as {LIMITE_VAGAS} vagas mais recentes; use a busca para achar uma específica.
          </p>
        )}
      </div>
    </div>
  );
}
