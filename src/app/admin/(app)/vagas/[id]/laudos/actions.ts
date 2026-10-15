"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { gerarTextoIA } from "@/lib/agente-servidor";
import { normalizarCriterios } from "@/lib/vaga-estruturada";
import { reunirFontes } from "@/lib/laudo-servidor";
import {
  modoValido,
  montarPromptResumo,
  revisarResumo,
  tipoRecomendacaoValido,
  validarRecomendacao,
  type ConteudoLaudo,
  type Recomendacao,
} from "@/lib/laudo";
import type { Json } from "@/lib/supabase/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ehRedirect(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export type EstadoLaudo = { erro: string | null; ok: boolean; id: string | null; pendencias: string[] };

/** Gera uma nova versão do laudo da candidatura (sempre rascunho). */
export async function gerarLaudo(_a: EstadoLaudo, formData: FormData): Promise<EstadoLaudo> {
  const falha = (erro: string): EstadoLaudo => ({ erro, ok: false, id: null, pendencias: [] });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const appId = String(formData.get("application_id") ?? "");
    if (!UUID.test(jobId) || !UUID.test(appId)) return falha("Dados inválidos.");
    const modo = String(formData.get("modo") ?? "");
    if (!modoValido(modo)) return falha("Escolha o tipo de laudo: só fatos ou com recomendação.");

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    const { data: app } = await admin.from("applications").select("id, job_id").eq("id", appId).maybeSingle();
    if (!app || app.job_id !== jobId) return falha("Candidatura não encontrada nesta vaga.");
    const { data: vaga } = await admin.from("jobs").select("id, company_id, titulo, criterios").eq("id", jobId).maybeSingle();
    if (!vaga) return falha("Vaga não encontrada.");
    const criterios = normalizarCriterios(vaga.criterios);
    if (criterios.obrigatorios.length + criterios.comportamentais.length === 0) {
      return falha("A vaga não tem competências definidas nos critérios.");
    }

    const { conteudo } = await reunirFontes(admin, jobId, appId, criterios);

    // Resumo factual: opcional, revisado por regra; sem ele o laudo segue válido.
    const avaliadas = conteudo.linhas.filter((l) => l.estado === "avaliado");
    if (avaliadas.length > 0) {
      const { system, user: prompt } = montarPromptResumo(vaga.titulo, conteudo.linhas);
      const r = await gerarTextoIA({ companyId: vaga.company_id, system, user: prompt, maxTokens: 400 });
      if (r.ok) {
        const texto = r.texto.trim().slice(0, 900);
        const rev = revisarResumo(texto);
        if (rev.ok) conteudo.resumo = texto;
        else conteudo.limitacoes.push(`Resumo da IA descartado pela revisão (${rev.motivo}); use o quadro.`);
      }
    }

    const { data: ultimo } = await admin
      .from("candidate_reports")
      .select("versao")
      .eq("application_id", appId)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();
    const versao = (ultimo?.versao ?? 0) + 1;
    const { data: criado, error } = await admin
      .from("candidate_reports")
      .insert({
        job_id: jobId,
        application_id: appId,
        versao,
        modo,
        conteudo: conteudo as unknown as Json,
        criado_por: user.id,
      })
      .select("id")
      .single();
    if (error || !criado) return falha("Não foi possível salvar o laudo.");

    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "laudo_gerado",
      objeto_tipo: "application",
      objeto_id: appId,
      depois: { versao, modo },
    });
    revalidatePath(`/admin/vagas/${jobId}/laudos`);
    return { erro: null, ok: true, id: criado.id, pendencias: [] };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível gerar agora. Tente de novo.");
  }
}

async function carregarLaudo(jobId: string, laudoId: string, userId: string, role: Parameters<typeof obterEscopo>[1]) {
  if (!UUID.test(jobId) || !UUID.test(laudoId)) return null;
  const escopo = await obterEscopo(userId, role);
  await exigirVaga(escopo, jobId);
  const admin = createAdminClient();
  const { data } = await admin
    .from("candidate_reports")
    .select("id, job_id, application_id, modo, conteudo, status, criado_por")
    .eq("id", laudoId)
    .eq("job_id", jobId)
    .maybeSingle();
  if (!data) return null;
  // Só quem criou e a gestão acessam o laudo.
  const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";
  if (!gestao && data.criado_por !== userId) return null;
  return { admin, laudo: data };
}

export type EstadoSalvar = { erro: string | null; ok: boolean; pendencias: string[]; assinado: boolean };

/** Salva a recomendação (modo B) e, se pedido, assina: assinado é imutável. */
export async function salvarLaudo(_a: EstadoSalvar, formData: FormData): Promise<EstadoSalvar> {
  const falha = (erro: string, pendencias: string[] = []): EstadoSalvar => ({ erro, ok: false, pendencias, assinado: false });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const ctx = await carregarLaudo(jobId, String(formData.get("laudo_id") ?? ""), user.id, role);
    if (!ctx) return falha("Laudo não encontrado.");
    if (ctx.laudo.status === "assinado") return falha("Laudo assinado não muda: gere uma nova versão.");

    const conteudo = ctx.laudo.conteudo as unknown as ConteudoLaudo;
    let recomendacao: Recomendacao | null = null;

    if (ctx.laudo.modo === "recomendacao") {
      const tipo = String(formData.get("tipo") ?? "");
      const linhasCitadas = formData.getAll("linhas").map(String).filter(Boolean);
      const rec: Recomendacao = {
        tipo: tipoRecomendacaoValido(tipo) ? tipo : "contratar",
        porque: String(formData.get("porque") ?? "").trim().slice(0, 1500),
        condicoes: String(formData.get("condicoes") ?? "").trim().slice(0, 800),
        linhas: linhasCitadas,
      };
      if (!tipoRecomendacaoValido(tipo)) return falha("Escolha a recomendação.");
      const pend = validarRecomendacao(rec, conteudo.linhas);
      const assinar = formData.get("assinar") === "sim";
      if (pend.length > 0 && assinar) return falha("A recomendação ainda não pode ser assinada.", pend);
      recomendacao = rec;
    }

    const assinar = formData.get("assinar") === "sim";
    const agora = new Date().toISOString();
    const { error } = await ctx.admin
      .from("candidate_reports")
      .update({
        recomendacao: recomendacao as unknown as Json,
        status: assinar ? "assinado" : "rascunho",
        assinado_por: assinar ? user.id : null,
        assinado_em: assinar ? agora : null,
      })
      .eq("id", ctx.laudo.id)
      .eq("status", "rascunho");
    if (error) return falha("Não foi possível salvar o laudo.");

    if (assinar) {
      await ctx.admin.from("audit_log").insert({
        ator_id: user.id,
        acao: "laudo_assinado",
        objeto_tipo: "application",
        objeto_id: ctx.laudo.application_id,
        depois: { laudo_id: ctx.laudo.id, modo: ctx.laudo.modo, recomendacao: recomendacao?.tipo ?? null },
      });
    }
    revalidatePath(`/admin/vagas/${jobId}/laudos/${ctx.laudo.id}`);
    return { erro: null, ok: true, pendencias: [], assinado: assinar };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora.");
  }
}
