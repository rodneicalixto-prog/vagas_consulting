"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { gerarTextoIA } from "@/lib/agente-servidor";
import { listaDeTexto, normalizarCriterios } from "@/lib/vaga-estruturada";
import {
  duracaoValida,
  fichaInicial,
  montarPromptRoteiro,
  montarPromptVerificacao,
  notaValida,
  pendenciasDaFicha,
  recomendacaoValida,
  roteiroDaResposta,
  verificacoesDaResposta,
  type Ficha,
  type ItemFicha,
  type Roteiro,
} from "@/lib/entrevista";
import type { ResultadoTriagem } from "@/lib/triagem";
import type { Json } from "@/lib/supabase/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ehRedirect(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export type EstadoRoteiro = { erro: string | null; ok: boolean };

export async function gerarRoteiro(_a: EstadoRoteiro, formData: FormData): Promise<EstadoRoteiro> {
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    if (!UUID.test(jobId)) return { erro: "Vaga inválida.", ok: false };
    const duracao = Number(formData.get("duracao"));
    if (!duracaoValida(duracao)) return { erro: "Duração inválida.", ok: false };
    const competencias = listaDeTexto(String(formData.get("competencias") ?? "")).slice(0, 8);
    const valores = listaDeTexto(String(formData.get("valores") ?? "")).slice(0, 6);
    if (competencias.length === 0) return { erro: "Informe pelo menos uma competência.", ok: false };

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    const { data: vaga } = await admin.from("jobs").select("id, company_id, titulo, criterios").eq("id", jobId).maybeSingle();
    if (!vaga) return { erro: "Vaga não encontrada.", ok: false };
    const c = normalizarCriterios(vaga.criterios);

    const { system, user: prompt } = montarPromptRoteiro({
      titulo: vaga.titulo,
      duracao,
      competencias,
      valores,
      rotina: c.rotina,
      senioridade: c.senioridade,
    });
    const r = await gerarTextoIA({ companyId: vaga.company_id, system, user: prompt, json: true, maxTokens: 2200 });
    if (!r.ok) return { erro: r.erro, ok: false };
    const roteiro = roteiroDaResposta(r.texto, { duracao, competencias, valores });
    if (!roteiro) return { erro: "Não consegui ler a resposta da IA. Tente de novo.", ok: false };

    const { data: ultimo } = await admin
      .from("interview_scripts")
      .select("versao")
      .eq("job_id", jobId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    const versao = (ultimo?.versao ?? 0) + 1;
    const { error } = await admin.from("interview_scripts").insert({
      job_id: jobId,
      versao,
      duracao_min: duracao,
      conteudo: roteiro as unknown as Json,
      criado_por: user.id,
    });
    if (error) return { erro: "Não foi possível salvar o roteiro.", ok: false };

    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "vaga_roteiro_gerado",
      objeto_tipo: "job",
      objeto_id: jobId,
      depois: { versao, itens: roteiro.itens.length, provedor: r.provedor, modelo: r.modelo },
    });
    revalidatePath(`/admin/vagas/${jobId}/entrevista`);
    return { erro: null, ok: true };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return { erro: "Não foi possível gerar agora. Tente de novo.", ok: false };
  }
}

export type EstadoFicha = { erro: string | null; pendencias: string[]; salvo: boolean; fechada: boolean };

