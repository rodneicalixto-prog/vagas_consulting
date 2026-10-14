import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InternalRole } from "@/lib/auth/internal";

/**
 * Escopo de dados do painel (carteira por atendente — docs/specs/CARTEIRA_ATENDENTE.md).
 *
 * - admin e superadmin: `todos = true` (sem filtro).
 * - operador: só as empresas com atribuição ATIVA; vagas confidenciais só nas
 *   empresas em que a atribuição tem `acessa_confidenciais`.
 *
 * O painel usa a chave de serviço, então a RLS não protege essas leituras:
 * ESTE helper é a barreira. Toda leitura/ação do operador passa por aqui.
 */
export type Escopo = {
  todos: boolean;
  /** Empresas da carteira ativa (vazio para `todos`). */
  empresas: string[];
  /** Subconjunto de `empresas` em que vê vagas confidenciais. */
  confidenciais: string[];
};

/** UUID que nunca existe: usado para que `.in()` com lista vazia não devolva tudo. */
const NENHUMA = "00000000-0000-0000-0000-000000000000";

export const obterEscopo = cache(async (userId: string, role: InternalRole): Promise<Escopo> => {
  if (role === "superadmin" || role === "admin") {
    return { todos: true, empresas: [], confidenciais: [] };
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("company_assignments")
    .select("company_id, acessa_confidenciais")
    .eq("user_id", userId)
    .eq("ativo", true);

  const linhas = data ?? [];
  return {
    todos: false,
    empresas: linhas.map((l) => l.company_id),
    confidenciais: linhas.filter((l) => l.acessa_confidenciais).map((l) => l.company_id),
  };
});

/** Lista segura para `.in("company_id", …)`: nunca vazia. */
export function empresasParaFiltro(e: Escopo): string[] {
  return e.empresas.length > 0 ? e.empresas : [NENHUMA];
}

/**
 * Expressão `.or(...)` do PostgREST para tabelas de vagas: vaga não
 * confidencial OU empresa em que o usuário é de confiança.
 */
export function filtroConfidencialJobs(e: Escopo): string {
  if (e.confidenciais.length === 0) return "confidencial.eq.false";
  return `confidencial.eq.false,company_id.in.(${e.confidenciais.join(",")})`;
}

export function podeVerEmpresa(e: Escopo, companyId: string | null | undefined): boolean {
  if (e.todos) return true;
  return !!companyId && e.empresas.includes(companyId);
}

export function podeVerVaga(
  e: Escopo,
  vaga: { company_id: string | null; confidencial?: boolean | null },
): boolean {
  if (e.todos) return true;
  if (!podeVerEmpresa(e, vaga.company_id)) return false;
  if (!vaga.confidencial) return true;
  return !!vaga.company_id && e.confidenciais.includes(vaga.company_id);
}

/** Carrega a vaga e exige que esteja no escopo; senão, acesso negado. */
export async function exigirVaga(e: Escopo, jobId: string) {
  const admin = createAdminClient();
  const { data: vaga } = await admin
    .from("jobs")
    .select("id, company_id, confidencial, status, modalidade")
    .eq("id", jobId)
    .maybeSingle();
  if (!vaga || !podeVerVaga(e, vaga)) redirect("/admin/acesso-negado");
  return vaga;
}

export function exigirEmpresa(e: Escopo, companyId: string) {
  if (!podeVerEmpresa(e, companyId)) redirect("/admin/acesso-negado");
}

/**
 * IDs de vagas que o escopo enxerga (para encadear filtros de candidatura,
 * convite etc.). `null` significa "sem filtro" (admin/superadmin).
 */
export async function vagasVisiveis(e: Escopo): Promise<string[] | null> {
  if (e.todos) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("jobs")
    .select("id")
    .in("company_id", empresasParaFiltro(e))
    .or(filtroConfidencialJobs(e));
  const ids = (data ?? []).map((v) => v.id);
  return ids.length > 0 ? ids : [NENHUMA];
}

/**
 * Candidatos que o escopo enxerga: quem tem candidatura ou convite em vaga
 * visível. `null` = sem filtro.
 */
export async function candidatosVisiveis(e: Escopo): Promise<string[] | null> {
  const vagas = await vagasVisiveis(e);
  if (vagas === null) return null;
  const admin = createAdminClient();
  const [{ data: cands }, { data: convs }] = await Promise.all([
    admin.from("applications").select("candidate_id").in("job_id", vagas),
    admin.from("invites").select("candidate_id").in("job_id", vagas),
  ]);
  const ids = new Set<string>([
    ...(cands ?? []).map((c) => c.candidate_id),
    ...(convs ?? []).map((c) => c.candidate_id),
  ]);
  return ids.size > 0 ? [...ids] : [NENHUMA];
}
