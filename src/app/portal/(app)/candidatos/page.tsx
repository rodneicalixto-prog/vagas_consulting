import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Pill } from "@/components/ui";

export default async function CandidatosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user!.id)
    .limit(1)
    .maybeSingle();

  const { data: applications } = membership
    ? await supabase
        .from("applications")
        .select("id, status, jobs!inner(id, titulo, company_id), profiles(nome_completo, titulo_profissional)")
        .eq("jobs.company_id", membership.company_id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Candidatos</h1>
        <p className="mt-1 text-xs text-text-2">Todas as candidaturas, em todas as vagas publicadas</p>
      </div>
      <div className="flex-1 overflow-y-auto px-9 py-6">
        {!applications || applications.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhuma candidatura ainda.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {applications.map((a) => {
              const job = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
              const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
              return (
                <Link
                  key={a.id}
                  href={`/portal/vagas/${job?.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-text">{profile?.nome_completo ?? "Candidato"}</p>
                    <p className="text-[11px] text-text-2">{job?.titulo}</p>
                  </div>
                  <Pill className="bg-navy-bg text-navy">{a.status}</Pill>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
