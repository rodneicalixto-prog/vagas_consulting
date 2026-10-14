import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Pill, BackHeader } from "@/components/ui";
import {
  CONVITES_ABERTOS,
  conviteExpirado,
  conviteLabel,
  convitePillClass,
  formatPrazo,
} from "@/lib/convites";

export default async function ConvitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: convites } = await supabase
    .from("invites")
    .select("id, status, validade, created_at, jobs(titulo, local, companies(nome_fantasia, razao_social))")
    .eq("candidate_id", user!.id)
    .order("created_at", { ascending: false });

  const lista = convites ?? [];
  const abertos = lista.filter((c) => CONVITES_ABERTOS.includes(c.status) && !conviteExpirado(c));
  const historico = lista.filter((c) => !abertos.includes(c));

  const renderCard = (c: (typeof lista)[number]) => {
    const expirado = conviteExpirado(c);
    return (
      <Link key={c.id} href={`/convites/${c.id}`}>
        <Card className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-[13.5px] font-extrabold">{c.jobs?.titulo}</h4>
            <div className="text-[11.5px] text-text-2">
              {c.jobs?.companies?.nome_fantasia ?? c.jobs?.companies?.razao_social}
              {c.jobs?.local ? ` · ${c.jobs.local}` : ""}
            </div>
            {CONVITES_ABERTOS.includes(c.status) && !expirado && (
              <div className="mt-1 text-[11.5px] font-bold text-gold-3">
                Responder até {formatPrazo(c.validade)}
              </div>
            )}
          </div>
          <Pill className={expirado ? "bg-black/5 text-text-3" : convitePillClass[c.status]}>
            {expirado ? "Expirado" : conviteLabel[c.status]}
          </Pill>
        </Card>
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      <BackHeader title="Meus convites" backHref="/processos" />
      <div className="flex flex-col gap-3 px-5 md:px-8">
        {lista.length === 0 && (
          <p className="text-[12.5px] text-text-2">Você ainda não recebeu convites.</p>
        )}
        {abertos.length > 0 && (
          <>
            <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-text-2">
              Aguardando sua resposta
            </div>
            <div className="flex flex-col gap-3 md:grid md:grid-cols-2">{abertos.map(renderCard)}</div>
          </>
        )}
        {historico.length > 0 && (
          <>
            <div className="mt-2 text-[11.5px] font-extrabold uppercase tracking-wide text-text-2">
              Histórico
            </div>
            <div className="flex flex-col gap-3 md:grid md:grid-cols-2">{historico.map(renderCard)}</div>
          </>
        )}
      </div>
    </div>
  );
}
