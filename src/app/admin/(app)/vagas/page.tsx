import { createAdminClient } from "@/lib/supabase/admin";
import { criarVaga, decidirVaga } from "./actions";
import { requireInternalUser } from "@/lib/auth/internal";
import { SubmitButton } from "@/components/form-buttons";

export default async function CadastroDeVagasPage() {
  const { role } = await requireInternalUser("jobs.manage");
  const admin = createAdminClient();

  const [{ data: jobs }, { data: companies }] = await Promise.all([
    admin.from("jobs").select("id, titulo, modalidade, status, descricao, requisitos, remuneracao_texto, companies(razao_social)").order("created_at", { ascending: false }),
    admin.from("companies").select("id, razao_social, nome_fantasia").eq("status", "aprovada").order("razao_social"),
  ]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Cadastro de vagas</h1>
        <p className="mt-1 text-xs text-text-2">
          Cadastro, revisão e publicação controlados pela equipe interna
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        <form action={criarVaga} className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
          <h2 className="text-sm font-extrabold text-text md:col-span-2">Cadastrar vaga</h2>
          <select name="company_id" required defaultValue="" className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm">
            <option value="" disabled>Selecionar empresa</option>
            {(companies ?? []).map((company) => <option key={company.id} value={company.id}>{company.nome_fantasia ?? company.razao_social}</option>)}
          </select>
          <input name="titulo" required placeholder="Título da vaga" className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
          <select name="modalidade" required defaultValue="" className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm">
            <option value="" disabled>Modalidade</option>
            <option value="efetiva">Efetiva</option><option value="pj">PJ</option><option value="temporaria">Temporária</option>
          </select>
          <input name="local" placeholder="Local" className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
          <input name="remuneracao_texto" placeholder="Remuneração" className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm md:col-span-2" />
          <textarea name="descricao" placeholder="Descrição" rows={3} className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
          <textarea name="requisitos" placeholder="Requisitos" rows={3} className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
          <SubmitButton
            pendingLabel="Salvando..."
            className="rounded-lg bg-navy px-4 py-2.5 text-sm font-extrabold text-white md:col-span-2"
          >
            Salvar rascunho
          </SubmitButton>
        </form>
        {!jobs || jobs.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhuma vaga cadastrada.</p>
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
                    <span className="text-[10px] font-bold uppercase text-text-3">{job.status}</span>
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
                      <SubmitButton
                        name="acao"
                        value="corrigir"
                        pendingLabel="Salvando..."
                        className="flex-1 rounded-lg border border-border bg-bg py-2.5 text-[12px] font-extrabold text-text-2"
                      >
                        Voltar a rascunho
                      </SubmitButton>
                      <SubmitButton
                        name="acao"
                        value="encerrar"
                        pendingLabel="Salvando..."
                        className="flex-1 rounded-lg bg-danger py-2.5 text-[12px] font-extrabold text-white"
                      >
                        Encerrar
                      </SubmitButton>
                      {role !== "operador" && (
                        <SubmitButton
                          name="acao"
                          value="publicar"
                          pendingLabel="Salvando..."
                          className="flex-1 rounded-lg bg-success py-2.5 text-[12px] font-extrabold text-white"
                        >
                          Publicar
                        </SubmitButton>
                      )}
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
