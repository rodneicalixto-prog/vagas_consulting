import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import type { InternalRole } from "@/lib/auth/internal";

export type EntrevistaAgenda = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string | null;
  status: string;
  responsavel: string;
  applicationId: string | null;
  candidatoId: string | null;
  candidato: string;
  vaga: string;
  empresa: string;
  etapa: string | null;
};

type EmpresaRef = { nome_fantasia: string | null; razao_social: string };
const DIA_MS = 24 * 3600_000;

/**
 * Entrevistas agendadas visíveis ao usuário.
 * - admin/superadmin: todas;
 * - operador: as próprias + as ligadas a candidaturas de vagas da carteira.
 * Nunca devolve dado de contato.
 */
export async function carregarEntrevistas(
  userId: string,
  role: InternalRole,
  diasAtras = 30,
  agora = Date.now(),
): Promise<EntrevistaAgenda[]> {
  const admin = createAdminClient();
  const escopo = await obterEscopo(userId, role);
  const desde = new Date(agora - diasAtras * DIA_MS).toISOString();

  const { data: compromissos } = await admin
    .from("compromissos")
    .select("id, titulo, inicio, fim, status, responsavel_id, application_id")
    .eq("tipo", "entrevista")
    .gte("inicio", desde)
    .order("inicio", { ascending: true })
    .limit(2000);

  let lista = compromissos ?? [];

  const idsApp = [...new Set(lista.map((c) => c.application_id).filter((v): v is string => !!v))];
  const { data: apps } = idsApp.length
    ? await admin
        .from("applications")
        .select("id, candidate_id, job_id, status, jobs(titulo, companies(nome_fantasia, razao_social))")
        .in("id", idsApp)
    : { data: [] };
  const appPorId = new Map((apps ?? []).map((a) => [a.id, a]));

  if (!escopo.todos) {
    const vagas = new Set((await vagasVisiveis(escopo)) ?? []);
    lista = lista.filter((c) => {
      if (c.responsavel_id === userId) return true;
      const app = c.application_id ? appPorId.get(c.application_id) : null;
      return !!app && vagas.has(app.job_id);
    });
  }

  const idsCand = [...new Set((apps ?? []).map((a) => a.candidate_id))];
  const idsResp = [...new Set(lista.map((c) => c.responsavel_id))];
  const [{ data: perfis }, { data: equipe }] = await Promise.all([
    idsCand.length
      ? admin.from("profiles").select("id, nome_completo").in("id", idsCand)
      : Promise.resolve({ data: [] as { id: string; nome_completo: string }[] }),
    idsResp.length
      ? admin.from("admin_users").select("user_id, nome_exibicao").in("user_id", idsResp)
      : Promise.resolve({ data: [] as { user_id: string; nome_exibicao: string | null }[] }),
  ]);
  const nomeCand = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));
  const nomeResp = new Map((equipe ?? []).map((e) => [e.user_id, e.nome_exibicao ?? `#${e.user_id.slice(0, 8)}`]));

  return lista.map((c) => {
    const app = c.application_id ? appPorId.get(c.application_id) : null;
    const job = app ? (Array.isArray(app.jobs) ? app.jobs[0] : app.jobs) : null;
    const emp = job
      ? ((Array.isArray(job.companies) ? job.companies[0] : job.companies) as EmpresaRef | null)
      : null;
    return {
      id: c.id,
      titulo: c.titulo,
      inicio: c.inicio,
      fim: c.fim,
      status: c.status,
      responsavel: nomeResp.get(c.responsavel_id) ?? "—",
      applicationId: c.application_id,
      candidatoId: app?.candidate_id ?? null,
      candidato: app ? (nomeCand.get(app.candidate_id) ?? "Candidato") : "—",
      vaga: job?.titulo ?? "—",
      empresa: emp?.nome_fantasia ?? emp?.razao_social ?? "—",
      etapa: app?.status ?? null,
    };
  });
}
