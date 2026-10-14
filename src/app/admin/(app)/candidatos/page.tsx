import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, requireInternalUser } from "@/lib/auth/internal";
import { candidatosVisiveis, obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import { statusLabel, statusPillClass } from "@/lib/format";
import { ETAPAS_EM_ABERTO, diasDesde } from "@/lib/dashboard";
import { validarCandidato } from "./actions";

const LIMITE_CANDIDATURAS = 3000;
const LIMITE_SEM_CANDIDATURA = 100;

const FILTROS = [
  { valor: "andamento", rotulo: "Em andamento", status: ETAPAS_EM_ABERTO },
  { valor: "aprovados", rotulo: "Contratados", status: ["contratado"] },
  { valor: "reprovados", rotulo: "Reprovados", status: ["rejeitada", "reprovado_cliente"] },
  { valor: "encerrados", rotulo: "Desistência e expirados", status: ["desistente", "expirada"] },
  { valor: "todos", rotulo: "Todos", status: [] as string[] },
] as const;

const VALIDACAO: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-gold-bg text-gold-3" },
  aprovado: { label: "Aprovado", className: "bg-success-bg text-success" },
  reprovado: { label: "Reprovado", className: "bg-danger-bg text-danger" },
};

type Empresa = { nome_fantasia: string | null; razao_social: string };

