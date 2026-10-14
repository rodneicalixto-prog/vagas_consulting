import Link from "next/link";
import { requireInternalUser } from "@/lib/auth/internal";
import { createAdminClient } from "@/lib/supabase/admin";
import { obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import { carregarEntrevistas } from "@/lib/agenda";
import { statusLabel } from "@/lib/format";

const ETAPAS = ["entrevista", "teste", "proposta"] as const;

function agoraMs(): number {
  return Date.now();
}

function dataHora(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export default async function AgendaPorEtapaPage() {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();
  const agora = agoraMs();
  const escopo = await obterEscopo(user.id, role);
  const vagasIds = await vagasVisiveis(escopo);

  let q = admin
    .from("applications")
    .select("id, candidate_id, job_id, status, updated_at, jobs(titulo, companies(nome_fantasia, razao_social))")
    .in("status", [...ETAPAS])
    .order("updated_at", { ascending: true })
    .limit(500);
  if (vagasIds) q = q.in("job_id", vagasIds);
  const { data: apps } = await q;

  const ids = [...new Set((apps ?? []).map((a) => a.candidate_id))];
  const { data: perfis } = ids.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", ids)
    : { data: [] as { id: string; nome_completo: string }[] };
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));

  // Próxima entrevista agendada por candidatura (a mais cedo que ainda vai ocorrer).
  const entrevistas = await carregarEntrevistas(user.id, role, 7, agora);
  const proxima = new Map<string, string>();
  for (const e of entrevistas) {
    if (e.status !== "agendado" || !e.applicationId) continue;
    if (new Date(e.inicio).getTime() < agora - 3600_000) continue;
    if (!proxima.has(e.applicationId)) proxima.set(e.applicationId, e.inicio);
  }

  const colunas = ETAPAS.map((etapa) => ({
    etapa,
    itens: (apps ?? [])
      .filter((a) => a.status === etapa)
      .map((a) => {
        const job = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
        const emp = job ? (Array.isArray(job.companies) ? job.companies[0] : job.companies) : null;
        return {
          id: a.id,
          candidatoId: a.candidate_id,
          candidato: nome.get(a.candidate_id) ?? "Candidato",
          vaga: job?.titulo ?? "—",
          empresa: emp?.nome_fantasia ?? emp?.razao_social ?? "—",
          quando: proxima.get(a.id) ?? null,
          dias: Math.max(0, Math.floor((agora - new Date(a.updated_at).getTime()) / 86_400_000)),
        };
      }),
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-text">Agenda por etapa</h1>
          <Link href="/admin/agenda" className="text-[11.5px] font-bold text-text-3 hover:text-text-2">
            ← Minha agenda
          </Link>
        </div>
        <p className="mt-1 text-xs text-text-2">
          Candidatos em cada etapa do quadro, com a data da próxima entrevista. Quem está na etapa e ainda{" "}
          <b>não tem data</b> aparece em destaque.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          {colunas.map(({ etapa, itens }) => (
            <section key={etapa} className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-text">{statusLabel[etapa]}</h3>
                <span className="rounded-full bg-navy-bg px-2 py-0.5 text-[10.5px] font-extrabold text-navy">
                  {itens.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {itens.length === 0 && <p className="text-[12px] text-text-3">Ninguém nesta etapa.</p>}
                {itens.map((i) => (
                  <Link
                    key={i.id}
                    href={`/admin/candidatos/${i.candidatoId}`}
                    className="rounded-lg border border-border p-2.5 transition-colors hover:border-navy/40"
                  >
                    <div className="truncate text-[12.5px] font-bold text-text">{i.candidato}</div>
                    <div className="truncate text-[11px] text-text-2">
                      {i.vaga} — {i.empresa}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
                      {i.quando ? (
                        <span className="rounded bg-success-bg px-1.5 py-0.5 font-extrabold text-success">
                          {dataHora(i.quando)}
                        </span>
                      ) : (
                        <span className="rounded bg-gold-bg px-1.5 py-0.5 font-extrabold text-gold-3">
                          Sem data
                        </span>
                      )}
                      <span className="text-text-3">{i.dias}d na etapa</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
