import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { ROTULO_CANAL, ROTULO_TIPO, sugerirTipo, tipoValido, canalValido } from "@/lib/devolutiva";
import { FormGerar, FormLote } from "./forms-devolutiva";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DevolutivasPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);
  const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";

  const admin = createAdminClient();
  const { data: vaga } = await admin.from("jobs").select("id, titulo").eq("id", id).maybeSingle();
  if (!vaga) redirect("/admin/vagas");

  const [{ data: apps }, { data: fichas }, { data: feedbacks }] = await Promise.all([
    admin.from("applications").select("id, candidate_id, status").eq("job_id", id).limit(200),
    admin.from("interview_scorecards").select("application_id").eq("job_id", id).eq("status", "fechada"),
    admin
      .from("candidate_feedbacks")
      .select("id, application_id, tipo, canal, status, criado_por, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);
  const candIds = [...new Set((apps ?? []).map((a) => a.candidate_id))];
  const { data: perfis } = candIds.length
    ? await admin.from("profiles").select("id, nome_completo, blacklisted").in("id", candIds)
    : { data: [] as { id: string; nome_completo: string; blacklisted: boolean }[] };
  const perfil = new Map((perfis ?? []).map((p) => [p.id, p]));
  const comFicha = new Set((fichas ?? []).map((f) => f.application_id));
  const visiveis = (feedbacks ?? []).filter((f) => gestao || f.criado_por === user.id);
  const enviadas = new Set(visiveis.filter((f) => f.status === "enviada").map((f) => f.application_id));
  const nomeDe = (appId: string) => {
    const a = (apps ?? []).find((x) => x.id === appId);
    return a ? perfil.get(a.candidate_id)?.nome_completo ?? "Candidato" : "Candidato";
  };

  const candidatos = (apps ?? []).map((a) => {
    const s = sugerirTipo({ fichaFechada: comFicha.has(a.id), statusCandidatura: a.status });
    return {
      id: a.id,
      nome: perfil.get(a.candidate_id)?.nome_completo ?? "Candidato",
      sugestao: `${ROTULO_TIPO[s.tipo]}${s.sugerirLigacao ? " (ligue antes)" : ""}`,
      tipo: s.tipo,
      bloqueio: enviadas.has(a.id)
        ? "já enviada"
        : perfil.get(a.candidate_id)?.blacklisted
          ? "black list"
          : null,
    };
  });
  const lote = candidatos.filter((c) => c.tipo === "generica");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${vaga.id}`} className="text-[11.5px] font-bold text-navy underline">← Critérios da vaga</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Devolutivas</h1>
        <p className="mt-1 text-xs text-text-2">
          {vaga.titulo}. Rascunho respeitoso, personalizado e baseado em evidência. Você revisa e envia.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        <p className="rounded-xl bg-navy-bg px-4 py-3 text-[12px] text-text-2">
          Regra de encerramento: uma única devolutiva por candidatura, em até 30 dias da decisão, respeitando descadastro e
          black list. Promessa de guardar o currículo só com o banco de talentos marcado.
        </p>

        <FormGerar jobId={vaga.id} candidatos={candidatos} />
        {lote.length > 0 && <FormLote jobId={vaga.id} candidatos={lote} />}

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-extrabold text-text">Rascunhos e enviadas</h2>
          {visiveis.length === 0 ? (
            <p className="text-[12.5px] text-text-2">Nenhuma devolutiva ainda.</p>
          ) : (
            <ul className="grid gap-2">
              {visiveis.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2 text-[12.5px]">
                  <span>
                    <b className="text-text">{nomeDe(f.application_id)}</b>
                    <span className="text-text-2">
                      {" "}· {tipoValido(f.tipo) ? ROTULO_TIPO[f.tipo] : f.tipo} · {canalValido(f.canal) ? ROTULO_CANAL[f.canal] : f.canal}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={f.status === "enviada" ? "font-bold text-success" : "text-text-2"}>
                      {f.status === "enviada" ? "Enviada" : "Rascunho"}
                    </span>
                    <Link href={`/admin/vagas/${vaga.id}/devolutivas/${f.id}`} className="font-bold text-navy underline">
                      {f.status === "enviada" ? "Ver" : "Revisar"}
                    </Link>
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
