import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { ROTULO_NOTA, ROTULO_TIPO, folhaDoCandidato, type Instrumento } from "@/lib/avaliacao";
import { BotaoAprovar, FormNota, ImprimirBotao } from "./acoes-teste";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InstrumentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
  searchParams: Promise<{ folha?: string }>;
}) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id, assessmentId } = await params;
  const { folha } = await searchParams;
  if (!UUID.test(id) || !UUID.test(assessmentId)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: a } = await admin
    .from("assessments")
    .select("id, job_id, tipo, status, conteudo")
    .eq("id", assessmentId)
    .eq("job_id", id)
    .maybeSingle();
  if (!a) redirect(`/admin/vagas/${id}/testes`);
  const instr = a.conteudo as unknown as Instrumento;

  // Folha do candidato: documento próprio, sem gabarito, critério, rubrica nem grade.
  if (folha === "candidato") {
    const f = folhaDoCandidato(instr);
    return (
      <div className="mx-auto max-w-3xl px-6 py-8 text-[14px] leading-relaxed text-text">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href={`/admin/vagas/${id}/testes/${a.id}`} className="text-[11.5px] font-bold text-navy underline">← Voltar</Link>
          <ImprimirBotao />
        </div>
        <h1 className="text-xl font-extrabold">{f.titulo}</h1>
        <p className="mt-1 text-[12px] text-text-2">Tempo: {f.tempo_min} minutos</p>
        {f.instrucoes && <p className="mt-4 whitespace-pre-wrap">{f.instrucoes}</p>}
        {f.materiais && <p className="mt-3 text-[13px]"><b>Materiais:</b> {f.materiais}</p>}
        <ol className="mt-4 grid gap-4">
          {f.questoes.map((q) => (
            <li key={q.numero}>
              <p className="font-semibold">{q.numero}. {q.enunciado}</p>
              {q.alternativas.length > 0 && (
                <ul className="mt-1 grid gap-1 pl-5">
                  {q.alternativas.map((alt, i) => <li key={alt}>({String.fromCharCode(97 + i)}) {alt}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const [{ data: resultados }, { data: apps }] = await Promise.all([
    admin.from("assessment_results").select("application_id, nota, evidencia").eq("assessment_id", a.id),
    admin.from("applications").select("id, candidate_id").eq("job_id", id).limit(200),
  ]);
  const candIds = [...new Set((apps ?? []).map((x) => x.candidate_id))];
  const { data: perfis } = candIds.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", candIds)
    : { data: [] as { id: string; nome_completo: string }[] };
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));
  const candidatos = (apps ?? []).map((x) => ({ id: x.id, nome: nome.get(x.candidate_id) ?? "Candidato" }));
  const porApp = new Map((resultados ?? []).map((r) => [r.application_id, r]));
  const aprovado = a.status === "aprovado";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7 print:hidden">
        <Link href={`/admin/vagas/${id}/testes`} className="text-[11.5px] font-bold text-navy underline">← Testes e dinâmicas</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">{instr.titulo}</h1>
        <p className="mt-1 text-xs text-text-2">
          {ROTULO_TIPO[instr.tipo]} · {instr.competencia} · {instr.tempo_min} min · {aprovado ? "Aprovado" : "Rascunho"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        {(instr.avisos.length > 0 || instr.removidos.length > 0) && (
          <ul className="grid gap-1 print:hidden">
            {[...instr.avisos, ...instr.removidos].map((m) => (
              <li key={m} className="rounded-lg bg-gold-bg px-3 py-2 text-[12px] font-semibold text-gold-3">{m}</li>
            ))}
          </ul>
        )}

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-text">Folha do aplicador (com gabarito e rubrica)</h2>
            <span className="flex items-center gap-2 print:hidden">
              <Link href={`/admin/vagas/${id}/testes/${a.id}?folha=candidato`} className="rounded-lg border border-border bg-surface px-3 py-1 text-[11.5px] font-bold text-navy">
                Abrir folha do candidato
              </Link>
              <ImprimirBotao />
              <a href={`/admin/vagas/${id}/testes/${a.id}/exportar?folha=candidato`} className="rounded-lg border border-border bg-surface px-3 py-1 text-[11.5px] font-bold text-navy print:hidden">
                Word: candidato
              </a>
              <a href={`/admin/vagas/${id}/testes/${a.id}/exportar?folha=aplicador`} className="rounded-lg border border-border bg-surface px-3 py-1 text-[11.5px] font-bold text-navy print:hidden">
                Word: aplicador
              </a>
            </span>
          </div>
          {instr.instrucoes_candidato && <p className="whitespace-pre-wrap text-[13px]"><b>Instruções:</b> {instr.instrucoes_candidato}</p>}
          {instr.materiais && <p className="mt-2 text-[13px]"><b>Materiais:</b> {instr.materiais}</p>}

          {instr.questoes.length > 0 && (
            <ol className="mt-3 grid gap-3 text-[13px]">
              {instr.questoes.map((q, i) => (
                <li key={q.enunciado} className="rounded-xl bg-bg p-3">
                  <p className="font-semibold text-text">{i + 1}. {q.enunciado}</p>
                  <p className="text-[11.5px] text-text-3">Mede: {q.competencia}</p>
                  {q.alternativas.length > 0 && (
                    <ul className="mt-1 pl-5 text-text-2">
                      {q.alternativas.map((alt, k) => <li key={alt}>({String.fromCharCode(97 + k)}) {alt}</li>)}
                    </ul>
                  )}
                  {q.gabarito && <p className="mt-1"><b>Gabarito:</b> {q.gabarito}</p>}
                  {q.criterio && <p className="text-text-2"><b>Critério:</b> {q.criterio}</p>}
                </li>
              ))}
            </ol>
          )}

          {instr.rubrica.length > 0 && (
            <div className="mt-3 text-[13px]">
              <div className="text-[10.5px] font-bold uppercase text-text-3">Rubrica</div>
              <ul className="mt-1 grid gap-1">
                {instr.rubrica.map((r) => (
                  <li key={r.nivel} className="rounded-lg bg-bg px-3 py-2"><b>{r.nivel} · {ROTULO_NOTA[r.nivel]}:</b> {r.descricao}</li>
                ))}
              </ul>
            </div>
          )}

          {instr.grade.length > 0 && (
            <div className="mt-3 text-[13px]">
              <div className="text-[10.5px] font-bold uppercase text-text-3">Grade de observação</div>
              <ul className="mt-1 grid gap-2">
                {instr.grade.map((g) => (
                  <li key={g.comportamento} className="rounded-lg bg-bg px-3 py-2">
                    <b>{g.comportamento}</b>
                    <ol className="mt-1 grid gap-0.5 text-text-2">
                      {g.niveis.map((n, i) => <li key={i}>{i + 1} · {ROTULO_NOTA[i + 1]}: {n || "(não descrito)"}</li>)}
                    </ol>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {instr.observacoes_aplicador && <p className="mt-3 text-[12.5px] text-text-2"><b>Observações:</b> {instr.observacoes_aplicador}</p>}
          {instr.adaptacoes_pcd && <p className="mt-1 text-[12.5px] text-text-2"><b>Adaptações para PcD (confirme com a pessoa):</b> {instr.adaptacoes_pcd}</p>}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 print:hidden">
          {aprovado ? (
            <>
              <h2 className="mb-3 text-sm font-extrabold text-text">Registrar nota do candidato</h2>
              <FormNota jobId={id} assessmentId={a.id} candidatos={candidatos} />
              {(resultados ?? []).length > 0 && (
                <ul className="mt-4 grid gap-1.5 text-[12.5px]">
                  {candidatos.filter((c) => porApp.has(c.id)).map((c) => {
                    const r = porApp.get(c.id)!;
                    return (
                      <li key={c.id} className="rounded-lg bg-bg px-3 py-2">
                        <b>{c.nome}</b>: {r.nota} · {ROTULO_NOTA[r.nota]}{r.evidencia ? ` — ${r.evidencia}` : ""}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <>
              <h2 className="mb-3 text-sm font-extrabold text-text">Liberar para aplicação</h2>
              <BotaoAprovar jobId={id} assessmentId={a.id} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
