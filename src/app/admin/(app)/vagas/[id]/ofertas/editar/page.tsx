import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { dadosVazios, regimeSugerido, ROTULO_MODELO, type DadosOferta, type ModeloTrabalho } from "@/lib/oferta";
import { FormOferta } from "../forms-oferta";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarOfertaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ app?: string; oferta?: string }>;
}) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  const { app: appId, oferta } = await searchParams;
  if (!UUID.test(id) || !appId || !UUID.test(appId)) notFound();
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const [{ data: app }, { data: vaga }] = await Promise.all([
    admin.from("applications").select("id, job_id, candidate_id").eq("id", appId).maybeSingle(),
    admin
      .from("jobs")
      .select("id, titulo, local, modalidade, modelo_trabalho, remuneracao_texto, confidencial, companies(nome_fantasia, razao_social)")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (!app || app.job_id !== id || !vaga) redirect(`/admin/vagas/${id}/ofertas`);
  const { data: perfil } = await admin.from("profiles").select("nome_completo").eq("id", app.candidate_id).maybeSingle();
  const emp = Array.isArray(vaga.companies) ? vaga.companies[0] : vaga.companies;

  // Sugestões da vaga; o que não é fato da vaga (salário, datas, condições) fica vazio.
  const base: DadosOferta = {
    ...dadosVazios(),
    empresa: vaga.confidencial ? "" : emp?.nome_fantasia || emp?.razao_social || "",
    candidato: perfil?.nome_completo ?? "",
    cargo: vaga.titulo,
    regime: regimeSugerido(vaga.modalidade),
    modelo: vaga.modelo_trabalho ? ROTULO_MODELO[vaga.modelo_trabalho as ModeloTrabalho] ?? "" : "",
    local: vaga.local ?? "",
  };

  let dados = base;
  let offerId: string | null = null;
  if (oferta && UUID.test(oferta)) {
    const { data: o } = await admin
      .from("offer_letters")
      .select("id, job_id, application_id, status, dados, criado_por")
      .eq("id", oferta)
      .maybeSingle();
    const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";
    if (o && o.job_id === id && o.application_id === appId && o.status === "rascunho" && (gestao || o.criado_por === user.id)) {
      dados = { ...base, ...(o.dados as unknown as DadosOferta) };
      offerId = o.id;
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href={`/admin/vagas/${id}/ofertas`} className="text-[11.5px] font-bold text-navy underline">← Cartas-oferta</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Carta-oferta para {perfil?.nome_completo ?? "o candidato"}</h1>
        <p className="mt-1 text-xs text-text-2">
          {vaga.titulo}. Preencha o que a proposta tem; o que faltar fica marcado na carta.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <FormOferta
          jobId={id}
          applicationId={appId}
          offerId={offerId}
          dados={dados}
          referenciaFaixa={vaga.remuneracao_texto ?? null}
        />
      </div>
    </div>
  );
}
