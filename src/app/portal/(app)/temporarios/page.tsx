import { createClient } from "@/lib/supabase/server";
import { Pill } from "@/components/ui";

export default async function TemporariosPage() {
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

  const { data: invites } = membership
    ? await supabase
        .from("invites")
        .select("id, status, validade, jobs!inner(titulo, company_id), profiles(nome_completo)")
        .eq("jobs.company_id", membership.company_id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Gestão de temporários</h1>
        <p className="mt-1 text-xs text-text-2">Escala, check-in, ocorrências e aprovação de conclusão</p>
      </div>

      <div className="mx-9 mt-4 flex shrink-0 gap-2.5 rounded-xl border border-[#ecdbb8] bg-[#f9f0e0] p-3.5 text-[11.5px] text-[#7a6035]">
        <b>Fluxo condicional — a confirmar.</b>
        <span>
          Depende de decisão de produto ainda em aberto: quem calcula e
          aprova o pagamento de temporários dentro da plataforma.
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        {!invites || invites.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhum convite de trabalho temporário.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {invites.map((i) => {
              const job = Array.isArray(i.jobs) ? i.jobs[0] : i.jobs;
              const profile = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles;
              return (
                <div key={i.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-text">{profile?.nome_completo ?? "Candidato"}</p>
                    <p className="text-[11px] text-text-2">{job?.titulo}</p>
                  </div>
                  <Pill className="bg-navy-bg text-navy">{i.status}</Pill>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