async function carregarContexto(jobId: string, applicationId: string, userId: string, role: Parameters<typeof obterEscopo>[1]) {
  const escopo = await obterEscopo(userId, role);
  await exigirVaga(escopo, jobId);
  const admin = createAdminClient();
  const { data: app } = await admin
    .from("applications")
    .select("id, job_id, candidate_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.job_id !== jobId) return null;
  const { data: script } = await admin
    .from("interview_scripts")
    .select("id, conteudo")
    .eq("job_id", jobId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: ficha } = await admin
    .from("interview_scorecards")
    .select("*")
    .eq("application_id", applicationId)
    .eq("entrevistador_id", userId)
    .maybeSingle();
  return { admin, app, script, ficha };
}

export async function salvarFicha(_a: EstadoFicha, formData: FormData): Promise<EstadoFicha> {
  const falha = (erro: string, pendencias: string[] = []): EstadoFicha => ({ erro, pendencias, salvo: false, fechada: false });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const appId = String(formData.get("application_id") ?? "");
    if (!UUID.test(jobId) || !UUID.test(appId)) return falha("Dados inválidos.");

    const ctx = await carregarContexto(jobId, appId, user.id, role);
    if (!ctx) return falha("Candidatura não encontrada nesta vaga.");
    if (ctx.ficha?.status === "fechada") return falha("Esta ficha já foi fechada e não pode ser alterada.");

    // O roteiro da ficha é o que estava vigente na primeira vez.
    let roteiro: Roteiro | null = null;
    let scriptId: string | null = null;
    if (ctx.ficha?.script_id) {
      const { data: s } = await ctx.admin.from("interview_scripts").select("id, conteudo").eq("id", ctx.ficha.script_id).maybeSingle();
      if (s) {
        roteiro = s.conteudo as unknown as Roteiro;
        scriptId = s.id;
      }
    }
    if (!roteiro && ctx.script) {
      roteiro = ctx.script.conteudo as unknown as Roteiro;
      scriptId = ctx.script.id;
    }
    if (!roteiro) return falha("Gere o roteiro da vaga antes de preencher a ficha.");

    const itens: ItemFicha[] = fichaInicial(roteiro).map((base) => {
      const bruto = Number(formData.get(`nota_${base.item_id}`));
      return {
        ...base,
        nota: notaValida(bruto) ? bruto : null,
        evidencia: String(formData.get(`evid_${base.item_id}`) ?? "").trim().slice(0, 600),
        anotacoes: String(formData.get(`anot_${base.item_id}`) ?? "").trim().slice(0, 1200),
      };
    });
    const rec = String(formData.get("recomendacao") ?? "");
    const ficha: Ficha = {
      itens,
      pontos_fortes: String(formData.get("fortes") ?? "").trim().slice(0, 1500),
      pontos_atencao: String(formData.get("atencao") ?? "").trim().slice(0, 1500),
      recomendacao: recomendacaoValida(rec) ? rec : null,
      motivo: String(formData.get("motivo") ?? "").trim().slice(0, 1500),
    };

    const fechar = formData.get("fechar") === "sim";
    if (fechar) {
      const pend = pendenciasDaFicha(ficha);
      if (pend.length > 0) return falha("A ficha ainda não pode ser fechada.", pend);
    }

    const agora = new Date().toISOString();
    const { error } = await ctx.admin.from("interview_scorecards").upsert(
      {
        job_id: jobId,
        application_id: appId,
        script_id: scriptId,
        entrevistador_id: user.id,
        itens: ficha.itens as unknown as Json,
        pontos_fortes: ficha.pontos_fortes,
        pontos_atencao: ficha.pontos_atencao,
        recomendacao: ficha.recomendacao,
        motivo: ficha.motivo,
        status: fechar ? "fechada" : "rascunho",
        fechada_em: fechar ? agora : null,
        updated_at: agora,
      },
      { onConflict: "application_id,entrevistador_id" },
    );
    if (error) return falha("Não foi possível salvar a ficha.");

    if (fechar) {
      await ctx.admin.from("audit_log").insert({
        ator_id: user.id,
        acao: "entrevista_ficha_fechada",
        objeto_tipo: "application",
        objeto_id: appId,
        depois: { recomendacao: ficha.recomendacao, itens: ficha.itens.length },
      });
    }
    revalidatePath(`/admin/vagas/${jobId}/entrevista/${appId}`);
    return { erro: null, pendencias: [], salvo: true, fechada: fechar };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora. Tente de novo.");
  }
}

/** Perguntas a partir dos "pontos a validar" da triagem (3G → 3H). */
export async function gerarVerificacoes(_a: EstadoRoteiro, formData: FormData): Promise<EstadoRoteiro> {
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const appId = String(formData.get("application_id") ?? "");
    if (!UUID.test(jobId) || !UUID.test(appId)) return { erro: "Dados inválidos.", ok: false };

    const ctx = await carregarContexto(jobId, appId, user.id, role);
    if (!ctx) return { erro: "Candidatura não encontrada nesta vaga.", ok: false };
    if (ctx.ficha?.status === "fechada") return { erro: "A ficha já foi fechada.", ok: false };

    const { data: tri } = await ctx.admin
      .from("job_screenings")
      .select("resultado")
      .eq("job_id", jobId)
      .eq("application_id", appId)
      .maybeSingle();
    const pontos = ((tri?.resultado as unknown as ResultadoTriagem | undefined)?.a_validar ?? [])
      .filter((p) => !p.startsWith("Validar na entrevista:"))
      .slice(0, 8);
    if (pontos.length === 0) return { erro: "Esta candidatura não tem pontos a validar na triagem.", ok: false };

    const { data: vaga } = await ctx.admin.from("jobs").select("company_id, titulo").eq("id", jobId).maybeSingle();
    if (!vaga) return { erro: "Vaga não encontrada.", ok: false };
    const { system, user: prompt } = montarPromptVerificacao(vaga.titulo, pontos);
    const r = await gerarTextoIA({ companyId: vaga.company_id, system, user: prompt, json: true, maxTokens: 1200 });
    if (!r.ok) return { erro: r.erro, ok: false };
    const extras = verificacoesDaResposta(r.texto);
    if (extras.length === 0) return { erro: "Não consegui gerar perguntas válidas. Tente de novo.", ok: false };

    const { error } = await ctx.admin.from("interview_scorecards").upsert(
      {
        job_id: jobId,
        application_id: appId,
        script_id: ctx.ficha?.script_id ?? ctx.script?.id ?? null,
        entrevistador_id: user.id,
        perguntas_extra: extras as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "application_id,entrevistador_id" },
    );
    if (error) return { erro: "Não foi possível salvar as perguntas.", ok: false };
    revalidatePath(`/admin/vagas/${jobId}/entrevista/${appId}`);
    return { erro: null, ok: true };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return { erro: "Não foi possível gerar agora. Tente de novo.", ok: false };
  }
}
