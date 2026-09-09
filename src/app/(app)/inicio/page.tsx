import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Tag, Pill, Card } from "@/components/ui";
import { IconBell, IconBriefcase } from "@/components/icons";
import { modalidadeLabel, modalidadeTagClass, statusLabel, statusPillClass } from "@/lib/format";

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: recomendadas }, { data: candidaturas }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
    supabase
      .from("jobs")
      .select("id, titulo, local, modalidade, companies(nome_fantasia, razao_social)")
      .eq("status", "publicada")
      .order("publicada_em", { ascending: false })
      .limit(3),
    supabase
      .from("applications")
      .select("id, status, jobs(titulo, companies(nome_fantasia, razao_social))")
      .eq("candidate_id", user!.id)
      .in("status", ["recebida", "triagem", "entrevista", "teste", "proposta"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const primeiroNome = profile?.nome_completo?.split(" ")[0] ?? "candidato";

  return (
    <div className="flex flex-col gap-6 px-5 pb-8 pt-6 md:px-8 md:pt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-text-2">Olá,</div>
          <div className="text-[19px] font-extrabold text-navy">{primeiroNome}</div>
        </div>
        <div className="relative flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-border bg-surface">
          <IconBell />
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-navy-3 to-navy-2 p-[18px] text-white">
        <div className="text-[12.5px] font-bold opacity-85">
          Seu perfil está {profile?.perfil_completo_pct ?? 0}% completo
        </div>
        <div className="my-2.5 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-gold-2"
            style={{ width: `${profile?.perfil_completo_pct ?? 0}%` }}
          />
        </div>
        <Link href="/perfil" className="text-[12.5px] font-extrabold text-gold-2">
          Completar perfil →
        </Link>
      </div>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14.5px] font-extrabold text-navy">Recomendadas para você</h3>
          <Link href="/vagas" className="text-xs font-bold text-gold-3">
            Ver todas
          </Link>
        </div>
        {recomendadas && recomendadas.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto md:grid md:grid-cols-3 md:overflow-visible">
            {recomendadas.map((v) => (
              <Link
                href={`/vagas/${v.id}`}
                key={v.id}
                className="flex min-w-[172px] shrink-0 flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5 md:min-w-0"
              >
                <Tag className={modalidadeTagClass[v.modalidade]}>
                  {modalidadeLabel[v.modalidade]}
                </Tag>
                <h4 className="text-[13.5px] font-extrabold leading-snug">{v.titulo}</h4>
                <div className="text-[11.5px] font-semibold text-text-2">
                  {v.companies?.nome_fantasia ?? v.companies?.razao_social}
                </div>
                <div className="text-[11px] text-text-3">{v.local}</div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-text-3">Nenhuma vaga publicada no momento.</p>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14.5px] font-extrabold text-navy">Suas candidaturas ativas</h3>
          <Link href="/processos" className="text-xs font-bold text-gold-3">
            Ver todas
          </Link>
        </div>
        {candidaturas && candidaturas.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {candidaturas.map((c) => (
              <Card key={c.id} className="flex items-center gap-3 p-3.5">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-navy-bg text-navy">
                  <IconBriefcase size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-[13px] font-extrabold">{c.jobs?.titulo}</h4>
                  <p className="truncate text-[11.5px] text-text-2">
                    {c.jobs?.companies?.nome_fantasia ?? c.jobs?.companies?.razao_social}
                  </p>
                </div>
                <Pill className={statusPillClass[c.status]}>{statusLabel[c.status]}</Pill>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-text-3">
            Você ainda não se candidatou a nenhuma vaga.
          </p>
        )}
      </section>
    </div>
  );
}
