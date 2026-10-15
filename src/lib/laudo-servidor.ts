import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type { Criterios } from "@/lib/vaga-estruturada";
import type { ItemFicha } from "@/lib/entrevista";
import type { ResultadoTriagem } from "@/lib/triagem";
import { montarMatching, type ConteudoLaudo, type EntradaMatching } from "@/lib/laudo";

type Admin = ReturnType<typeof createAdminClient>;

/** Competências do cargo na ordem da vaga estruturada (3O). */
export function competenciasDaVaga(c: Criterios): { nome: string; exige: string }[] {
  const vistos = new Set<string>();
  const out: { nome: string; exige: string }[] = [];
  const elim = new Set(c.eliminatorios.map((e) => e.toLowerCase()));
  for (const o of c.obrigatorios) {
    const k = o.toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push({ nome: o, exige: elim.has(k) ? "Requisito obrigatório e eliminatório" : "Requisito obrigatório" });
  }
  for (const d of c.desejaveis) {
    const k = d.toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push({ nome: d, exige: "Requisito desejável" });
  }
  for (const m of c.comportamentais) {
    const k = m.toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push({ nome: m, exige: "Competência comportamental" });
  }
  return out;
}

/** Reúne o que já foi salvo em 3G, 3H e 3J para a candidatura. */
export async function reunirFontes(
  admin: Admin,
  jobId: string,
  applicationId: string,
  criterios: Criterios,
): Promise<{ entrada: EntradaMatching; conteudo: ConteudoLaudo }> {
  const [{ data: tri }, { data: fichas }, { data: notas }] = await Promise.all([
    admin
      .from("job_screenings")
      .select("resultado")
      .eq("job_id", jobId)
      .eq("application_id", applicationId)
      .maybeSingle(),
    admin
      .from("interview_scorecards")
      .select("itens, pontos_fortes, pontos_atencao, status, fechada_em")
      .eq("job_id", jobId)
      .eq("application_id", applicationId)
      .eq("status", "fechada")
      .order("fechada_em", { ascending: false })
      .limit(1),
    admin
      .from("assessment_results")
      .select("competencia, nota, evidencia, updated_at")
      .eq("job_id", jobId)
      .eq("application_id", applicationId)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const ficha = fichas?.[0];
  const entrada: EntradaMatching = {
    competencias: competenciasDaVaga(criterios),
    triagem: (tri?.resultado as unknown as ResultadoTriagem | undefined) ?? null,
    ficha: ficha
      ? {
          itens: Array.isArray(ficha.itens) ? (ficha.itens as unknown as ItemFicha[]) : [],
          pontos_fortes: ficha.pontos_fortes,
          pontos_atencao: ficha.pontos_atencao,
        }
      : null,
    testes: (notas ?? []).map((n) => ({ competencia: n.competencia, nota: n.nota, evidencia: n.evidencia })),
  };
  return { entrada, conteudo: montarMatching(entrada) };
}
