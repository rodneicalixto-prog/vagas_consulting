"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { candidatosVisiveis, exigirEmpresa, obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import { podeEnviar } from "@/lib/conversas";
import { previa } from "@/lib/conversas";
import { configEvolutionDaEmpresa, enviarTexto } from "@/lib/evolution";
import { bloqueadoNaEmpresa } from "@/lib/blacklist-empresa";
import { normalizarTelefoneBR } from "@/lib/whatsapp";
import { STATUS_CANDIDATURA_EM_ABERTO } from "@/lib/format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NENHUM = "00000000-0000-0000-0000-000000000000";

function uuidDe(formData: FormData, campo: string): string {
  const v = String(formData.get(campo) ?? "").trim();
  if (!UUID.test(v)) throw new Error("Identificador inválido.");
  return v;
}

/** Envia uma mensagem de texto do operador pelo WhatsApp da empresa. */
export async function enviarMensagem(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const conversaId = uuidDe(formData, "conversation_id");
  const texto = String(formData.get("texto") ?? "").trim();
  if (texto.length < 1 || texto.length > 2000) {
    throw new Error("A mensagem deve ter entre 1 e 2000 caracteres.");
  }

  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);

  // A empresa vem da conversa carregada no servidor, nunca do formulário.
  const { data: conversa } = await admin
    .from("conversations")
    .select("id, company_id, telefone_normalizado, candidate_id, status")
    .eq("id", conversaId)
    .maybeSingle();
  if (!conversa) throw new Error("Conversa não encontrada.");
  exigirEmpresa(escopo, conversa.company_id);

  const companyId = conversa.company_id;
  const telefone = conversa.telefone_normalizado;
  const candidateId = conversa.candidate_id;

  const [optOut, entrada, candidatura, consentimento] = await Promise.all([
    admin
      .from("channel_opt_outs")
      .select("id")
      .eq("canal", "whatsapp")
      .eq("telefone_normalizado", telefone)
      .or(`company_id.eq.${companyId},company_id.is.null`)
      .limit(1),
    admin
      .from("conversation_messages")
      .select("id")
      .eq("conversation_id", conversa.id)
      .eq("direcao", "entrada")
      .limit(1),
    candidateId
      ? admin
          .from("applications")
          .select("id, jobs!inner(company_id)")
          .eq("candidate_id", candidateId)
          .in("status", STATUS_CANDIDATURA_EM_ABERTO)
          .eq("jobs.company_id", companyId)
          .limit(1)
      : Promise.resolve({ data: [] as { id: string }[] }),
    candidateId
      ? admin
          .from("consents")
          .select("estado")
          .eq("user_id", candidateId)
          .eq("finalidade", "alertas_vagas")
          .eq("canal", "whatsapp")
          .order("created_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as { estado: string }[] }),
  ]);

  const decisao = podeEnviar({
    descadastrado: (optOut.data ?? []).length > 0,
    jaRespondeu: (entrada.data ?? []).length > 0,
    candidaturaEmAndamento: (candidatura.data ?? []).length > 0,
    consentimento: consentimento.data?.[0]?.estado === "concedido",
  });
  if (!decisao.ok) throw new Error(decisao.motivo ?? "Envio não permitido.");

  // Black list da empresa: por cadastro ou por telefone.
  const bloqueado = await bloqueadoNaEmpresa(companyId, {
    id: candidateId ?? NENHUM,
    telefone,
  });
  if (bloqueado) throw new Error("Esta pessoa está na black list da empresa. Envio bloqueado.");

  const cfg = await configEvolutionDaEmpresa(companyId);
  if (!cfg.ok) throw new Error(cfg.motivo);

  // Registra antes de enviar: se a rede cair, o histórico não perde a tentativa.
  const { data: msg, error: erroInsert } = await admin
    .from("conversation_messages")
    .insert({
      conversation_id: conversa.id,
      direcao: "saida",
      autor: "operador",
      autor_id: user.id,
      texto,
      status: "enviada",
    })
    .select("id")
    .single();
  if (erroInsert || !msg) throw new Error("Não foi possível registrar a mensagem. Tente novamente.");

  const envio = await enviarTexto(cfg.config, telefone, texto);
  if (!envio.ok) {
    await admin.from("conversation_messages").update({ status: "falhou", erro: envio.erro }).eq("id", msg.id);
    revalidatePath("/admin/conversas");
    throw new Error(`Não foi possível enviar: ${envio.erro}`);
  }

  if (envio.idMensagem) {
    await admin.from("conversation_messages").update({ provedor_msg_id: envio.idMensagem }).eq("id", msg.id);
  }

  await admin
    .from("conversations")
    .update({ ultima_msg_em: new Date().toISOString(), ultima_msg_previa: previa(texto) })
    .eq("id", conversa.id);

  // O texto da mensagem nunca vai para a auditoria (dado pessoal).
  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "whatsapp_mensagem_enviada",
    objeto_tipo: "conversation",
    objeto_id: conversa.id,
    depois: { company_id: companyId },
  });

  revalidatePath("/admin/conversas");
}

