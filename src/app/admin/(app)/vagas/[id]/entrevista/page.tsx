import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { normalizarCriterios } from "@/lib/vaga-estruturada";
import type { Roteiro } from "@/lib/entrevista";
import { FormRoteiro, ImprimirBotao } from "./form-roteiro";

export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROTULO_TIPO = { star: "STAR", situacional: "Situacional", comportamento: "Comportamento" } as const;
const ROTULO_BLOCO = { competencia: "Competência", valor: "Valor", verificacao: "Verificação" } as const;

export default async function EntrevistaPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: vaga } = await admin.from("jobs").select("id, titulo, criterios").eq("id", id).maybeSingle();
  if (!vaga) redirect("/admin/vagas");
  const c = normalizarCriterios(vaga.criterios);
  const sugestao = [...c.comportamentais, ...c.obrigatorios].slice(0, 6).join("\n");

  const [{ data: script }, { data: apps }, { data: fichas }] = await Promise.all([
    admin
      .from("interview_scripts")
      .select("id, versao, duracao_min, conteudo, created_at")
      .eq("job_id", id)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("applications").select("id, candidate_id, status").eq("job_id", id).limit(200),
    admin.from("interview_scorecards").select("application_id, status, recomendacao").eq("job_id", id).eq("entrevistador_id", user.id),
  ]);
  const candIds = [...new Set((apps ?? []).map((a) => a.candidate_id))];
  const { data: perfis } = candIds.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", candIds)
    : { data: [] as { id: string; nome_completo: string }[] };
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));
  const ficha = new Map((fichas ?? []).map((f) => [f.application_id, f]));
  const roteiro = script ? (script.conteudo as unknown as Roteiro) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7 print:hidden">
        <Link href={`/admin/vagas/${vaga.id}`} className="text-[11.5px] font-bold text-navy underline">
          ← Critérios da vaga
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Roteiro de entrevista</h1>
        <p className="mt-1 text-xs text-text-2">{vaga.titulo}. Roteiro por competências e ficha de parecer por candidato.</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        <FormRoteiro jobId={vaga.id} competenciasIniciais={sugestao} temRoteiro={!!roteiro} />

        {roteiro && script && (
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-text">
                Roteiro v{script.versao} · {script.duracao_min} min · {vaga.titulo}
              </h2>
              <ImprimirBotao />
            </div>
            {roteiro.avisos.length > 0 && (
              <ul className="mb-3 grid gap-1 print:hidden">
                {roteiro.avisos.map((a) => (
                  <li key={a} className="rounded-lg bg-gold-bg px-3 py-2 text-[12px] font-semibold text-gold-3">{a}</li>
                ))}
              </ul>
            )}
            <ol className="grid gap-3 text-[13px]">
              <li><b>Abertura.</b> {roteiro.abertura}</li>
              <li><b>Aquecimento.</b> {roteiro.aquecimento}</li>
              {roteiro.itens.map((i) => (
                <li key={i.id} className="rounded-xl bg-bg p-3">
                  <div className="text-[10.5px] font-bold uppercase text-text-3">
                    {ROTULO_BLOCO[i.bloco]} · {i.nome} · {ROTULO_TIPO[i.tipo]}
                  </div>
                  <p className="mt-1 font-semibold text-text">{i.pergunta}</p>
                  {i.sondagens.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-text-2">
                      {i.sondagens.map((s) => <li key={s}>{s}</li>)}
                    </ul>
                  )}
                  <p className="mt-1 text-[12px] text-text-2"><b>O que observar:</b> {i.observar}</p>
                </li>
              ))}
              <li><b>Encerramento.</b> {roteiro.encerramento}</li>
            </ol>
            {roteiro.removidas.length > 0 && (
              <details className="mt-3 text-[12px] text-text-2 print:hidden">
                <summary className="cursor-pointer font-bold">Perguntas removidas ({roteiro.removidas.length})</summary>
                <ul className="mt-1 list-disc pl-5">
                  {roteiro.removidas.map((r) => <li key={r.pergunta}>{r.motivo}</li>)}
                </ul>
              </details>
            )}
          </section>
        )}

        {roteiro && (
          <section className="rounded-2xl border border-border bg-surface p-5 print:hidden">
            <h2 className="mb-3 text-sm font-extrabold text-text">Fichas de parecer</h2>
            {(apps ?? []).length === 0 ? (
              <p className="text-[12.5px] text-text-2">Esta vaga ainda não tem candidaturas.</p>
            ) : (
              <ul className="grid gap-2">
                {(apps ?? []).map((a) => {
                  const f = ficha.get(a.id);
                  return (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2 text-[12.5px]">
                      <span className="font-bold text-text">{nome.get(a.candidate_id) ?? "Candidato"}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-text-2">{f ? (f.status === "fechada" ? "Ficha fechada" : "Rascunho") : "Sem ficha"}</span>
                        <Link href={`/admin/vagas/${vaga.id}/entrevista/${a.id}`} className="font-bold text-navy underline">
                          {f?.status === "fechada" ? "Ver ficha" : "Preencher ficha"}
                        </Link>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
