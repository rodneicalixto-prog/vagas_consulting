import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { FormDivulgacao } from "./form-divulgacao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DivulgacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: vaga } = await admin
    .from("jobs")
    .select("id, titulo, status, remuneracao_texto, confidencial, criterios")
    .eq("id", id)
    .maybeSingle();
  if (!vaga) redirect("/admin/vagas");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${vaga.id}`} className="text-[11.5px] font-bold text-navy underline">
          ← Critérios da vaga
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Divulgação da vaga</h1>
        <p className="mt-1 text-xs text-text-2">
          {vaga.titulo}. Texto pronto por canal, a partir dos critérios da vaga. Confira, copie e publique.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <FormDivulgacao
          jobId={vaga.id}
          temFaixa={!!vaga.remuneracao_texto}
          publicada={vaga.status === "publicada"}
        />
      </div>
    </div>
  );
}
