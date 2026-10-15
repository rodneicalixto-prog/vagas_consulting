import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { GerarLaudoForm } from "./form-laudo";

export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LaudosPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);
  const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";

  const admin = createAdminClient();
  const { data: vaga } = await admin.from("jobs").select("id, titulo").eq("id", id).maybeSingle();
  if (!vaga) redirect("/admin/vagas");

  const [{ data: apps }, { data: laudos }] = await Promise.all([
    admin.from("applications").select("id, candidate_id").eq("job_id", id).limit(200),
    admin
      .from("candidate_reports")
      .select("id, application_id, versao, modo, status, criado_por, created_at")
      .eq("job_id", id)
      .order("versao", { ascending: false })
      .limit(500),
  ]);
  const candIds = [...new Set((apps ?? []).map((a) => a.candidate_id))];
  const { data: perfis } = candIds.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", candIds)
    : { data: [] as { id: string; nome_completo: string }[] };
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));
  const visiveis = (laudos ?? []).filter((l) => gestao || l.criado_por === user.id);
  const porApp = new Map<string, typeof visiveis>();
  for (const l of visiveis) porApp.set(l.application_id, [...(porApp.get(l.application_id) ?? []), l]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${vaga.id}`} className="text-[11.5px] font-bold text-navy underline">
          ← Critérios da vaga
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Laudos dos candidatos</h1>
        <p className="mt-1 text-xs text-text-2">
          {vaga.titulo}. Cargo × candidato, montado com o que já foi salvo na triagem, na entrevista e nos testes.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        <form id="comparar" action={`/admin/vagas/${vaga.id}/laudos/comparativo`} method="get" />
        <div className="grid gap-3">
          {(apps ?? []).length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface p-5 text-[12.5px] text-text-2">
              Esta vaga ainda não tem candidaturas.
            </p>
          ) : (
            <ul className="grid gap-3">
              {(apps ?? []).map((a) => {
                const meus = porApp.get(a.id) ?? [];
                return (
                  <li key={a.id} className="grid gap-2 rounded-2xl border border-border bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm font-extrabold text-text">
                        <input type="checkbox" name="ids" value={a.id} form="comparar" />
                        {nome.get(a.candidate_id) ?? "Candidato"}
                      </label>
                      <span className="flex flex-wrap gap-2 text-[11.5px]">
                        {meus.map((l) => (
                          <Link key={l.id} href={`/admin/vagas/${vaga.id}/laudos/${l.id}`} className="rounded-lg bg-bg px-2 py-1 font-bold text-navy underline">
                            v{l.versao} · {l.modo === "fatos" ? "fatos" : "recomendação"} · {l.status === "assinado" ? "assinado" : "rascunho"}
                          </Link>
                        ))}
                      </span>
                    </div>
                    <GerarLaudoForm jobId={vaga.id} applicationId={a.id} />
                  </li>
                );
              })}
            </ul>
          )}
          {(apps ?? []).length >= 2 && (
            <div>
              <button type="submit" form="comparar" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-navy">
                Comparar os marcados (finalistas)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
