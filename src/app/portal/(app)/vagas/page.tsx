import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Pill } from "@/components/ui";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-navy-bg text-navy" },
  revisao: { label: "Aguardando Vagas Consulting", className: "bg-gold-bg text-gold-3" },
  publicada: { label: "Publicada", className: "bg-success-bg text-success" },
  pausada: { label: "Pausada", className: "bg-navy-bg text-navy" },
  preenchida: { label: "Preenchida", className: "bg-success-bg text-success" },
  encerrada: { label: "Encerrada", className: "bg-navy-bg text-text-2" },
  rejeitada: { label: "Rejeitada", className: "bg-danger-bg text-danger" },
  suspensa: { label: "Suspensa", className: "bg-danger-bg text-danger" },
};

export default async function VagasDaEmpresaPage() {
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

  const { data: jobs } = membership
    ? await supabase
        .from("jobs")
        .select("id, titulo, modalidade, status, motivo_decisao")
        .eq("company_id", membership.company_id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Solicitações de vaga</h1>
        <Link href="/portal/vagas/nova" className="rounded-lg bg-gold px-4 py-2.5 text-[12.5px] font-extrabold text-[#1c1508]">
          + Solicitar vaga
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-9 py-6">
        {!jobs || jobs.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhuma solicitação ainda.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {jobs.map((job) => {
              const s = STATUS_LABEL[job.status] ?? { label: job.status, className: "bg-navy-bg text-navy" };
              return (
                <Link
                  key={job.id}
                  href={`/portal/vagas/${job.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <span className="rounded-md bg-navy-bg px-2 py-1 text-[9.5px] font-extrabold uppercase text-navy">
                    {job.modalidade}
                  </span>
                  <span className="flex-1 text-[13px] font-bold text-text">{job.titulo}</span>
                  <Pill className={s.className}>{s.label}</Pill>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