function agoraMs(): number {
  return Date.now();
}

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string }>;
}) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const sp = await searchParams;
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);
  const agora = agoraMs();
  const podeValidar = can(role, "platform.data");

  const filtro = FILTROS.find((f) => f.valor === sp.filtro) ?? FILTROS[0];
  const busca = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60).toLowerCase();

  // Carteira: operador só vê quem se candidatou/foi convidado a vaga visível.
  const visiveis = await candidatosVisiveis(escopo);
  const vagasIds = await vagasVisiveis(escopo);

  let qApps = admin
    .from("applications")
    .select("candidate_id, job_id, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(LIMITE_CANDIDATURAS);
  if (vagasIds) qApps = qApps.in("job_id", vagasIds);
  const { data: appsBrutas } = await qApps;
  const apps = appsBrutas ?? [];

  const idsVagas = [...new Set(apps.map((a) => a.job_id))];
  const idsCand = [...new Set(apps.map((a) => a.candidate_id))];

  const [{ data: vagas }, { data: perfis }, { data: usersPage }] = await Promise.all([
    idsVagas.length
      ? admin
          .from("jobs")
          .select("id, titulo, company_id, confidencial, companies(nome_fantasia, razao_social)")
          .in("id", idsVagas)
      : Promise.resolve({ data: [] as never[] }),
    idsCand.length
      ? admin
          .from("profiles")
          .select("id, nome_completo, cidade, status_validacao, blacklisted")
          .in("id", idsCand)
      : Promise.resolve({ data: [] as never[] }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const vagaPorId = new Map((vagas ?? []).map((v) => [v.id, v]));
  const perfilPorId = new Map((perfis ?? []).map((p) => [p.id, p]));
  const emailPorId = new Map(usersPage?.users.map((u) => [u.id, u.email]) ?? []);

  // Contagem dos chips (sobre toda a base visível, antes da busca).
  const contagem = new Map<string, number>();
  for (const f of FILTROS) {
    contagem.set(
      f.valor,
      f.status.length === 0 ? apps.length : apps.filter((a) => (f.status as readonly string[]).includes(a.status)).length,
    );
  }

  const filtradas = apps.filter((a) => {
    if (filtro.status.length > 0 && !(filtro.status as readonly string[]).includes(a.status)) return false;
    if (!busca) return true;
    const nome = perfilPorId.get(a.candidate_id)?.nome_completo?.toLowerCase() ?? "";
    const vaga = vagaPorId.get(a.job_id)?.titulo?.toLowerCase() ?? "";
    return nome.includes(busca) || vaga.includes(busca);
  });

  // Cascata: empresa → vaga → candidaturas.
  type Item = (typeof filtradas)[number];
  const empresas = new Map<string, { nome: string; vagas: Map<string, { titulo: string; itens: Item[] }> }>();
  for (const a of filtradas) {
    const v = vagaPorId.get(a.job_id);
    if (!v) continue;
    const emp = (Array.isArray(v.companies) ? v.companies[0] : v.companies) as Empresa | null;
    const nome = emp?.nome_fantasia ?? emp?.razao_social ?? "Sem empresa";
    const e = empresas.get(v.company_id) ?? { nome, vagas: new Map() };
    const g = e.vagas.get(v.id) ?? { titulo: v.titulo, itens: [] };
    g.itens.push(a);
    e.vagas.set(v.id, g);
    empresas.set(v.company_id, e);
  }
  const grupos = [...empresas.entries()]
    .map(([id, e]) => ({
      id,
      nome: e.nome,
      vagas: [...e.vagas.entries()].map(([vid, g]) => ({ id: vid, ...g })),
      total: [...e.vagas.values()].reduce((s, g) => s + g.itens.length, 0),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const abrirEmpresas = grupos.length <= 2 || !!busca;

  // Cadastrados sem candidatura (convite ou só cadastro).
  const candidatosComApp = new Set(idsCand);
  let qSem = admin
    .from("profiles")
    .select("id, nome_completo, cidade, status_validacao, blacklisted")
    .order("created_at", { ascending: false })
    .limit(LIMITE_SEM_CANDIDATURA);
  if (visiveis) qSem = qSem.in("id", visiveis);
  const { data: todosPerfis } = await qSem;
  const semCandidatura = (todosPerfis ?? []).filter(
    (p) => !candidatosComApp.has(p.id) && (!busca || p.nome_completo.toLowerCase().includes(busca)),
  );

  const href = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = { filtro: sp.filtro, q: sp.q, ...extra };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/candidatos?${s}` : "/admin/candidatos";
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Candidatos</h1>
        <p className="mt-1 text-xs text-text-2">
          Por empresa e vaga — {apps.length} candidatura{apps.length === 1 ? "" : "s"} · toque para abrir
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={href({ filtro: f.valor === "andamento" ? undefined : f.valor })}
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
              defaultValue={sp.q ?? ""}
              placeholder="Buscar candidato ou vaga"
              className="w-44 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] md:w-60"
            />
          </form>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-5">
        {grupos.length === 0 ? (
          <p className="mt-8 text-center text-sm text-text-2">
            Nenhuma candidatura neste filtro.{" "}
            <Link href={href({ filtro: "todos", q: undefined })} className="font-bold text-navy underline">
              Ver todos
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {grupos.map((g) => (
              <details key={g.id} open={abrirEmpresas} className="group overflow-hidden rounded-2xl border border-border bg-surface">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                  <span className="text-[11px] text-text-3 transition-transform group-open:rotate-90">▸</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-bg text-[13px] font-extrabold text-navy">
                    {g.nome.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-text">{g.nome}</span>
                  <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10.5px] font-extrabold text-text-2">
                    {g.vagas.length} vaga{g.vagas.length === 1 ? "" : "s"} · {g.total}
                  </span>
                </summary>

                <div className="border-t border-border">
                  {g.vagas.map((v) => (
                    <details key={v.id} open={g.vagas.length === 1 || !!busca} className="group/vaga border-b border-border last:border-b-0">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-2.5 hover:bg-bg">
                        <span className="text-[10px] text-text-3 transition-transform group-open/vaga:rotate-90">▸</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-text">{v.titulo}</span>
                        <span className="rounded-full bg-navy-bg px-2.5 py-0.5 text-[10.5px] font-extrabold text-navy">
                          {v.itens.length}
                        </span>
                      </summary>

                      <div className="bg-bg/60">
                        {v.itens.map((a) => {
                          const p = perfilPorId.get(a.candidate_id);
                          const val = VALIDACAO[p?.status_validacao ?? "pendente"] ?? VALIDACAO.pendente;
                          return (
                            <div
                              key={`${a.candidate_id}-${a.job_id}`}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-5 py-2 text-[12px] first:border-t-0"
                            >
                              <Link
                                href={`/admin/candidatos/${a.candidate_id}`}
                                className="min-w-0 flex-1 basis-44 truncate font-bold text-navy underline"
                              >
                                {p?.nome_completo ?? "Candidato"}
                                {p?.blacklisted && (
                                  <span className="ml-2 rounded bg-danger px-1.5 py-0.5 text-[9px] font-extrabold text-white no-underline">
                                    BLACK LIST
                                  </span>
                                )}
                              </Link>
                              <span className="hidden w-40 truncate text-[11px] text-text-3 md:block">
                                {emailPorId.get(a.candidate_id) ?? "—"}
                              </span>
                              <span className="hidden w-28 truncate text-text-2 md:block">{p?.cidade ?? "—"}</span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusPillClass[a.status as keyof typeof statusPillClass] ?? ""}`}
                              >
                                {statusLabel[a.status as keyof typeof statusLabel] ?? a.status}
                              </span>
                              <span className="w-16 text-right text-[11px] text-text-3">
                                {diasDesde(a.updated_at, agora)}d
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${val.className}`}>
                                {val.label}
                              </span>
                              {podeValidar && p && (
                                <span className="flex gap-1.5">
                                  <form action={validarCandidato}>
                                    <input type="hidden" name="candidate_id" value={a.candidate_id} />
                                    <input type="hidden" name="acao" value="aprovar" />
                                    <button
                                      type="submit"
                                      disabled={p.status_validacao === "aprovado"}
                                      className="rounded bg-success px-2 py-1 text-[10px] font-extrabold text-white disabled:opacity-40"
                                    >
                                      Aprovar
                                    </button>
                                  </form>
                                  <form action={validarCandidato}>
                                    <input type="hidden" name="candidate_id" value={a.candidate_id} />
                                    <input type="hidden" name="acao" value="reprovar" />
                                    <button
                                      type="submit"
                                      disabled={p.status_validacao === "reprovado"}
                                      className="rounded bg-danger px-2 py-1 text-[10px] font-extrabold text-white disabled:opacity-40"
                                    >
                                      Reprovar
                                    </button>
                                  </form>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}

        {semCandidatura.length > 0 && (
          <details className="group mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
              <span className="text-[11px] text-text-3 transition-transform group-open:rotate-90">▸</span>
              <span className="flex-1 text-[13.5px] font-extrabold text-text">Cadastrados sem candidatura</span>
              <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10.5px] font-extrabold text-text-2">
                {semCandidatura.length}
              </span>
            </summary>
            <div className="border-t border-border">
              {semCandidatura.map((p) => {
                const val = VALIDACAO[p.status_validacao] ?? VALIDACAO.pendente;
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-5 py-2 text-[12px] last:border-b-0"
                  >
                    <Link
                      href={`/admin/candidatos/${p.id}`}
                      className="min-w-0 flex-1 basis-44 truncate font-bold text-navy underline"
                    >
                      {p.nome_completo}
                    </Link>
                    <span className="hidden w-28 truncate text-text-2 md:block">{p.cidade ?? "—"}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${val.className}`}>
                      {val.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {apps.length >= LIMITE_CANDIDATURAS && (
          <p className="mt-4 rounded-xl bg-gold-bg px-4 py-3 text-xs text-text-2">
            Mostrando as {LIMITE_CANDIDATURAS} candidaturas mais recentes; use a busca para achar uma específica.
          </p>
        )}
      </div>
    </div>
  );
}