export type EstadoEnvio = { erro: string | null; ok: boolean };

/**
 * Versão para formulário com estado: devolve o motivo do bloqueio em vez de
 * estourar a página de erro (em produção o Next esconde a mensagem do Error).
 * Redirecionamentos (sem acesso) continuam funcionando.
 */
export async function enviarMensagemComEstado(
  _anterior: EstadoEnvio,
  formData: FormData,
): Promise<EstadoEnvio> {
  try {
    await enviarMensagem(formData);
    return { erro: null, ok: true };
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    return { erro: e instanceof Error ? e.message : "Não foi possível enviar a mensagem.", ok: false };
  }
}

/** Abre (ou cria) a conversa de WhatsApp com um candidato e leva ao inbox. */
export async function abrirConversaComCandidato(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const candidatoId = uuidDe(formData, "candidate_id");
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);

  const visiveis = await candidatosVisiveis(escopo);
  if (visiveis && !visiveis.includes(candidatoId)) redirect("/admin/acesso-negado");

  const vagas = await vagasVisiveis(escopo);

  // Candidatura mais recente em vaga visível. Operador: só em andamento.
  let consulta = admin
    .from("applications")
    .select("status, jobs!inner(company_id)")
    .eq("candidate_id", candidatoId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (vagas) consulta = consulta.in("job_id", vagas);
  const { data: apps } = await consulta;

  const lista = apps ?? [];
  const emAndamento = lista.filter((a) => STATUS_CANDIDATURA_EM_ABERTO.includes(a.status));
  if (!escopo.todos && emAndamento.length === 0) {
    throw new Error("O contato só é liberado enquanto o candidato tem candidatura em andamento na sua carteira.");
  }
  const escolhida = emAndamento[0] ?? lista[0];
  const job = escolhida ? (Array.isArray(escolhida.jobs) ? escolhida.jobs[0] : escolhida.jobs) : null;
  const companyId = job?.company_id ?? null;
  if (!companyId) {
    throw new Error("Não foi possível definir a empresa: o candidato não tem candidatura em vaga visível para você.");
  }
  exigirEmpresa(escopo, companyId);

  const { data: perfil } = await admin
    .from("profiles")
    .select("nome_completo, telefone")
    .eq("id", candidatoId)
    .maybeSingle();
  if (!perfil) throw new Error("Candidato não encontrado.");

  const telefone = normalizarTelefoneBR(perfil.telefone);
  if (!telefone) throw new Error("O telefone do candidato está vazio ou não parece um número brasileiro válido.");

  const { data: conversa, error } = await admin
    .from("conversations")
    .upsert(
      {
        company_id: companyId,
        canal: "whatsapp",
        telefone_normalizado: telefone,
        candidate_id: candidatoId,
        nome_contato: perfil.nome_completo,
      },
      { onConflict: "company_id,canal,telefone_normalizado" },
    )
    .select("id")
    .single();
  if (error || !conversa) throw new Error("Não foi possível abrir a conversa. Tente novamente.");

  redirect(`/admin/conversas?c=${conversa.id}`);
}
