import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { ROTULO_TIPO, tipoValido } from "@/lib/avaliacao";
import { FormTeste } from "./form-teste";

export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TestesPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: vaga } = await admin.from("jobs").select("id, titulo").eq("id", id).maybeSingle();
  if (!vaga) redirect("/admin/vagas");
  const { data: itens } = await admin
    .from("assessments")
    .select("id, tipo, competencia, titulo, status, created_at")
    .eq("job_id", id)
    .neq("status", "arquivado")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${vaga.id}`} className="text-[11.5px] font-bold text-navy underline">
          ← Critérios da vaga
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Testes e dinâmicas</h1>
        <p className="mt-1 text-xs text-text-2">
          {vaga.titulo}. Instrumento com folha do candidato e folha do aplicador separadas, aprovado antes de aplicar.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        <FormTeste jobId={vaga.id} />
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-extrabold text-text">Instrumentos da vaga</h2>
          {(itens ?? []).length === 0 ? (
            <p className="text-[12.5px] text-text-2">Nenhum instrumento ainda.</p>
          ) : (
            <ul className="grid gap-2">
              {(itens ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2 text-[12.5px]">
                  <span>
                    <b className="text-text">{a.titulo || "Instrumento"}</b>{" "}
                    <span className="text-text-2">
                      · {tipoValido(a.tipo) ? ROTULO_TIPO[a.tipo] : a.tipo} · {a.competencia}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={a.status === "aprovado" ? "font-bold text-success" : "text-text-2"}>
                      {a.status === "aprovado" ? "Aprovado" : "Rascunho"}
                    </span>
                    <Link href={`/admin/vagas/${vaga.id}/testes/${a.id}`} className="font-bold text-navy underline">Abrir</Link>
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
