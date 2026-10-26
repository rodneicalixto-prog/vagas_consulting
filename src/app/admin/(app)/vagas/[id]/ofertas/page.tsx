import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROTULO: Record<string, string> = { rascunho: "Rascunho", enviada: "Enviada", aceita: "Aceita", recusada: "Recusada" };

export default async function OfertasPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);
  const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";

  const admin = createAdminClient();
  const { data: vaga } = await admin.from("jobs").select("id, titulo").eq("id", id).maybeSingle();
  if (!vaga) redirect("/admin/vagas");

  const [{ data: apps }, { data: cartas }] = await Promise.all([
    admin.from("applications").select("id, candidate_id, status").eq("job_id", id).limit(200),
    admin
      .from("offer_letters")
      .select("id, application_id, versao, status, validade, criado_por")
      .eq("job_id", id)
      .order("versao", { ascending: false })
      .limit(500),
  ]);
  const candIds = [...new Set((apps ?? []).map((a) => a.candidate_id))];
  const { data: perfis } = candIds.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", candIds)
    : { data: [] as { id: string; nome_completo: string }[] };
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));
  const visiveis = (cartas ?? []).filter((c) => gestao || c.criado_por === user.id);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${vaga.id}`} className="text-[11.5px] font-bold text-navy underline">← Central da vaga</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Carta-oferta</h1>
        <p className="mt-1 text-xs text-text-2">
          {vaga.titulo}. Documento montado só com o que você informar. Peça revisão do DP/jurídico antes de enviar.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-3">
        {(apps ?? []).length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-5 text-[12.5px] text-text-2">Esta vaga ainda não tem candidaturas.</p>
        ) : (
          (apps ?? []).map((a) => {
            const minhas = visiveis.filter((c) => c.application_id === a.id);
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4">
                <span className="text-sm font-extrabold text-text">
                  {nome.get(a.candidate_id) ?? "Candidato"}{" "}
                  <span className="text-[11.5px] font-normal text-text-3">· {a.status}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-[11.5px]">
                  {minhas.map((c) => (
                    <Link key={c.id} href={`/admin/vagas/${id}/ofertas/${c.id}`} className="rounded-lg bg-bg px-2 py-1 font-bold text-navy underline">
                      v{c.versao} · {ROTULO[c.status] ?? c.status}
                    </Link>
                  ))}
                  <Link href={`/admin/vagas/${id}/ofertas/editar?app=${a.id}`} className="rounded-lg bg-navy px-3 py-1 font-bold text-white">
                    {minhas.length > 0 ? "Nova versão" : "Montar carta"}
                  </Link>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
