import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { fichaInicial, type ItemFicha, type ItemRoteiro, type Recomendacao, type Roteiro } from "@/lib/entrevista";
import { BotaoVerificacoes, FichaForm } from "./ficha-form";

export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FichaPage({ params }: { params: Promise<{ id: string; applicationId: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id, applicationId } = await params;
  if (!UUID.test(id) || !UUID.test(applicationId)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select("id, job_id, candidate_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.job_id !== id) notFound();

  const [{ data: vaga }, { data: perfil }, { data: ficha }, { data: ultimo }] = await Promise.all([
    admin.from("jobs").select("id, titulo").eq("id", id).maybeSingle(),
    admin.from("profiles").select("nome_completo").eq("id", app.candidate_id).maybeSingle(),
    admin.from("interview_scorecards").select("*").eq("application_id", applicationId).eq("entrevistador_id", user.id).maybeSingle(),
    admin.from("interview_scripts").select("id, versao, conteudo").eq("job_id", id).order("versao", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!vaga) redirect("/admin/vagas");

  // O roteiro da ficha é o que valia quando ela foi iniciada.
  let script = ultimo;
  if (ficha?.script_id && ficha.script_id !== ultimo?.id) {
    const { data: s } = await admin.from("interview_scripts").select("id, versao, conteudo").eq("id", ficha.script_id).maybeSingle();
    if (s) script = s;
  }
  if (!script) redirect(`/admin/vagas/${id}/entrevista`);

  const roteiro = script.conteudo as unknown as Roteiro;
  const salvos = Array.isArray(ficha?.itens) ? (ficha.itens as unknown as ItemFicha[]) : [];
  const porId = new Map(salvos.map((s) => [s.item_id, s]));
  const itens = fichaInicial(roteiro).map((base) => porId.get(base.item_id) ?? base);
  const extras = Array.isArray(ficha?.perguntas_extra) ? (ficha.perguntas_extra as unknown as ItemRoteiro[]) : [];
  const bloqueada = ficha?.status === "fechada";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${id}/entrevista`} className="text-[11.5px] font-bold text-navy underline">
          ← Roteiro e fichas
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Ficha de parecer</h1>
        <p className="mt-1 text-xs text-text-2">
          {perfil?.nome_completo ?? "Candidato"} · {vaga.titulo} · roteiro v{script.versao}
          {bloqueada ? " · ficha fechada" : ""}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        <section className="grid gap-3 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-extrabold text-text">Perguntas dos pontos a validar da triagem</h2>
          {extras.length === 0 ? (
            <p className="text-[12.5px] text-text-2">
              Ainda não geradas. Elas saem dos pontos &quot;a validar&quot; da triagem deste candidato.
            </p>
          ) : (
            <ul className="grid gap-2">
              {extras.map((e) => (
                <li key={e.id} className="rounded-xl bg-bg p-3 text-[13px]">
                  <div className="text-[10.5px] font-bold uppercase text-text-3">{e.nome}</div>
                  <p className="mt-1 font-semibold text-text">{e.pergunta}</p>
                  <p className="mt-1 text-[12px] text-text-2"><b>O que observar:</b> {e.observar}</p>
                </li>
              ))}
            </ul>
          )}
          {!bloqueada && <BotaoVerificacoes jobId={id} applicationId={applicationId} temExtras={extras.length > 0} />}
        </section>

        <FichaForm
          jobId={id}
          applicationId={applicationId}
          itens={itens}
          roteiroItens={roteiro.itens}
          bloqueada={bloqueada}
          inicialFicha={{
            fortes: ficha?.pontos_fortes ?? "",
            atencao: ficha?.pontos_atencao ?? "",
            recomendacao: (ficha?.recomendacao as Recomendacao | null) ?? null,
            motivo: ficha?.motivo ?? "",
          }}
        />
      </div>
    </div>
  );
}
