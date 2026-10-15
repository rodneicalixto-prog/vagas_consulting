"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirEmpresa, exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { validateFormData } from "@/lib/validation/validate-form";
import { CreateJobSchema, DecideJobSchema, type CreateJobInput, type DecideJobInput } from "@/lib/validation/schemas";
import { gerarTextoIA } from "@/lib/agente-servidor";
import {
  criteriosDaResposta,
  modoValido,
  montarPromptCriterios,
  listaDeTexto,
  normalizarCriterios,
  obrigatoriosDeTexto,
  temBloqueio,
  verificarVaga,
} from "@/lib/vaga-estruturada";

export async function criarVaga(formData: FormData) {
  const { user, role } = await requireInternalUser("jobs.manage");

  // Validar com Zod
  const validated = validateFormData<CreateJobInput>(CreateJobSchema, formData);

  // Carteira: o operador só cadastra vaga em empresa atribuída e ativa.
  const escopo = await obterEscopo(user.id, role);
  exigirEmpresa(escopo, validated.company_id);
  if (!escopo.todos) {
    const { data: empresa } = await createAdminClient()
      .from("companies")
      .select("status")
      .eq("id", validated.company_id)
      .maybeSingle();
    if (empresa?.status !== "aprovada") {
      throw new Error("A empresa precisa estar aprovada para cadastrar vagas.");
    }
  }
  // Admin, superadmin e admin da empresa marcam vaga como confidencial.
  const confidencial = role !== "operador" && formData.get("confidencial") === "on";

  const { company_id: companyId, titulo, modalidade, local, descricao, requisitos, remuneracao_texto: remuneracao } = validated;

  const admin = createAdminClient();
  const { data: job, error } = await admin
    .from("jobs")
    .insert({
      company_id: companyId,
      titulo,
      modalidade: modalidade as "efetiva" | "pj" | "temporaria",
      local: local || null,
      descricao: descricao || null,
      requisitos: requisitos || null,
      remuneracao_texto: remuneracao || null,
      status: "rascunho",
      confidencial,
      responsavel_id: user.id,
    })
    .select()
    .single();

  if (error || !job) throw new Error("Não foi possível cadastrar a vaga.");

  const { error: auditError } = await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "vaga_criada_internamente",
    objeto_tipo: "job",
    objeto_id: job.id,
    depois: job,
  });
  if (auditError) throw new Error("Vaga criada, mas a auditoria falhou.");

  revalidatePath("/admin/vagas");
  revalidatePath("/admin");
}

/**
 * Marca/desmarca vaga confidencial. Admin, superadmin e admin da empresa
 * (este só nas vagas da própria empresa, garantido por exigirVaga).
 */
export async function alternarConfidencial(formData: FormData) {
  const { user, role } = await requireInternalUser("jobs.manage");
  if (role === "operador") redirect("/admin/acesso-negado");
  const jobId = String(formData.get("job_id") ?? "");
  const valor = formData.get("valor") === "true";
  if (!/^[0-9a-f-]{36}$/.test(jobId)) throw new Error("Vaga inválida.");

  const escopo = await obterEscopo(user.id, role);
  const vaga = await exigirVaga(escopo, jobId);

  const admin = createAdminClient();
  const { data: atualizada, error } = await admin
    .from("jobs")
    .update({ confidencial: valor })
    .eq("id", jobId)
    .select("id");
  if (error || !atualizada || atualizada.length === 0) {
    throw new Error("Não foi possível alterar a confidencialidade.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: valor ? "vaga_marcada_confidencial" : "vaga_desmarcada_confidencial",
    objeto_tipo: "job",
    objeto_id: jobId,
    antes: { confidencial: vaga.confidencial },
    depois: { confidencial: valor },
  });

  revalidatePath("/admin/vagas");
}

export async function decidirVaga(formData: FormData) {
  // Validar com Zod
  const validated = validateFormData<DecideJobInput>(DecideJobSchema, formData);
  const { job_id: jobId, acao, motivo } = validated;

  // Colocar no ar, pausar e reativar mexem na publicação: só quem publica.
  const mexeNaPublicacao = acao === "publicar" || acao === "pausar" || acao === "reativar";
  const { user, role } = await requireInternalUser(mexeNaPublicacao ? "jobs.publish" : "jobs.manage");

  // Carteira: a vaga precisa estar no escopo (e visível, se confidencial).
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, jobId);

  const admin = createAdminClient();
  const { data: before } = await admin.from("jobs").select("*").eq("id", jobId).single();

  // Vaga já publicada só sai do ar por admin/superadmin (decisão do Rodnei).
  if (before?.status === "publicada" && acao !== "publicar") {
    await requireInternalUser("jobs.publish");
  }

  if (!before) throw new Error("Vaga não encontrada.");

  // Critério que discrimina bloqueia a publicação (checklist da vaga, §14.11).
  if (acao === "publicar" || acao === "reativar") {
    const bloqueios = verificarVaga({
      titulo: before.titulo,
      descricao: before.descricao,
      requisitos: before.requisitos,
      local: before.local,
      modelo_trabalho: before.modelo_trabalho,
      remuneracao_texto: before.remuneracao_texto,
      criterios: normalizarCriterios(before.criterios),
    }).filter((v) => v.nivel === "bloqueio");
    if (bloqueios.length > 0) {
      throw new Error(`Publicação bloqueada: ${bloqueios.map((b) => b.mensagem).join(" ")}`);
    }
  }
  if (acao === "pausar" && before.status !== "publicada") {
    throw new Error("Só é possível pausar uma vaga publicada.");
  }
  if (acao === "reativar" && before.status !== "pausada") {
    throw new Error("Só é possível reativar uma vaga pausada.");
  }

  const status =
    acao === "publicar" || acao === "reativar"
      ? "publicada"
      : acao === "pausar"
        ? "pausada"
        : acao === "encerrar"
          ? "encerrada"
          : "rascunho";

  const { data: after, error } = await admin
    .from("jobs")
    .update({
      status,
      motivo_decisao: motivo || null,
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
      // Reativar preserva a data original de publicação (e o tempo em aberto).
      publicada_em: acao === "publicar" ? new Date().toISOString() : undefined,
    })
    .eq("id", jobId)
    .eq("status", before.status)
    .select()
    .single();

  if (error || !after) {
    throw new Error("Não foi possível atualizar a vaga. Tente de novo.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: `vaga_${acao}`,
    objeto_tipo: "job",
    objeto_id: jobId,
    antes: before,
    depois: after,
  });

  revalidatePath("/admin/vagas");
  revalidatePath("/admin");
}

