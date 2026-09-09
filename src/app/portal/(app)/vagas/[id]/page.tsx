import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { moverCandidatura, adicionarNota } from "./actions";
import { StatusSelect } from "./status-select";

const ETAPAS: { status: string; label: string }[] = [
  { status: "recebida", label: "Recebida" },
  { status: "triagem", label: "Triagem" },
  { status: "entrevista", label: "Entrevista" },
  { status: "proposta", label: "Proposta" },
  { status: "contratado", label: "Contratado" },
];

export default async function DetalheVagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, titulo, modalidade, status, motivo_decisao, company_id")
    .eq("id", id)
    .maybeSingle();

  if (!job) notFound();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, created_at, candidate_id, profiles(nome_completo, titulo_profissional)")
    .eq("job_id", id)
    .order("created_at", { ascending: false });

  const notesByApplication = new Map<string, { id: string; nota: string; created_at: string }[]>();
  if (applications && applications.length > 0) {
    const { data: notes } = await supabase
      .from("application_notes")
      .select("id, application_id, nota, created_at")
      .in("application_id", applications.map((a) => a.id))
      .order("created_at", { ascending: false });
    for (const n of notes ?? []) {
      const list = notesByApplication.get(n.application_id) ?? [];
      list.push(n);
      notesByApplication.set(n.application_id, list);
    }
  }

  const isPending = job.status === "rascunho" || job.status === "revisao";

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <p className="text-[11.5px] font-bold text-text-3">
          Vagas / <b className="text-navy">{job.titulo}</b>
        </p>
        <div className="mt-1 flex items-center gap-2.5">
          <h1 className="text-xl font-extrabold text-text">{job.titulo}</h1>
          <span className="rounded-md bg-navy-bg px-2 py-1 text-[9.5px] font-extrabold uppercase text-navy">
            {job.modalidade}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        {isPending ? (
          <div className="rounded-2xl border border-[#ecdbb8] bg-[#f9f0e0] p-5">
            <b className="mb-1 block text-[13px] text-gold-3">
              {job.status === "rascunho" ? "Correção pendente" : "Aguardando cadastro pela Vagas Consulting"}
            </b>
            <p className="text-[12.5px] leading-relaxed text-[#7a6035]">
              {job.motivo_decisao
                ? job.motivo_decisao
                : "Assim que a equipe cadastrar e publicar a vaga, o pipeline de candidatos aparece aqui."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3.5">
            {ETAPAS.map((etapa) => {
              const items = (applications ?? []).filter((a) => a.status === etapa.status);
              return (
                <div key={etapa.status} className="flex flex-col overflow-hidden rounded-xl bg-[#f2efe9] p-3">
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <h3 className="text-[12px] font-extrabold text-navy">{etapa.label}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-extrabold text-text-3">
                      {items.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map((a) => {
                      const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
                      const notes = notesByApplication.get(a.id) ?? [];
                      return (
                        <details key={a.id} className="rounded-lg border border-border bg-white p-2.5">
                          <summary className="cursor-pointer text-[12px] font-extrabold text-text">
                            {profile?.nome_completo ?? "Candidato"}
                          </summary>
                          <p className="mt-1 text-[10.5px] text-text-2">{profile?.titulo_profissional}</p>

                          {notes.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                              {notes.map((n) => (
                                <p key={n.id} className="text-[10px] italic text-text-3">
                                  &ldquo;{n.nota}&rdquo;
                                </p>
                              ))}
                            </div>
                          )}

                          <form action={adicionarNota} className="mt-2 flex gap-1">
                            <input type="hidden" name="application_id" value={a.id} />
                            <input type="hidden" name="job_id" value={job.id} />
                            <input
                              name="nota"
                              placeholder="Nota interna..."
                              className="flex-1 rounded border border-border bg-bg px-2 py-1 text-[10.5px]"
                            />
                            <button type="submit" className="rounded bg-navy px-2 text-[10px] font-bold text-white">
                              +
                            </button>
                          </form>

                          <StatusSelect
                            applicationId={a.id}
                            jobId={job.id}
                            currentStatus={a.status}
                            action={moverCandidatura}
                          />
                        </details>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
