import { createClient } from "@/lib/supabase/server";
import { statusLabel, statusPillClass, statusProgress } from "@/lib/format";
import { Card, Pill } from "@/components/ui";

const STATUS_ENCERRADOS = ["rejeitada", "desistente", "expirada", "contratado"] as const;

export default async function ProcessosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: candidaturas } = await supabase
    .from("applications")
    .select("id, status, created_at, jobs(titulo, companies(nome_fantasia, razao_social))")
    .eq("candidate_id", user!.id)
    .order("created_at", { ascending: false });

  const andamento = (candidaturas ?? []).filter(
    (c) => !STATUS_ENCERRADOS.includes(c.status as (typeof STATUS_ENCERRADOS)[number]),
  );
  const encerrados = (candidaturas ?? []).filter((c) =>
    STATUS_ENCERRADOS.includes(c.status as (typeof STATUS_ENCERRADOS)[number]),
  );

  return (
    <div className="flex flex-col gap-4 pb-8 pt-6 md:pt-8">
      <h1 className="px-5 text-[19px] font-extrabold text-navy md:px-8">
        Meus processos
      </h1>

      <div className="flex flex-col gap-3 px-5 md:px-8">
        {andamento.length === 0 && encerrados.length === 0 && (
          <p className="text-[12.5px] text-text-3">
            Você ainda não tem candidaturas. Explore as vagas disponíveis.
          </p>
        )}

        {andamento.length > 0 && (
          <>
            <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
              Em andamento
            </div>
            <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3.5">
              {andamento.map((c) => (
                <Card key={c.id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2.5">
                    <div>
                      <h4 className="text-[13.5px] font-extrabold">{c.jobs?.titulo}</h4>
                      <div className="text-[11.5px] text-text-2">
                        {c.jobs?.companies?.nome_fantasia ?? c.jobs?.companies?.razao_social}
                      </div>
                    </div>
                    <Pill className={statusPillClass[c.status]}>{statusLabel[c.status]}</Pill>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          i < statusProgress[c.status] ? "bg-gold" : "bg-border"
                        }`}
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {encerrados.length > 0 && (
          <>
            <div className="mt-2 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
              Encerrados
            </div>
            <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3.5">
              {encerrados.map((c) => (
                <Card key={c.id} className="flex flex-col gap-2 opacity-70">
                  <div className="flex items-start justify-between gap-2.5">
                    <div>
                      <h4 className="text-[13.5px] font-extrabold">{c.jobs?.titulo}</h4>
                      <div className="text-[11.5px] text-text-2">
                        {c.jobs?.companies?.nome_fantasia ?? c.jobs?.companies?.razao_social}
                      </div>
                    </div>
                    <Pill className={statusPillClass[c.status]}>{statusLabel[c.status]}</Pill>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
