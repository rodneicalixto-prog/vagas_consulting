import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";

/** Lembretes de follow-up da abordagem ativa: só as do próprio usuário. */
export default async function AbordagensPendentesPage() {
  const { user, role } = await requireInternalUser("jobs.manage");
  const escopo = await obterEscopo(user.id, role);
  const vagas = await vagasVisiveis(escopo);

  const admin = createAdminClient();
  let q = admin
    .from("outreach_drafts")
    .select("id, job_id, contato, canal, followups_feitos, proximo_followup_em")
    .eq("criado_por", user.id)
    .eq("estado", "enviada")
    .lte("proximo_followup_em", new Date().toISOString())
    .order("proximo_followup_em", { ascending: true })
    .limit(100);
  if (vagas) q = q.in("job_id", vagas);
  const { data } = await q;
  const itens = data ?? [];

  return (
    <div className="px-4 md:px-9 py-7">
      <h1 className="text-xl font-extrabold text-text">Follow-ups de abordagem</h1>
      <p className="mt-1 text-xs text-text-2">O que venceu e espera você enviar. A plataforma só lembra: o envio é seu.</p>
      <div className="mt-5 grid gap-2">
        {itens.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-5 text-[12.5px] text-text-2">Nenhum follow-up vencido.</p>
        ) : (
          itens.map((a) => (
            <Link
              key={a.id}
              href={`/admin/vagas/${a.job_id}/abordagem/${a.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[13px] hover:shadow-sm"
            >
              <span className="font-bold text-text">{a.contato}</span>
              <span className="text-text-2">
                Follow-up {a.followups_feitos + 1} · venceu em{" "}
                {a.proximo_followup_em ? new Date(a.proximo_followup_em).toLocaleDateString("pt-BR") : "—"}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
