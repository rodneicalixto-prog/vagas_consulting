import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Pill } from "@/components/ui";

export default async function PortalDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, companies(razao_social, nome_fantasia, status)")
    .eq("user_id", user!.id)
    .limit(1)
    .maybeSingle();

  const company = Array.isArray(membership?.companies)
    ? membership?.companies[0]
    : membership?.companies;

  if (!membership || !company) {
    return (
      <div className="p-9">
        <p className="text-sm text-text-2">Não foi possível carregar os dados da empresa.</p>
      </div>
    );
  }

  if (company.status !== "aprovada") {
    return (
      <div className="mx-auto max-w-xl p-9">
        <h1 className="text-xl font-extrabold text-text">
          Bem-vindo(a), {company.nome_fantasia ?? company.razao_social}
        </h1>
        <div className="mt-5 flex gap-3 rounded-2xl border border-[#ecdbb8] bg-[#f9f0e0] p-4">
          <div>
            <b className="mb-1 block text-[13px] text-gold-3">
              {company.status === "ajustes"
                ? "Ajustes solicitados no cadastro"
                : "Validação em andamento"}
            </b>
            <p className="text-[12px] leading-relaxed text-[#7a6035]">
              {company.status === "ajustes"
                ? "A equipe da Vagas Consulting pediu correções no seu cadastro. Você receberá um e-mail com os detalhes."
                : "Nossa equipe confere CNPJ e documentos em até 2 dias úteis. Assim que aprovado, você poderá enviar solicitações de vaga."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const companyId = membership.company_id;

  const [{ count: jobsAtivas }, { count: candidatosAtivos }, { data: prazos }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "publicada"),
    supabase
      .from("applications")
      .select("id, jobs!inner(company_id)", { count: "exact", head: true })
      .eq("jobs.company_id", companyId)
      .not("status", "in", "(contratado,rejeitada,desistente,expirada)"),
    supabase
      .from("jobs")
      .select("id, titulo, modalidade")
      .eq("company_id", companyId)
      .in("status", ["rascunho", "revisao"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-9 pt-7">
        <div>
          <h1 className="text-xl font-extrabold text-text">Dashboard</h1>
          <p className="mt-1 text-xs text-text-2">Visão geral de vagas, candidatos e desempenho</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Pill className="bg-success-bg text-success">✓ Empresa validada</Pill>
          <Link
            href="/portal/vagas/nova"
            className="rounded-lg bg-gold px-4 py-2.5 text-[12.5px] font-extrabold text-[#1c1508]"
          >
            + Solicitar vaga
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[11px] font-bold uppercase text-text-2">Vagas publicadas</div>
            <div className="mt-2 text-[26px] font-extrabold text-navy">{jobsAtivas ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-[11px] font-bold uppercase text-text-2">Candidatos no pipeline</div>
            <div className="mt-2 text-[26px] font-extrabold text-navy">{candidatosAtivos ?? 0}</div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-sm font-extrabold text-text">Solicitações em andamento</h3>
          <p className="mb-3.5 mt-0.5 text-[11.5px] text-text-2">
            Ainda com a Vagas Consulting para cadastro/publicação
          </p>
          {!prazos || prazos.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-text-2">
              Nenhuma solicitação em andamento.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {prazos.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <span className="rounded-md bg-navy-bg px-2 py-1 text-[9.5px] font-extrabold uppercase text-navy">
                    {job.modalidade}
                  </span>
                  <span className="text-[12.5px] font-bold text-text">{job.titulo}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
