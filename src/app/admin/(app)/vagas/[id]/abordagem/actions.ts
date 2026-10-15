"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { gerarTextoIA } from "@/lib/agente-servidor";
import {
  abordagemDaResposta,
  canalValido,
  chaveDoContato,
  datasFollowup,
  filtrarPerfil,
  montarPromptAbordagem,
  temBloqueio,
  verificarAbordagem,
  MAX_FOLLOWUPS,
} from "@/lib/abordagem";
import type { Json } from "@/lib/supabase/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ehRedirect(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export type EstadoGerar = { erro: string | null; ok: boolean; id: string | null; removidos: number };

/**
 * Gera o rascunho a partir do perfil colado. O perfil NÃO é gravado: só o
 * texto, os follow-ups e um trecho curto que sustenta o ângulo.
 */
export async function gerarAbordagem(_a: EstadoGerar, formData: FormData): Promise<EstadoGerar> {
  const falha = (erro: string): EstadoGerar => ({ erro, ok: false, id: null, removidos: 0 });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    if (!UUID.test(jobId)) return falha("Vaga inválida.");
    const nome = String(formData.get("nome") ?? "").trim().slice(0, 80);
    if (nome.length < 2) return falha("Informe o nome da pessoa.");
    const canal = String(formData.get("canal") ?? "");
    if (!canalValido(canal)) return falha("Escolha o canal.");
    const tom = String(formData.get("tom") ?? "formal") === "descontraido" ? "descontraido" : "formal";
    const perfilBruto = String(formData.get("perfil") ?? "");
    if (perfilBruto.trim().length < 80) return falha("Cole o perfil profissional (pelo menos algumas linhas).");
    const filtrado = filtrarPerfil(perfilBruto);
    if (filtrado.limpo.length < 60) return falha("Depois de remover dado pessoal, sobrou pouco do perfil.");

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    const chave = chaveDoContato(nome);
    const { data: existente } = await admin
      .from("outreach_drafts")
      .select("id, estado")
      .eq("job_id", jobId)
      .eq("contato_chave", chave)
      .maybeSingle();
    if (existente) {
      return falha(
        existente.estado === "encerrada" || existente.estado === "nao_contactar"
          ? "Este contato já foi encerrado para esta vaga: a plataforma não sugere novo contato."
          : "Já existe uma abordagem em andamento para este contato nesta vaga.",
      );
    }

    const { data: vaga } = await admin
      .from("jobs")
      .select("id, company_id, titulo, local, modelo_trabalho, remuneracao_texto, confidencial, companies(nome_fantasia, razao_social)")
      .eq("id", jobId)
      .maybeSingle();
    if (!vaga) return falha("Vaga não encontrada.");
    const emp = Array.isArray(vaga.companies) ? vaga.companies[0] : vaga.companies;
    const mostrarFaixa = formData.get("mostrar_faixa") === "sim" && !!vaga.remuneracao_texto;
    const recrutador = String(formData.get("recrutador") ?? "").trim().slice(0, 80);
    const perfilTecnico = String(formData.get("publico") ?? "menos") === "tecnico";

    const { system, user: prompt } = montarPromptAbordagem({
      nome,
      perfil: filtrado.limpo,
      canal,
      tom,
      recrutador,
      perfilTecnico,
      vaga: {
        titulo: vaga.titulo,
        modelo: String(vaga.modelo_trabalho ?? ""),
        local: vaga.local ?? "",
        faixa: mostrarFaixa ? vaga.remuneracao_texto : null,
        empresa: vaga.confidencial ? null : emp?.nome_fantasia || emp?.razao_social || null,
      },
    });
    const r = await gerarTextoIA({ companyId: vaga.company_id, system, user: prompt, json: true, maxTokens: 1500 });
    if (!r.ok) return falha(r.erro);
    const a = abordagemDaResposta(r.texto);
    if (!a) return falha("Não consegui ler a resposta da IA. Tente de novo.");

    const verificacoes = verificarAbordagem(a, {
      canal,
      perfilLimpo: filtrado.limpo,
      nome,
      cargo: vaga.titulo,
      modelo: String(vaga.modelo_trabalho ?? ""),
      temFaixa: mostrarFaixa,
      perfilTecnico,
    });
    const { data: criado, error } = await admin
      .from("outreach_drafts")
      .insert({
        job_id: jobId,
        criado_por: user.id,
        contato: nome,
        contato_chave: chave,
        canal,
        tom,
        angulo: a.angulo,
        trecho_perfil: a.trecho_perfil,
        assuntos: a.assuntos as unknown as Json,
        texto: a.texto,
        followups: a.followups as unknown as Json,
        verificacoes: verificacoes as unknown as Json,
      })
      .select("id")
      .single();
    if (error || !criado) return falha("Não foi possível salvar o rascunho.");

    // O perfil colado não é persistido: a verificação foi feita agora e fica
    // guardada com o rascunho.
    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "abordagem_rascunho_gerada",
      objeto_tipo: "job",
      objeto_id: jobId,
      depois: { canal, provedor: r.provedor, modelo: r.modelo },
    });
    revalidatePath(`/admin/vagas/${jobId}/abordagem`);
    return { erro: null, ok: true, id: criado.id, removidos: filtrado.removidos };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível gerar agora. Tente de novo.");
  }
}

