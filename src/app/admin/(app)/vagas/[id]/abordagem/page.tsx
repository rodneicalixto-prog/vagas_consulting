import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { ROTULO_CANAL, canalValido } from "@/lib/abordagem";
import { FormAbordagem } from "./forms-abordagem";

export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROTULO_ESTADO: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  respondeu: "Respondeu",
  nao_contactar: "Não contatar",
  encerrada: "Encerrada",
};

export default async function AbordagemPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);
  const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";

  const admin = createAdminClient();
  const { data: vaga } = await admin.from("jobs").select("id, titulo, remuneracao_texto").eq("id", id).maybeSingle();
  if (!vaga) redirect("/admin/vagas");

  let q = admin
    .from("outreach_drafts")
    .select("id, contato, canal, estado, followups_feitos, proximo_followup_em, criado_por, created_at")
    .eq("job_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (!gestao) q = q.eq("criado_por", user.id);
  const { data: itens } = await q;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${vaga.id}`} className="text-[11.5px] font-bold text-navy underline">← Critérios da vaga</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Abordagem ativa</h1>
        <p className="mt-1 text-xs text-text-2">
          {vaga.titulo}. Mensagem para candidato passivo, com 2 follow-ups e lembrete. Você envia fora da plataforma.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        <FormAbordagem jobId={vaga.id} temFaixa={!!vaga.remuneracao_texto} />
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-extrabold text-text">Abordagens da vaga</h2>
          {(itens ?? []).length === 0 ? (
            <p className="text-[12.5px] text-text-2">Nenhuma abordagem ainda.</p>
          ) : (
            <ul className="grid gap-2">
              {(itens ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2 text-[12.5px]">
                  <span>
                    <b className="text-text">{a.contato}</b>
                    <span className="text-text-2"> · {canalValido(a.canal) ? ROTULO_CANAL[a.canal] : a.canal}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-text-2">
                      {ROTULO_ESTADO[a.estado] ?? a.estado}
                      {a.estado === "enviada" && a.proximo_followup_em
                        ? ` · follow-up ${a.followups_feitos + 1} em ${new Date(a.proximo_followup_em).toLocaleDateString("pt-BR")}`
                        : ""}
                    </span>
                    {a.estado !== "encerrada" && a.estado !== "nao_contactar" && (
                      <Link href={`/admin/vagas/${vaga.id}/abordagem/${a.id}`} className="font-bold text-navy underline">Abrir</Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
