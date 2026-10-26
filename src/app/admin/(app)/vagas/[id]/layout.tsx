import { notFound, redirect } from "next/navigation";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { calcularEtapas } from "@/lib/ciclo-vaga";
import { carregarCicloDaVaga } from "@/lib/ciclo-vaga-servidor";
import { RodapeCiclo, TrilhaCiclo } from "./trilha-ciclo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Moldura de toda página da vaga: trilha do ciclo no topo e saída clara no rodapé. */
export default async function VagaLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const vaga = await carregarCicloDaVaga(id);
  if (!vaga) redirect("/admin/vagas");

  const etapas = calcularEtapas(vaga.contagens).map(({ chave, rotulo, estado, resumo }) => ({ chave, rotulo, estado, resumo }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TrilhaCiclo jobId={id} titulo={vaga.titulo} empresa={vaga.empresa} etapas={etapas} />
      <div className="min-h-0 flex-1">{children}</div>
      <RodapeCiclo jobId={id} etapas={etapas} />
    </div>
  );
}