export type EstadoMover = { erro: string | null; ok: boolean };

type Acao = "enviada" | "followup_feito" | "respondeu" | "nao_contactar" | "encerrar";

/** Atualiza o andamento. Encerrar ou "não contactar" apaga o conteúdo. */
export async function atualizarAbordagem(_a: EstadoMover, formData: FormData): Promise<EstadoMover> {
  const falha = (erro: string): EstadoMover => ({ erro, ok: false });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const id = String(formData.get("draft_id") ?? "");
    const acao = String(formData.get("acao") ?? "") as Acao;
    if (!UUID.test(jobId) || !UUID.test(id)) return falha("Dados inválidos.");
    if (!["enviada", "followup_feito", "respondeu", "nao_contactar", "encerrar"].includes(acao)) return falha("Ação inválida.");

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    const { data: d } = await admin
      .from("outreach_drafts")
      .select("id, job_id, criado_por, estado, followups_feitos, verificacoes")
      .eq("id", id)
      .eq("job_id", jobId)
      .maybeSingle();
    if (!d) return falha("Abordagem não encontrada.");
    const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";
    if (!gestao && d.criado_por !== user.id) return falha("Sem acesso a esta abordagem.");
    if (d.estado === "encerrada" || d.estado === "nao_contactar") return falha("Esta abordagem já foi encerrada.");

    const agora = new Date();
    const limpar = { texto: "", trecho_perfil: "", angulo: "", assuntos: [] as unknown as Json, followups: [] as unknown as Json };
    let patch: Record<string, unknown>;

    if (acao === "enviada") {
      if (d.estado !== "rascunho") return falha("O envio já foi registrado.");
      const vs = Array.isArray(d.verificacoes) ? (d.verificacoes as unknown as { nivel: string }[]) : [];
      if (temBloqueio(vs as Parameters<typeof temBloqueio>[0])) {
        return falha("O texto tem bloqueio na verificação: gere outro rascunho antes de enviar.");
      }
      const datas = datasFollowup(agora);
      patch = { estado: "enviada", enviada_em: agora.toISOString(), proximo_followup_em: datas[0].toISOString() };
    } else if (acao === "followup_feito") {
      if (d.estado !== "enviada") return falha("Registre primeiro o envio.");
      const feitos = d.followups_feitos + 1;
      if (feitos > MAX_FOLLOWUPS) return falha("O limite é de 2 follow-ups por abordagem.");
      if (feitos === MAX_FOLLOWUPS) {
        // Último follow-up feito: sem resposta, o contato fecha e o conteúdo some.
        patch = { followups_feitos: feitos, estado: "encerrada", encerrada_em: agora.toISOString(), proximo_followup_em: null, ...limpar };
      } else {
        const datas = datasFollowup(agora);
        patch = { followups_feitos: feitos, proximo_followup_em: new Date(agora.getTime() + (datas[1].getTime() - datas[0].getTime())).toISOString() };
      }
    } else if (acao === "respondeu") {
      patch = { estado: "respondeu", proximo_followup_em: null };
    } else if (acao === "nao_contactar") {
      patch = { estado: "nao_contactar", encerrada_em: agora.toISOString(), proximo_followup_em: null, ...limpar };
    } else {
      patch = { estado: "encerrada", encerrada_em: agora.toISOString(), proximo_followup_em: null, ...limpar };
    }

    const { error } = await admin
      .from("outreach_drafts")
      .update({ ...patch, updated_at: agora.toISOString() })
      .eq("id", d.id);
    if (error) return falha("Não foi possível atualizar.");
    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: `abordagem_${acao}`,
      objeto_tipo: "job",
      objeto_id: jobId,
      depois: { draft_id: d.id },
    });
    revalidatePath(`/admin/vagas/${jobId}/abordagem`);
    return { erro: null, ok: true };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível atualizar agora.");
  }
}
