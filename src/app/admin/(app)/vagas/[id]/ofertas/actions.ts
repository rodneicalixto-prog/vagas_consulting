"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { dadosDeFormulario, montarCarta, temBloqueioOferta, verificarOferta, type DadosOferta } from "@/lib/oferta";
import type { Json } from "@/lib/supabase/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ETAPAS_ANTERIORES = ["recebida", "triagem", "entrevista", "teste"];

function ehRedirect(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function campos(formData: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") o[k] = v;
  return o;
}

export type EstadoOferta = { erro: string | null; ok: boolean };

/** Cria a carta (nova versão) ou atualiza o rascunho. A carta é montada no código. */
export async function salvarOferta(_a: EstadoOferta, formData: FormData): Promise<EstadoOferta> {
  const falha = (erro: string): EstadoOferta => ({ erro, ok: false });
  let destino = "";
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const appId = String(formData.get("application_id") ?? "");
    const ofertaId = String(formData.get("offer_id") ?? "");
    if (!UUID.test(jobId) || !UUID.test(appId)) return falha("Dados inválidos.");

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    const { data: app } = await admin.from("applications").select("id, job_id").eq("id", appId).maybeSingle();
    if (!app || app.job_id !== jobId) return falha("Candidatura não encontrada nesta vaga.");

    const dados = dadosDeFormulario(campos(formData));
    const texto = montarCarta(dados);
    const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";
    const agora = new Date().toISOString();

    if (UUID.test(ofertaId)) {
      const { data: atual } = await admin
        .from("offer_letters")
        .select("id, job_id, application_id, status, criado_por")
        .eq("id", ofertaId)
        .maybeSingle();
      if (!atual || atual.job_id !== jobId || atual.application_id !== appId) return falha("Carta não encontrada.");
      if (!gestao && atual.criado_por !== user.id) return falha("Sem acesso a esta carta.");
      if (atual.status !== "rascunho") return falha("Carta enviada não muda: gere uma nova versão.");
      const { error } = await admin
        .from("offer_letters")
        .update({ dados: dados as unknown as Json, texto, validade: dados.validade || null, updated_at: agora })
        .eq("id", atual.id)
        .eq("status", "rascunho");
      if (error) return falha("Não foi possível salvar a carta.");
      destino = `/admin/vagas/${jobId}/ofertas/${atual.id}`;
    } else {
      const { data: ultimo } = await admin
        .from("offer_letters")
        .select("versao")
        .eq("application_id", appId)
        .order("versao", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: criada, error } = await admin
        .from("offer_letters")
        .insert({
          job_id: jobId,
          application_id: appId,
          versao: (ultimo?.versao ?? 0) + 1,
          dados: dados as unknown as Json,
          texto,
          validade: dados.validade || null,
          criado_por: user.id,
        })
        .select("id")
        .single();
      if (error || !criada) return falha("Não foi possível criar a carta.");
      await admin.from("audit_log").insert({
        ator_id: user.id,
        acao: "oferta_rascunho_criada",
        objeto_tipo: "application",
        objeto_id: appId,
        depois: { versao: (ultimo?.versao ?? 0) + 1 },
      });
      destino = `/admin/vagas/${jobId}/ofertas/${criada.id}`;
    }
    revalidatePath(`/admin/vagas/${jobId}/ofertas`);
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora. Tente de novo.");
  }
  redirect(destino);
}

/** Registra o envio e a resposta. A plataforma não envia a carta. */
export async function atualizarOferta(_a: EstadoOferta, formData: FormData): Promise<EstadoOferta> {
  const falha = (erro: string): EstadoOferta => ({ erro, ok: false });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const ofertaId = String(formData.get("offer_id") ?? "");
    const acao = String(formData.get("acao") ?? "");
    if (!UUID.test(jobId) || !UUID.test(ofertaId)) return falha("Dados inválidos.");
    if (!["enviada", "aceita", "recusada"].includes(acao)) return falha("Ação inválida.");

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    const { data: o } = await admin
      .from("offer_letters")
      .select("id, job_id, application_id, status, dados, texto, criado_por")
      .eq("id", ofertaId)
      .eq("job_id", jobId)
      .maybeSingle();
    if (!o) return falha("Carta não encontrada.");
    const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";
    if (!gestao && o.criado_por !== user.id) return falha("Sem acesso a esta carta.");

    const agora = new Date().toISOString();
    if (acao === "enviada") {
      if (o.status !== "rascunho") return falha("O envio já foi registrado.");
      const dados = o.dados as unknown as DadosOferta;
      const vs = verificarOferta(dados, o.texto);
      if (temBloqueioOferta(vs)) {
        return falha(
          `A carta ainda não pode ser enviada: ${vs.filter((v) => v.nivel === "bloqueio").map((v) => v.mensagem).join(" ")}`,
        );
      }
      const { error } = await admin
        .from("offer_letters")
        .update({ status: "enviada", enviada_por: user.id, enviada_em: agora, updated_at: agora })
        .eq("id", o.id)
        .eq("status", "rascunho");
      if (error) return falha("Não foi possível registrar o envio.");
      // Registro no funil: proposta enviada (só se estiver em etapa anterior).
      await admin
        .from("applications")
        .update({ status: "proposta", updated_at: agora })
        .eq("id", o.application_id)
        .in("status", ETAPAS_ANTERIORES as never[]);
    } else {
      if (o.status !== "enviada") return falha("Registre primeiro o envio da carta.");
      const { error } = await admin
        .from("offer_letters")
        .update({ status: acao, resposta_em: agora, updated_at: agora })
        .eq("id", o.id)
        .eq("status", "enviada");
      if (error) return falha("Não foi possível registrar a resposta.");
    }
    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: `oferta_${acao}`,
      objeto_tipo: "application",
      objeto_id: o.application_id,
      depois: { offer_id: o.id },
    });
    revalidatePath(`/admin/vagas/${jobId}/ofertas/${o.id}`);
    revalidatePath(`/admin/vagas/${jobId}/ofertas`);
    return { erro: null, ok: true };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível atualizar agora.");
  }
}
