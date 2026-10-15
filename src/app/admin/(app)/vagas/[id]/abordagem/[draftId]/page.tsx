import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { ROTULO_CANAL, canalValido } from "@/lib/abordagem";
import type { Verificacao } from "@/lib/vaga-estruturada";
import { AcoesAbordagem, Copiar } from "../forms-abordagem";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COR = { ok: "bg-success-bg text-success", aviso: "bg-gold-bg text-gold-3", bloqueio: "bg-danger-bg text-danger" } as const;
const ROT = { ok: "OK", aviso: "Aviso", bloqueio: "Bloqueia" } as const;

export default async function AbordagemDetalhe({ params }: { params: Promise<{ id: string; draftId: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id, draftId } = await params;
  if (!UUID.test(id) || !UUID.test(draftId)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: d } = await admin.from("outreach_drafts").select("*").eq("id", draftId).eq("job_id", id).maybeSingle();
  if (!d) redirect(`/admin/vagas/${id}/abordagem`);
  const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";
  if (!gestao && d.criado_por !== user.id) redirect(`/admin/vagas/${id}/abordagem`);

  const assuntos = Array.isArray(d.assuntos) ? (d.assuntos as string[]) : [];
  const followups = Array.isArray(d.followups) ? (d.followups as string[]) : [];
  const vs = Array.isArray(d.verificacoes) ? (d.verificacoes as unknown as Verificacao[]) : [];
  const encerrada = d.estado === "encerrada" || d.estado === "nao_contactar";
  const datas = d.enviada_em
    ? [3, 7].map((n) => new Date(new Date(d.enviada_em as string).getTime() + n * 86_400_000).toLocaleDateString("pt-BR"))
    : [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${id}/abordagem`} className="text-[11.5px] font-bold text-navy underline">← Abordagens</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Abordagem para {d.contato}</h1>
        <p className="mt-1 text-xs text-text-2">
          {canalValido(d.canal) ? ROTULO_CANAL[d.canal] : d.canal} · {d.estado}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        {encerrada ? (
          <p className="rounded-xl bg-navy-bg px-4 py-3 text-[12.5px] text-text-2">
            Contato encerrado. O texto e o trecho do perfil foram apagados.
          </p>
        ) : (
          <>
            {d.angulo && (
              <p className="rounded-xl bg-navy-bg px-4 py-3 text-[12.5px] text-text-2">
                <b className="text-text">Ângulo escolhido:</b> {d.angulo}
                {d.trecho_perfil && <> · trecho do perfil: &ldquo;{d.trecho_perfil}&rdquo;</>}
              </p>
            )}
            {vs.length > 0 && (
              <ul className="grid gap-1.5 rounded-2xl border border-border bg-surface p-4 md:grid-cols-2">
                {vs.map((v) => (
                  <li key={v.id} className="flex items-start gap-2 text-[11.5px] text-text-2">
                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${COR[v.nivel]}`}>{ROT[v.nivel]}</span>
                    <span>{v.mensagem}</span>
                  </li>
                ))}
              </ul>
            )}
            <section className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-text">Mensagem</h2>
                <Copiar texto={d.texto} rotulo="Copiar mensagem" />
              </div>
              {assuntos.length > 0 && (
                <ul className="mb-3 grid gap-1">
                  {assuntos.map((a) => (
                    <li key={a} className="flex items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2 text-[12.5px]">
                      <span><b>Assunto:</b> {a}</span>
                      <Copiar texto={a} />
                    </li>
                  ))}
                </ul>
              )}
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-bg p-4 font-sans text-[13px] leading-relaxed text-text">{d.texto}</pre>
            </section>
            {followups.map((f, i) => (
              <section key={i} className="rounded-2xl border border-border bg-surface p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-extrabold text-text">
                    Follow-up {i + 1}{datas[i] ? ` · lembrete em ${datas[i]}` : " · cerca de " + (i === 0 ? "3 dias" : "1 semana") + " depois do envio"}
                  </h2>
                  <Copiar texto={f} />
                </div>
                <pre className="whitespace-pre-wrap break-words rounded-xl bg-bg p-4 font-sans text-[13px] leading-relaxed text-text">{f}</pre>
              </section>
            ))}
          </>
        )}
        {!encerrada && (
          <AcoesAbordagem jobId={id} draftId={d.id} estado={d.estado} followupsFeitos={d.followups_feitos} />
        )}
      </div>
    </div>
  );
}
