import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { normalizarCriterios } from "@/lib/vaga-estruturada";
import { competenciasDaVaga, reunirFontes } from "@/lib/laudo-servidor";
import { quadroComparativo } from "@/lib/laudo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ComparativoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  const { ids } = await searchParams;
  if (!UUID.test(id)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const pedidos = [...new Set((Array.isArray(ids) ? ids : ids ? [ids] : []).filter((x) => UUID.test(x)))].slice(0, 6);
  if (pedidos.length < 2) redirect(`/admin/vagas/${id}/laudos`);

  const admin = createAdminClient();
  const { data: vaga } = await admin.from("jobs").select("id, titulo, criterios").eq("id", id).maybeSingle();
  if (!vaga) redirect("/admin/vagas");
  const criterios = normalizarCriterios(vaga.criterios);

  const { data: apps } = await admin.from("applications").select("id, candidate_id, job_id").in("id", pedidos);
  const validos = (apps ?? []).filter((a) => a.job_id === id);
  const { data: perfis } = validos.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", validos.map((a) => a.candidate_id))
    : { data: [] as { id: string; nome_completo: string }[] };
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));

  const candidatos = await Promise.all(
    validos.map(async (a) => {
      const { conteudo } = await reunirFontes(admin, id, a.id, criterios);
      return { id: a.id, nome: nome.get(a.candidate_id) ?? "Candidato", linhas: conteudo.linhas, fontes: conteudo.fontes.filter((f) => f.disponivel).length };
    }),
  );
  const quadro = quadroComparativo(
    competenciasDaVaga(criterios).map((c) => c.nome),
    candidatos,
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${id}/laudos`} className="text-[11.5px] font-bold text-navy underline">← Laudos</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Quadro comparativo</h1>
        <p className="mt-1 text-xs text-text-2">
          {vaga.titulo}. Aderência de 1 a 4 por competência, com o que já foi salvo. &quot;—&quot; é não avaliado, não nota baixa.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-4">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="text-[10.5px] uppercase text-text-3">
                <th className="py-1 pr-3">Competência</th>
                {candidatos.map((c) => <th key={c.id} className="py-1 pr-3">{c.nome}</th>)}
              </tr>
            </thead>
            <tbody>
              {quadro.map((q) => (
                <tr key={q.competencia} className="border-t border-border">
                  <td className="py-2 pr-3 font-semibold text-text">{q.competencia}</td>
                  {q.celulas.map((cel) => (
                    <td key={cel.candidato} className="py-2 pr-3 font-bold">{cel.aderencia ?? "—"}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-border text-text-2">
                <td className="py-2 pr-3">Fontes usadas</td>
                {candidatos.map((c) => <td key={c.id} className="py-2 pr-3">{c.fontes} de 3</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-text-2">
          O comparativo mostra evidência, não decide. Candidatos com menos fontes não são comparáveis de forma justa.
        </p>
      </div>
    </div>
  );
}
