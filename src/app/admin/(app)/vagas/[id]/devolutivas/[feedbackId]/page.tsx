import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { ROTULO_CANAL, ROTULO_TIPO, verificarDevolutiva, type DadosDevolutiva, type TipoDevolutiva } from "@/lib/devolutiva";
import { FormEnviar } from "../forms-devolutiva";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COR = { ok: "bg-success-bg text-success", aviso: "bg-gold-bg text-gold-3", bloqueio: "bg-danger-bg text-danger" } as const;
const ROT = { ok: "OK", aviso: "Aviso", bloqueio: "Bloqueia" } as const;

export default async function DevolutivaPage({ params }: { params: Promise<{ id: string; feedbackId: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id, feedbackId } = await params;
  if (!UUID.test(id) || !UUID.test(feedbackId)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: f } = await admin
    .from("candidate_feedbacks")
    .select("id, job_id, application_id, tipo, canal, texto, dados, status, criado_por, enviada_em")
    .eq("id", feedbackId)
    .eq("job_id", id)
    .maybeSingle();
  if (!f) redirect(`/admin/vagas/${id}/devolutivas`);
  const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";
  if (!gestao && f.criado_por !== user.id) redirect(`/admin/vagas/${id}/devolutivas`);

  const d = f.dados as unknown as DadosDevolutiva;
  const enviada = f.status === "enviada";
  const vs = verificarDevolutiva(f.texto, {
    tipo: f.tipo as TipoDevolutiva,
    nome: d.nome,
    cargo: d.cargo,
    bancoTalentos: d.banco_talentos,
    proximoPasso: d.proximo_passo,
    prazo: d.prazo,
    fortes: d.fortes,
    melhoria: d.melhoria,
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${id}/devolutivas`} className="text-[11.5px] font-bold text-navy underline">← Devolutivas</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Devolutiva para {d.nome}</h1>
        <p className="mt-1 text-xs text-text-2">
          {ROTULO_TIPO[f.tipo as TipoDevolutiva]} · {ROTULO_CANAL[f.canal as keyof typeof ROTULO_CANAL]} · {d.cargo}
          {enviada && f.enviada_em ? ` · enviada em ${new Date(f.enviada_em).toLocaleDateString("pt-BR")}` : ""}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        <ul className="grid gap-1.5 rounded-2xl border border-border bg-surface p-4 md:grid-cols-2">
          {vs.map((v) => (
            <li key={v.id} className="flex items-start gap-2 text-[11.5px] text-text-2">
              <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${COR[v.nivel]}`}>{ROT[v.nivel]}</span>
              <span>{v.mensagem}</span>
            </li>
          ))}
        </ul>
        <FormEnviar jobId={id} feedbackId={f.id} texto={f.texto} bloqueada={enviada} motivoBloqueio={null} />
      </div>
    </div>
  );
}
