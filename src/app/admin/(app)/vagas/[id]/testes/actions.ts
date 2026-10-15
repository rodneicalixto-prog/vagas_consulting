"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { gerarTextoIA } from "@/lib/agente-servidor";
import { normalizarCriterios, ROTULO_SENIORIDADE } from "@/lib/vaga-estruturada";
import {
  bloqueiosDeLiberacao,
  instrumentoDaResposta,
  montarPromptAvaliacao,
  notaValida,
  validarEntrada,
  type Instrumento,
} from "@/lib/avaliacao";
import type { Json } from "@/lib/supabase/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ehRedirect(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export type EstadoTeste = { erro: string | null; ok: boolean; id: string | null };

export async function gerarInstrumento(_a: EstadoTeste, formData: FormData): Promise<EstadoTeste> {
  const falha = (erro: string): EstadoTeste => ({ erro, ok: false, id: null });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    if (!UUID.test(jobId)) return falha("Vaga inválida.");
    const competencia = String(formData.get("competencia") ?? "").slice(0, 160);
    const v = validarEntrada({
      tipo: String(formData.get("tipo") ?? ""),
      competencia,
      tempo: Number(formData.get("tempo")),
    });
    if (!v.ok) return falha(v.erro);
    const candidatos = Math.min(20, Math.max(1, Number(formData.get("candidatos")) || 1));

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    const { data: vaga } = await admin.from("jobs").select("id, company_id, titulo, criterios").eq("id", jobId).maybeSingle();
    if (!vaga) return falha("Vaga não encontrada.");
    const c = normalizarCriterios(vaga.criterios);

    const { system, user: prompt } = montarPromptAvaliacao({
      tipo: v.tipo,
      competencia: competencia.trim(),
      tempo_min: v.tempo,
      titulo_vaga: vaga.titulo,
      rotina: c.rotina,
      senioridade: c.senioridade ? ROTULO_SENIORIDADE[c.senioridade] : "",
      candidatos,
    });
    const r = await gerarTextoIA({ companyId: vaga.company_id, system, user: prompt, json: true, maxTokens: 2800 });
    if (!r.ok) return falha(r.erro);
    const instr = instrumentoDaResposta(r.texto, { tipo: v.tipo, competencia: competencia.trim(), tempo_min: v.tempo });
    if (!instr) return falha("Não consegui montar um instrumento válido com a resposta da IA. Tente de novo.");

    const { data: criado, error } = await admin
      .from("assessments")
      .insert({
        job_id: jobId,
        tipo: v.tipo,
        competencia: competencia.trim(),
        titulo: instr.titulo,
        conteudo: instr as unknown as Json,
        criado_por: user.id,
      })
      .select("id")
      .single();
    if (error || !criado) return falha("Não foi possível salvar o instrumento.");

    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "vaga_avaliacao_gerada",
      objeto_tipo: "job",
      objeto_id: jobId,
      depois: { tipo: v.tipo, provedor: r.provedor, modelo: r.modelo },
    });
    revalidatePath(`/admin/vagas/${jobId}/testes`);
    return { erro: null, ok: true, id: criado.id };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível gerar agora. Tente de novo.");
  }
}

export type EstadoAcao = { erro: string | null; ok: boolean; bloqueios: string[] };

async function instrumentoDoEscopo(jobId: string, assessmentId: string, userId: string, role: Parameters<typeof obterEscopo>[1]) {
  if (!UUID.test(jobId) || !UUID.test(assessmentId)) return null;
  const escopo = await obterEscopo(userId, role);
  await exigirVaga(escopo, jobId);
  const admin = createAdminClient();
  const { data } = await admin
    .from("assessments")
    .select("id, job_id, status, conteudo")
    .eq("id", assessmentId)
    .eq("job_id", jobId)
    .maybeSingle();
  return data ? { admin, a: data } : null;
}

export async function aprovarInstrumento(_a: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const falha = (erro: string, bloqueios: string[] = []): EstadoAcao => ({ erro, ok: false, bloqueios });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const ctx = await instrumentoDoEscopo(jobId, String(formData.get("assessment_id") ?? ""), user.id, role);
    if (!ctx) return falha("Instrumento não encontrado.");
    if (ctx.a.status === "aprovado") return falha("Este instrumento já foi aprovado.");
    const bloqueios = bloqueiosDeLiberacao(ctx.a.conteudo as unknown as Instrumento);
    if (bloqueios.length > 0) return falha("O instrumento ainda não pode ser liberado.", bloqueios);

    await ctx.admin
      .from("assessments")
      .update({ status: "aprovado", aprovado_por: user.id, aprovado_em: new Date().toISOString() })
      .eq("id", ctx.a.id);
    await ctx.admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "vaga_avaliacao_aprovada",
      objeto_tipo: "assessment",
      objeto_id: ctx.a.id,
      depois: { job_id: jobId },
    });
    revalidatePath(`/admin/vagas/${jobId}/testes/${ctx.a.id}`);
    return { erro: null, ok: true, bloqueios: [] };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível aprovar agora.");
  }
}

/** Nota 1 a 4 por candidatura, na competência do instrumento aprovado. */
export async function registrarNota(_a: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const falha = (erro: string): EstadoAcao => ({ erro, ok: false, bloqueios: [] });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const ctx = await instrumentoDoEscopo(jobId, String(formData.get("assessment_id") ?? ""), user.id, role);
    if (!ctx) return falha("Instrumento não encontrado.");
    if (ctx.a.status !== "aprovado") return falha("Aprove o instrumento antes de registrar notas.");
    const appId = String(formData.get("application_id") ?? "");
    if (!UUID.test(appId)) return falha("Escolha o candidato.");
    const nota = Number(formData.get("nota"));
    if (!notaValida(nota)) return falha("Escolha a nota de 1 a 4.");
    const evidencia = String(formData.get("evidencia") ?? "").trim().slice(0, 600);
    if ((nota === 1 || nota === 4) && evidencia.length < 5) return falha("As notas 1 e 4 exigem a evidência observada.");

    const { data: app } = await ctx.admin.from("applications").select("id, job_id").eq("id", appId).maybeSingle();
    if (!app || app.job_id !== jobId) return falha("Candidatura não pertence a esta vaga.");

    const instr = ctx.a.conteudo as unknown as Instrumento;
    const { error } = await ctx.admin.from("assessment_results").upsert(
      {
        assessment_id: ctx.a.id,
        job_id: jobId,
        application_id: appId,
        avaliador_id: user.id,
        competencia: instr.competencia,
        nota,
        evidencia,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "assessment_id,application_id,avaliador_id" },
    );
    if (error) return falha("Não foi possível salvar a nota.");
    revalidatePath(`/admin/vagas/${jobId}/testes/${ctx.a.id}`);
    return { erro: null, ok: true, bloqueios: [] };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora.");
  }
}
