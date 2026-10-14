import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarTelefoneBR } from "@/lib/whatsapp";

/**
 * A pessoa está na black list da empresa?
 * Bloqueia por cadastro (candidate_id) ou por telefone informado pela
 * empresa, que vale mesmo antes de a pessoa se cadastrar.
 */
export async function bloqueadoNaEmpresa(
  companyId: string | null | undefined,
  pessoa: { id: string; telefone?: string | null },
): Promise<boolean> {
  if (!companyId) return false;
  const admin = createAdminClient();
  const tel = normalizarTelefoneBR(pessoa.telefone ?? null);
  const filtro = tel
    ? `candidate_id.eq.${pessoa.id},telefone_normalizado.eq.${tel}`
    : `candidate_id.eq.${pessoa.id}`;
  const { data } = await admin
    .from("company_blacklist")
    .select("id")
    .eq("company_id", companyId)
    .eq("ativo", true)
    .or(filtro)
    .limit(1);
  return !!data && data.length > 0;
}

/** Candidatos bloqueados (por cadastro) em qualquer uma das empresas. */
export async function idsBloqueadosNasEmpresas(companyIds: string[]): Promise<string[]> {
  if (companyIds.length === 0) return [];
  const { data } = await createAdminClient()
    .from("company_blacklist")
    .select("candidate_id")
    .in("company_id", companyIds)
    .eq("ativo", true)
    .not("candidate_id", "is", null);
  return [...new Set((data ?? []).map((r) => r.candidate_id as string))];
}
