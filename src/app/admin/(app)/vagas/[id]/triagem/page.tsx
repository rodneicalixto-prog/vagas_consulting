import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { normalizarCriterios } from "@/lib/vaga-estruturada";
import { bloqueiosDaTriagem, hashCriterios, ordenarRanking, sugerirCorte, type ResultadoTriagem } from "@/lib/triagem";
import { FormTriagem } from "./form-triagem";

export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROTULO = { atende: "Atende", nao_atende: "Não atende", nao_evidenciado: "Não evidenciado" } as const;
const COR = {
  atende: "bg-success-bg text-success",
  nao_atende: "bg-danger-bg text-danger",
  nao_evidenciado: "bg-gold-bg text-gold-3",
} as const;

export default async function TriagemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ top?: string }>;
}) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  const { top } = await searchParams;
  const topN = [3, 5, 10].includes(Number(top)) ? Number(top) : null;
  if (!UUID.test(id)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: vaga } = await admin.from("jobs").select("id, titulo, criterios").eq("id", id).maybeSingle();
  if (!vaga) redirect("/admin/vagas");
  const criterios = normalizarCriterios(vaga.criterios);
  const bloqueios = bloqueiosDaTriagem(criterios);
  const hash = hashCriterios(criterios);

  const [{ data: telas }, { data: apps }] = await Promise.all([
    admin.from("job_screenings").select("application_id, candidate_id, criterios_hash, resultado, updated_at").eq("job_id", id),
    admin.from("applications").select("id, status").eq("job_id", id),
  ]);
  const ativas = (apps ?? []).filter((a) => !["rejeitada", "desistente", "expirada"].includes(a.status));
  const feitas = new Set((telas ?? []).filter((t) => t.criterios_hash === hash).map((t) => t.application_id));
  const pendentes = ativas.filter((a) => !feitas.has(a.id)).length;

  const ids = [...new Set((telas ?? []).map((t) => t.candidate_id))];
  const { data: perfis } = ids.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", ids)
    : { data: [] as { id: string; nome_completo: string }[] };
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));

  const linhas = ordenarRanking(
    (telas ?? []).map((t) => ({
      id: t.application_id,
      candidato: t.candidate_id,
      desatualizado: t.criterios_hash !== hash,
      resultado: t.resultado as unknown as ResultadoTriagem,
    })),
  );
  const corte = sugerirCorte(linhas);
  const exibidas = topN ? linhas.slice(0, topN) : linhas;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${vaga.id}`} className="text-[11.5px] font-bold text-navy underline">
          ← Critérios da vaga
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Triagem de currículos</h1>
        <p className="mt-1 text-xs text-text-2">
          {vaga.titulo}. Ranking com a evidência de cada critério. A IA só avalia: quem segue para entrevista é decisão sua.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        {bloqueios.length > 0 ? (
          <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[12.5px] font-semibold text-danger">
            Triagem bloqueada: {bloqueios.join(" ")}{" "}
            <Link href={`/admin/vagas/${vaga.id}`} className="underline">
              Ajustar critérios (ou extraí-los da descrição com a IA e confirmar)
            </Link>
          </div>
        ) : (
          <FormTriagem jobId={vaga.id} pendentes={pendentes} />
        )}

        <p className="rounded-xl bg-navy-bg px-4 py-3 text-[12px] text-text-2">
          A triagem usa só título, resumo e histórico profissional do cadastro, sem nome, idade, contato ou
          endereço. Resultado de IA tem revisão humana obrigatória (LGPD, art. 20). O sistema nunca marca
          &quot;reprovado&quot;: indica &quot;não segue por motivo X&quot; e quem decide é a pessoa.
        </p>

        {linhas.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-text">
            <span>
              <b>Sugestão de corte:</b> {corte} candidato(s) com pontuação de 70 ou mais e sem eliminatório.
            </span>
            <span className="flex items-center gap-2">
              Ver:
              {[null, 3, 5, 10].map((n) => (
                <Link
                  key={String(n)}
                  href={n ? `/admin/vagas/${vaga.id}/triagem?top=${n}` : `/admin/vagas/${vaga.id}/triagem`}
                  className={`rounded-lg border border-border px-2 py-0.5 text-[11.5px] font-bold ${
                    topN === n ? "bg-navy text-white" : "bg-surface text-navy"
                  }`}
                >
                  {n ? `Top ${n}` : "Todos"}
                </Link>
              ))}
            </span>
            <a href={`/admin/vagas/${vaga.id}/triagem/exportar`} className="rounded-lg border border-border bg-surface px-3 py-1 text-[11.5px] font-bold text-navy">
              Baixar planilha (CSV)
            </a>
          </div>
        )}

        {exibidas.map((l, i) => {
          const r = l.resultado;
          return (
            <details key={l.id} className="rounded-2xl border border-border bg-surface p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                <span className="text-[12px] font-extrabold text-text-3">#{i + 1}</span>
                <span className="text-sm font-extrabold text-text">{nome.get(l.candidato) ?? "Candidato"}</span>
                <span className="rounded-lg bg-navy-bg px-2 py-0.5 text-[11.5px] font-extrabold text-navy">{r.pontuacao}/100</span>
                <span className="text-[11.5px] text-text-2">
                  obrigatórios {r.obrigatorios.filter((o) => o.estado === "atende").length}/{r.obrigatorios.length}
                </span>
                {r.eliminado && <span className="rounded bg-danger-bg px-2 py-0.5 text-[10.5px] font-extrabold text-danger">Não segue (eliminatório)</span>}
                {l.desatualizado && <span className="rounded bg-gold-bg px-2 py-0.5 text-[10.5px] font-extrabold text-gold-3">Critérios mudaram: refazer</span>}
              </summary>
              <div className="mt-3 grid gap-3 text-[12.5px]">
                {r.resumo && <p className="text-text-2">{r.resumo}</p>}
                {r.motivo_eliminacao && <p className="font-semibold text-danger">{r.motivo_eliminacao}</p>}
                {[["Obrigatórios", r.obrigatorios], ["Desejáveis", r.desejaveis]].map(([titulo, lista]) =>
                  (lista as ResultadoTriagem["obrigatorios"]).length ? (
                    <div key={titulo as string}>
                      <div className="text-[10.5px] font-bold uppercase text-text-3">{titulo as string}</div>
                      <ul className="mt-1 grid gap-1.5">
                        {(lista as ResultadoTriagem["obrigatorios"]).map((c) => (
                          <li key={c.criterio} className="rounded-lg bg-bg px-3 py-2">
                            <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${COR[c.estado]}`}>{ROTULO[c.estado]}</span>
                            {c.criterio}
                            {c.eliminatorio ? <b className="ml-1 text-[10.5px] text-danger">(eliminatório)</b> : null}
                            {c.evidencia && <div className="mt-1 text-[11.5px] italic text-text-2">&ldquo;{c.evidencia}&rdquo;</div>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
                {r.a_validar.length > 0 && (
                  <div>
                    <div className="text-[10.5px] font-bold uppercase text-text-3">A validar na entrevista</div>
                    <ul className="mt-1 list-disc pl-5 text-text-2">
                      {r.a_validar.map((v) => <li key={v}>{v}</li>)}
                    </ul>
                  </div>
                )}
                <Link href={`/admin/candidatos/${l.candidato}`} className="text-[11.5px] font-bold text-navy underline">
                  Abrir o cadastro do candidato
                </Link>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
