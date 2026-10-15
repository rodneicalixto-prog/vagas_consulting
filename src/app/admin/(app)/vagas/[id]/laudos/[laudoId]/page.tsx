import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { ROTULO_FONTE, ROTULO_RECOMENDACAO, type ConteudoLaudo, type Recomendacao } from "@/lib/laudo";
import { FormAssinatura, ImprimirBotao } from "./form-assinatura";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LaudoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; laudoId: string }>;
  searchParams: Promise<{ visao?: string }>;
}) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id, laudoId } = await params;
  const { visao } = await searchParams;
  if (!UUID.test(id) || !UUID.test(laudoId)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: l } = await admin
    .from("candidate_reports")
    .select("id, job_id, application_id, versao, modo, conteudo, recomendacao, status, criado_por, assinado_em")
    .eq("id", laudoId)
    .eq("job_id", id)
    .maybeSingle();
  if (!l) redirect(`/admin/vagas/${id}/laudos`);
  const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";
  if (!gestao && l.criado_por !== user.id) redirect(`/admin/vagas/${id}/laudos`);

  const [{ data: vaga }, { data: app }] = await Promise.all([
    admin.from("jobs").select("titulo").eq("id", id).maybeSingle(),
    admin.from("applications").select("candidate_id").eq("id", l.application_id).maybeSingle(),
  ]);
  const { data: perfil } = app
    ? await admin.from("profiles").select("nome_completo").eq("id", app.candidate_id).maybeSingle()
    : { data: null };

  const c = l.conteudo as unknown as ConteudoLaudo;
  const rec = (l.recomendacao as unknown as Recomendacao | null) ?? null;
  const gestor = visao === "gestor";
  const assinado = l.status === "assinado";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7 print:hidden">
        <Link href={`/admin/vagas/${id}/laudos`} className="text-[11.5px] font-bold text-navy underline">← Laudos</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">
          Laudo v{l.versao} · {assinado ? "assinado" : "rascunho"}
        </h1>
        <p className="mt-1 text-xs text-text-2">
          {l.modo === "fatos" ? "Só fatos, sem recomendação." : "Com recomendação da pessoa."}{" "}
          {gestor ? (
            <Link href={`/admin/vagas/${id}/laudos/${l.id}`} className="font-bold text-navy underline">Ver laudo completo</Link>
          ) : (
            <Link href={`/admin/vagas/${id}/laudos/${l.id}?visao=gestor`} className="font-bold text-navy underline">Resumo para o gestor</Link>
          )}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-text">
              {perfil?.nome_completo ?? "Candidato"} · {vaga?.titulo ?? "Vaga"}
            </h2>
            <ImprimirBotao />
          </div>

          {c.limitacoes.length > 0 && (
            <ul className="mb-3 grid gap-1">
              {c.limitacoes.map((m) => (
                <li key={m} className="rounded-lg bg-gold-bg px-3 py-2 text-[12px] font-semibold text-gold-3">{m}</li>
              ))}
            </ul>
          )}

          <div className="mb-3 text-[12px] text-text-2">
            <b className="text-text">Fontes:</b>{" "}
            {c.fontes.map((f) => `${ROTULO_FONTE[f.fonte]}: ${f.disponivel ? "usada" : "não avaliado"}`).join(" · ")}
          </div>

          {c.resumo && (
            <p className="mb-3 whitespace-pre-wrap text-[13px]">
              <b>Resumo do perfil:</b> {c.resumo}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase text-text-3">
                  <th className="py-1 pr-3">Competência</th>
                  <th className="py-1 pr-3">O cargo exige</th>
                  {!gestor && <th className="py-1 pr-3">Como se apresenta (fonte)</th>}
                  <th className="py-1 pr-3">Aderência</th>
                  {!gestor && <th className="py-1">Força</th>}
                </tr>
              </thead>
              <tbody>
                {c.linhas.map((ln) => (
                  <tr key={ln.id} className="border-t border-border align-top">
                    <td className="py-2 pr-3 font-semibold text-text">{ln.id} · {ln.competencia}</td>
                    <td className="py-2 pr-3 text-text-2">{ln.exige}</td>
                    {!gestor && (
                      <td className="py-2 pr-3">
                        {ln.estado === "avaliado" ? (
                          <ul className="grid gap-1">
                            {ln.evidencias.map((e) => (
                              <li key={`${e.fonte}-${e.texto}`}>
                                <span className="text-[10.5px] font-bold text-text-3">{ROTULO_FONTE[e.fonte]} ({e.nota}):</span> {e.texto}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-text-2">Não avaliado. {ln.como_avaliar}</span>
                        )}
                      </td>
                    )}
                    <td className="py-2 pr-3 font-bold">{ln.aderencia ?? "—"}</td>
                    {!gestor && <td className="py-2 text-text-2">{ln.forca}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {c.fit.length > 0 && (
            <div className="mt-4 text-[12.5px]">
              <div className="text-[10.5px] font-bold uppercase text-text-3">Fit cultural</div>
              <ul className="mt-1 grid gap-1">
                {c.fit.map((f) => (
                  <li key={f.nome}><b>{f.nome}:</b> {f.nota}{!gestor && f.evidencia ? ` — ${f.evidencia}` : ""}</li>
                ))}
              </ul>
            </div>
          )}

          {[
            ["Pontos fortes", c.fortes],
            ["A validar", c.a_validar],
            ["Divergências entre fontes", c.divergencias],
          ].map(([titulo, lista]) =>
            (lista as string[]).length ? (
              <div key={titulo as string} className="mt-4 text-[12.5px]">
                <div className="text-[10.5px] font-bold uppercase text-text-3">{titulo as string}</div>
                <ul className="mt-1 list-disc pl-5 text-text-2">
                  {(lista as string[]).map((x) => <li key={x}>{x}</li>)}
                </ul>
              </div>
            ) : null,
          )}

          {l.modo === "recomendacao" && rec && (
            <div className="mt-4 rounded-xl bg-navy-bg p-3 text-[13px]">
              <b>Recomendação: {ROTULO_RECOMENDACAO[rec.tipo]}.</b> {rec.porque}
              {rec.condicoes && <div className="mt-1"><b>Condições:</b> {rec.condicoes}</div>}
              <div className="mt-1 text-[11.5px] text-text-2">Linhas citadas: {rec.linhas.join(", ")}</div>
            </div>
          )}
          {assinado && l.assinado_em && (
            <p className="mt-3 text-[11.5px] text-text-3">Assinado em {new Date(l.assinado_em).toLocaleString("pt-BR")}.</p>
          )}
        </section>

        {!assinado && (
          <FormAssinatura jobId={id} laudoId={l.id} modo={l.modo as "fatos" | "recomendacao"} linhas={c.linhas} inicialRec={rec} />
        )}
      </div>
    </div>
  );
}
