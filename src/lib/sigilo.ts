/**
 * Sigilo de vaga confidencial (docs/specs/CARTEIRA_ATENDENTE.md).
 *
 * O candidato vê "Empresa confidencial" no lugar do nome da empresa até a
 * candidatura chegar à etapa de entrevista (ou além). Aplicado na renderização
 * das telas do candidato.
 */
export const EMPRESA_CONFIDENCIAL = "Empresa confidencial";

/** Etapas da candidatura em que a identidade da empresa é revelada. */
const ETAPAS_QUE_REVELAM = new Set(["entrevista", "teste", "proposta", "contratado"]);

/** A etapa informada já revela a identidade da empresa? */
export function revelaEmpresa(status: string): boolean {
  return ETAPAS_QUE_REVELAM.has(status);
}

type Empresa = { nome_fantasia: string | null; razao_social: string } | null | undefined;

export function nomeEmpresa(
  empresa: Empresa,
  confidencial: boolean | null | undefined,
  statusCandidatura?: string | null,
  fallback = "",
): string {
  if (confidencial && !(statusCandidatura && ETAPAS_QUE_REVELAM.has(statusCandidatura))) {
    return EMPRESA_CONFIDENCIAL;
  }
  return empresa?.nome_fantasia ?? empresa?.razao_social ?? fallback;
}
