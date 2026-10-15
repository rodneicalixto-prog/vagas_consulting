"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { gerarTextoIA } from "@/lib/agente-servidor";
import { normalizarCriterios } from "@/lib/vaga-estruturada";
import {
  LIMITE_POR_RODADA,
  bloqueiosDaTriagem,
  experienciasDe,
  hashCriterios,
  montarCurriculoCego,
  montarPromptTriagem,
  resultadoDaResposta,
  resultadoSemDados,
  sinaisDeHistorico,
  type ResultadoTriagem,
} from "@/lib/triagem";
import type { Json } from "@/lib/supabase/types";

export type EstadoTriagem = { erro: string | null; avaliados: number; falhas: number; restantes: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENCERRADAS = ["rejeitada", "desistente", "expirada"];

/**
 * Triagem de uma rodada de candidaturas contra os critérios da vaga.
 * Só avalia e registra: mudar a etapa do candidato é decisão humana.
 */
export async function rodarTriagem(_anterior: EstadoTriagem, formData: FormData): Promise<EstadoTriagem> {
  const falha = (erro: string): EstadoTriagem => ({ erro, avaliados: 0, falhas: 0, restantes: 0 });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    if (!UUID.test(jobId)) return falha("Vaga inválida.");
    const refazer = formData.get("refazer") === "sim";

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);

    const admin = createAdminClient();
    const { data: vaga } = await admin.from("jobs").select("id, company_id, criterios").eq("id", jobId).maybeSingle();
    if (!vaga) return falha("Vaga não encontrada.");

    const criterios = normalizarCriterios(vaga.criterios);
    const bloqueios = bloqueiosDaTriagem(criterios);
    if (bloqueios.length > 0) return falha(bloqueios.join(" "));
    const hash = hashCriterios(criterios);

    const { data: apps } = await admin
      .from("applications")
      .select("id, candidate_id, status")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true })
      .limit(500);
    const candidaturas = (apps ?? []).filter((a) => !ENCERRADAS.includes(a.status));
    if (candidaturas.length === 0) return falha("Esta vaga ainda não tem candidaturas para triar.");

    const { data: feitas } = await admin
      .from("job_screenings")
      .select("application_id, criterios_hash")
      .eq("job_id", jobId);
    const jaOk = new Set(
      (feitas ?? []).filter((f) => !refazer && f.criterios_hash === hash).map((f) => f.application_id),
    );
    const pendentes = candidaturas.filter((a) => !jaOk.has(a.id));
    const rodada = pendentes.slice(0, LIMITE_POR_RODADA);
    if (rodada.length === 0) return { erro: null, avaliados: 0, falhas: 0, restantes: 0 };

    const { data: perfis } = await admin
      .from("profiles")
      .select("id, titulo_profissional, resumo, experiencias_profissionais, nunca_trabalhou, blacklisted")
      .in("id", rodada.map((a) => a.candidate_id));
    const porId = new Map((perfis ?? []).map((p) => [p.id, p]));

    let avaliados = 0;
    let falhas = 0;
    let parou = "";

    const avaliarUma = async (a: (typeof rodada)[number]): Promise<void> => {
      const p = porId.get(a.candidate_id);
      if (!p || p.blacklisted) return;
      const cego = montarCurriculoCego(p);
      let resultado: ResultadoTriagem;
      if (cego.vazio) {
        resultado = resultadoSemDados(criterios);
      } else {
        const sinais = sinaisDeHistorico(experienciasDe(p.experiencias_profissionais));
        const { system, user: prompt } = montarPromptTriagem(criterios, cego.texto, sinais.anos);
        const r = await gerarTextoIA({ companyId: vaga.company_id, system, user: prompt, json: true, maxTokens: 900 });
        if (!r.ok) {
          if (/teto|chave/i.test(r.erro)) parou = r.erro;
          falhas += 1;
          return;
        }
        const lido = resultadoDaResposta(r.texto, criterios, cego.texto, sinais.anos, sinais.avisos);
        if (!lido) {
          falhas += 1;
          return;
        }
        resultado = lido;
      }
      const { error } = await admin.from("job_screenings").upsert(
        {
          job_id: jobId,
          application_id: a.id,
          candidate_id: a.candidate_id,
          criterios_hash: hash,
          resultado: resultado as unknown as Json,
          pontuacao: resultado.pontuacao,
          eliminado: resultado.eliminado,
          criado_por: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "job_id,application_id" },
      );
      if (error) falhas += 1;
      else avaliados += 1;
    };

    // Em blocos de 5 para caber no tempo e respeitar o teto entre os blocos.
    for (let i = 0; i < rodada.length && !parou; i += 5) {
      await Promise.all(rodada.slice(i, i + 5).map(avaliarUma));
    }

    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "vaga_triagem_rodada",
      objeto_tipo: "job",
      objeto_id: jobId,
      depois: { avaliados, falhas, refazer },
    });
    revalidatePath(`/admin/vagas/${jobId}/triagem`);
    return {
      erro: parou || null,
      avaliados,
      falhas,
      restantes: Math.max(0, pendentes.length - avaliados),
    };
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    return falha("Não foi possível rodar a triagem agora. Tente de novo.");
  }
}