/** Salva os critérios estruturados da vaga (passo 3O). Auditado. */
export async function salvarCriterios(formData: FormData) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const jobId = String(formData.get("job_id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
    throw new Error("Vaga inválida.");
  }
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, jobId);

  const { obrigatorios, eliminatorios } = obrigatoriosDeTexto(String(formData.get("obrigatorios") ?? ""));
  const anos = String(formData.get("anos_experiencia") ?? "").trim();
  const bruto: Record<string, unknown> = {
    rotina: String(formData.get("rotina") ?? ""),
    obrigatorios,
    eliminatorios,
    desejaveis: listaDeTexto(String(formData.get("desejaveis") ?? "")),
    comportamentais: listaDeTexto(String(formData.get("comportamentais") ?? "")),
    senioridade: String(formData.get("senioridade") ?? ""),
    anos_experiencia: anos === "" ? null : Number(anos),
    diferencial: String(formData.get("diferencial") ?? ""),
    lacunas: [],
    proposta_ia: false,
    confirmado_em: new Date().toISOString(),
  };
  const criterios = normalizarCriterios(bruto);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .update({ criterios, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .select("id, titulo, descricao, requisitos, local, modelo_trabalho, remuneracao_texto");
  if (error || !data || data.length === 0) throw new Error("Não foi possível salvar os critérios.");

  const verificacoes = verificarVaga({ ...data[0], criterios });
  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "vaga_criterios_atualizados",
    objeto_tipo: "job",
    objeto_id: jobId,
    depois: {
      obrigatorios: criterios.obrigatorios.length,
      eliminatorios: criterios.eliminatorios.length,
      desejaveis: criterios.desejaveis.length,
      comportamentais: criterios.comportamentais.length,
      bloqueada: temBloqueio(verificacoes),
    },
  });

  revalidatePath(`/admin/vagas/${jobId}`);
  revalidatePath("/admin/vagas");
}

export type EstadoGeracao = { erro: string | null; ok: boolean };

/**
 * Gera uma PROPOSTA de critérios com IA a partir do recado do gestor ou de uma
 * JD. A proposta é gravada como não confirmada: só vale depois de a pessoa
 * conferir e salvar. Nada é publicado nem enviado.
 */
export async function gerarCriteriosComIA(_anterior: EstadoGeracao, formData: FormData): Promise<EstadoGeracao> {
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      return { erro: "Vaga inválida.", ok: false };
    }
    const modo = String(formData.get("modo") ?? "criar");
    if (!modoValido(modo)) return { erro: "Modo inválido.", ok: false };
    const texto = String(formData.get("texto") ?? "").trim();
    if (texto.length < 20) return { erro: "Cole o recado do gestor ou a JD (pelo menos 20 caracteres).", ok: false };
    const tamanhoTime = String(formData.get("tamanho_time") ?? "").trim().slice(0, 60);

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);

    const admin = createAdminClient();
    const { data: vaga } = await admin
      .from("jobs")
      .select("id, company_id, titulo, local, modalidade, remuneracao_texto, criterios")
      .eq("id", jobId)
      .maybeSingle();
    if (!vaga) return { erro: "Vaga não encontrada.", ok: false };

    const { system, user: prompt } = montarPromptCriterios({
      modo,
      texto,
      tamanhoTime,
      vaga: {
        titulo: vaga.titulo,
        local: vaga.local,
        modalidade: vaga.modalidade,
        remuneracao_texto: vaga.remuneracao_texto,
      },
    });
    const r = await gerarTextoIA({ companyId: vaga.company_id, system, user: prompt, json: true, maxTokens: 1200 });
    if (!r.ok) return { erro: r.erro, ok: false };

    const proposta = criteriosDaResposta(r.texto);
    if (!proposta) return { erro: "Não consegui ler a resposta da IA. Tente de novo.", ok: false };

    const { error } = await admin
      .from("jobs")
      .update({ criterios: proposta, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    if (error) return { erro: "Não foi possível salvar a proposta.", ok: false };

    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "vaga_criterios_gerados_ia",
      objeto_tipo: "job",
      objeto_id: jobId,
      depois: { modo, provedor: r.provedor, modelo: r.modelo, obrigatorios: proposta.obrigatorios.length },
    });
    revalidatePath(`/admin/vagas/${jobId}`);
    return { erro: null, ok: true };
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    return { erro: "Não foi possível gerar agora. Tente de novo.", ok: false };
  }
}
