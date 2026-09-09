import { createAdminClient } from "@/lib/supabase/admin";
import { decidirVaga } from "./actions";

export default async function CadastroDeVagasPage() {
  const admin = createAdminClient();

  const { data: jobs } = await admin
    .from("jobs")
    .select("id, titulo, modalidade, descricao, requisitos, remuneracao_texto, companies(razao_social)")
    .eq("status", "revisao")
    .order("created_at", { ascending: true });

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Cadastro de vagas</h1>
        <p className="mt-1 text-xs text-text-2">
          Solicitações enviadas pelas empresas — a equipe Vagas Consulting cadastra e publica
          cada vaga; empresas não publicam diretamente
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        {!jobs || jobs.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhuma solicitação na fila.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {jobs.map((job) => {
              const company = Array.isArray(job.companies) ? job.companies[0] : job.companies;
              return (
                <div key={job.id} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-md bg-navy-bg px-2 py-1 text-[9.5px] font-extrabold uppercase text-navy">
                      {job.modalidade}
                    </span>
                    <h3 className="text-[14px] font-extrabold text-text">{job.titulo}</h3>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-text-2">{company?.razao_social}</p>

                  {job.descricao && (
                    <p className="mt-3 rounded-lg bg-bg p-3 text-[12px] leading-relaxed text-text-2">
                      {job.descricao}
                    </p>
                  )}
                  {job.requisitos && (
                    <p className="mt-2 text-[11.5px] text-text-2">
                      <b className="text-text">Requisitos:</b> {job.requisitos}
                    </p>
                  )}
                  {job.remuneracao_texto && (
                    <p className="mt-1 text-[11.5px] text-text-2">
                      <b className="text-text">Remuneração:</b> {job.remuneracao_texto}
                    </p>
                  )}

                  <form action={decidirVaga} className="mt-4 flex flex-col gap-2.5">
                    <input type="hidden" name="job_id" value={job.id} />
                    <textarea
                      name="motivo"
                      placeholder="Motivo da decisão (obrigatório para pedir correção ou rejeitar)"
                      rows={2}
                      className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]"
                    />
                    <div className="flex gap-2.5">
                      <button
                        name="acao"
                        value="corrigir"
                        className="flex-1 rounded-lg border border-border bg-bg py-2.5 text-[12px] font-extrabold text-text-2"
                      >
                        Pedir correção à empresa
                      </button>
                      <button
                        name="acao"
                        value="rejeitar"
                        className="flex-1 rounded-lg bg-danger py-2.5 text-[12px] font-extrabold text-white"
                      >
                        Rejeitar solicitação
                      </button>
                      <button
                        name="acao"
                        value="publicar"
                        className="flex-1 rounded-lg bg-success py-2.5 text-[12px] font-extrabold text-white"
                      >
                        Cadastrar e publicar
                      </button>
                    </div>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
