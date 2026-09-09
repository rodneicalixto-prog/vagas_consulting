import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [
    { count: empresasAtivas },
    { count: vagasPublicadas },
    { count: candidatosCadastrados },
    { count: denunciasAbertas },
    { data: filaEmpresas },
    { data: filaVagas },
  ] = await Promise.all([
    admin.from("companies").select("id", { count: "exact", head: true }).eq("status", "aprovada"),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("status", "publicada"),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "aberta"),
    admin
      .from("companies")
      .select("id, razao_social, nome_fantasia, status")
      .in("status", ["em_analise", "ajustes"])
      .order("created_at", { ascending: true })
      .limit(5),
    admin
      .from("jobs")
      .select("id, titulo, modalidade")
      .eq("status", "revisao")
      .order("created_at", { ascending: true })
      .limit(5),
  ]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Visão geral</h1>
        <p className="mt-1 text-xs text-text-2">
          Usuários, empresas, vagas, candidaturas, contratações, alertas, denúncias e SLAs
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Empresas ativas" value={empresasAtivas ?? 0} />
          <Kpi label="Vagas publicadas" value={vagasPublicadas ?? 0} />
          <Kpi label="Candidatos cadastrados" value={candidatosCadastrados ?? 0} />
          <Kpi label="Denúncias abertas" value={denunciasAbertas ?? 0} alert />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Empresas em análise</h3>
            <div className="mt-3.5 flex flex-col gap-2">
              {(filaEmpresas ?? []).length === 0 && (
                <p className="text-[12px] text-text-2">Nenhuma empresa aguardando.</p>
              )}
              {(filaEmpresas ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <span className="text-[12.5px] font-bold text-text">{c.nome_fantasia ?? c.razao_social}</span>
                  <span className="rounded bg-danger-bg px-2 py-0.5 text-[10px] font-extrabold text-danger">
                    {c.status === "ajustes" ? "Ajustes pendentes" : "Em análise"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-extrabold text-text">Vagas para cadastrar</h3>
            <div className="mt-3.5 flex flex-col gap-2">
              {(filaVagas ?? []).length === 0 && (
                <p className="text-[12px] text-text-2">Nenhuma solicitação aguardando.</p>
              )}
              {(filaVagas ?? []).map((j) => (
                <div key={j.id} className="flex items-center gap-2.5 rounded-lg border border-border p-2.5">
                  <span className="rounded-md bg-navy-bg px-2 py-1 text-[9.5px] font-extrabold uppercase text-navy">
                    {j.modalidade}
                  </span>
                  <span className="text-[12.5px] font-bold text-text">{j.titulo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-[10.5px] font-bold uppercase text-text-2">{label}</div>
      <div className={`mt-1.5 text-[23px] font-extrabold ${alert ? "text-danger" : "text-navy"}`}>{value}</div>
    </div>
  );
}
