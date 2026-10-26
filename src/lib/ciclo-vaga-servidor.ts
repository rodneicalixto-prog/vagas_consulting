import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarCriterios, temBloqueio, verificarVaga } from "@/lib/vaga-estruturada";
import type { ContagensVaga } from "@/lib/ciclo-vaga";

export type VagaDoCiclo = {
  id: string;
  titulo: string;
  status: string;
  local: string | null;
  empresa: string;
  contagens: ContagensVaga;
};

/**
 * Carrega a vaga e conta o que existe em cada etapa do ciclo. Só leitura.
 * O chamador já validou o escopo (`exigirVaga`).
 */
export const carregarCicloDaVaga = cache(async (jobId: string): Promise<VagaDoCiclo | null> => {
  const admin = createAdminClient();
  const { data: vaga } = await admin
    .from("jobs")
    .select("id, titulo, status, local, modelo_trabalho, remuneracao_texto, descricao, requisitos, criterios, companies(nome_fantasia, razao_social)")
    .eq("id", jobId)
    .maybeSingle();
  if (!vaga) return null;

  const cont = (tabela: "applications" | "job_screenings" | "assessments" | "offer_letters" | "outreach_drafts") =>
    admin.from(tabela).select("id", { count: "exact", head: true }).eq("job_id", jobId);

  const [cand, triados, fichas, testes, laudos, devol, ofertas, abord, validacoes, prospects] = await Promise.all([
    cont("applications"),
    cont("job_screenings"),
    admin.from("interview_scorecards").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "fechada"),
    admin.from("assessments").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "aprovado"),
    admin.from("candidate_reports").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "assinado"),
    admin.from("candidate_feedbacks").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("status", "enviada"),
    cont("offer_letters"),
    cont("outreach_drafts"),
    admin
      .from("validacoes_reprovacao")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .in("status", ["aguardando", "aguardando_dados"]),
    admin.from("hunter_prospects").select("id", { count: "exact", head: true }).eq("job_id", jobId).is("anonimizado_em", null),
  ]);

  const criterios = normalizarCriterios(vaga.criterios);
  const verificacoes = verificarVaga({
    titulo: vaga.titulo,
    descricao: vaga.descricao,
    requisitos: vaga.requisitos,
    local: vaga.local,
    modelo_trabalho: vaga.modelo_trabalho,
    remuneracao_texto: vaga.remuneracao_texto,
    criterios,
  });
  const emp = Array.isArray(vaga.companies) ? vaga.companies[0] : vaga.companies;

  return {
    id: vaga.id,
    titulo: vaga.titulo,
    status: vaga.status,
    local: vaga.local,
    empresa: emp?.nome_fantasia || emp?.razao_social || "Empresa",
    contagens: {
      statusVaga: vaga.status,
      candidaturas: cand.count ?? 0,
      criteriosConfirmados: !!criterios.confirmado_em,
      criteriosBloqueados: temBloqueio(verificacoes),
      triados: triados.count ?? 0,
      validacoesPendentes: validacoes.count ?? 0,
      fichasFechadas: fichas.count ?? 0,
      testesAprovados: testes.count ?? 0,
      laudosAssinados: laudos.count ?? 0,
      devolutivasEnviadas: devol.count ?? 0,
      ofertas: ofertas.count ?? 0,
      abordagens: abord.count ?? 0,
      prospects: prospects.count ?? 0,
    },
  };
});
