"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirEmpresa, exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { validateFormData } from "@/lib/validation/validate-form";
import { CreateJobSchema, DecideJobSchema, type CreateJobInput, type DecideJobInput } from "@/lib/validation/schemas";
import { gerarTextoIA, transcreverAudio } from "@/lib/agente-servidor";
import { headers } from "next/headers";
import {
  CANAIS,
  canalValido,
  divulgacaoDaResposta,
  montarPromptDivulgacao,
  tomEmpresaValido,
  verificarDivulgacao,
  type CanalId,
} from "@/lib/divulgacao";
import type { Verificacao } from "@/lib/vaga-estruturada";
import { normalizarRegras, regrasDoFormulario, verificarRegras } from "@/lib/regras-vaga";
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
  revalidatePath(`/admin/vagas/${jobId}/criterios`);
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
    revalidatePath(`/admin/vagas/${jobId}/criterios`);
    return { erro: null, ok: true };
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    return { erro: "Não foi possível gerar agora. Tente de novo.", ok: false };
  }
}

export type ResultadoCanal = {
  canal: string;
  rotulo: string;
  titulo: string;
  ganchos: string[];
  texto: string;
  briefing_arte: string;
  copia: string;
  verificacoes: Verificacao[];
};
export type EstadoDivulgacao = {
  erro: string | null;
  resultados: ResultadoCanal[];
  suposicoes: string[];
  link: string;
};

/**
 * Gera o texto de divulgação por canal a partir dos critérios da vaga.
 * Só redige: publicar e enviar são ações manuais fora da plataforma.
 */
export async function gerarDivulgacao(_anterior: EstadoDivulgacao, formData: FormData): Promise<EstadoDivulgacao> {
  const falha = (erro: string): EstadoDivulgacao => ({ erro, resultados: [], suposicoes: [], link: "" });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) return falha("Vaga inválida.");

    const canais = [...new Set(formData.getAll("canais").map(String))].filter(canalValido) as CanalId[];
    if (canais.length === 0) return falha("Escolha pelo menos um canal.");
    const tomBruto = String(formData.get("tom") ?? "tradicional");
    if (!tomEmpresaValido(tomBruto)) return falha("Tom inválido.");
    const perfilTecnico = String(formData.get("perfil") ?? "menos") === "tecnico";

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);

    const admin = createAdminClient();
    const { data: vaga } = await admin
      .from("jobs")
      .select(
        "id, company_id, titulo, status, local, modelo_trabalho, modalidade, remuneracao_texto, descricao, confidencial, criterios, companies(nome_fantasia, razao_social)",
      )
      .eq("id", jobId)
      .maybeSingle();
    if (!vaga) return falha("Vaga não encontrada.");

    const criterios = normalizarCriterios(vaga.criterios);
    const emp = Array.isArray(vaga.companies) ? vaga.companies[0] : vaga.companies;
    const mostrarFaixa = formData.get("mostrar_faixa") === "sim" && !!vaga.remuneracao_texto;

    const cab = await headers();
    const host = cab.get("x-forwarded-host") ?? cab.get("host");
    const base = host ? `${host.startsWith("localhost") ? "http" : "https"}://${host}` : "";
    const linkBase = `${base}/vagas/${vaga.id}`;

    // Um link por canal, com marcador de origem (alimenta a métrica de fontes, 3M).
    const comOrigem = (canal: string) => `${linkBase}?o=${canal}`;

    const { system, user: prompt } = montarPromptDivulgacao({
      canais,
      perfilTecnico,
      tom: tomBruto,
      mostrarFaixa,
      link: linkBase,
      confidencial: vaga.confidencial,
      empresa: emp?.nome_fantasia || emp?.razao_social || "a empresa",
      vaga: {
        titulo: vaga.titulo,
        local: vaga.local,
        modelo_trabalho: vaga.modelo_trabalho as string | null,
        modalidade: vaga.modalidade as string | null,
        remuneracao_texto: vaga.remuneracao_texto,
        descricao: vaga.descricao,
      },
      criterios: {
        rotina: criterios.rotina,
        obrigatorios: criterios.obrigatorios,
        desejaveis: criterios.desejaveis,
        diferencial: criterios.diferencial,
      },
    });

    const r = await gerarTextoIA({ companyId: vaga.company_id, system, user: prompt, json: true, maxTokens: 2200 });
    if (!r.ok) return falha(r.erro);

    const lido = divulgacaoDaResposta(r.texto, canais);
    if (!lido) return falha("Não consegui ler a resposta da IA. Tente de novo.");

    const resultados: ResultadoCanal[] = lido.textos.map((t) => {
      const rotulo = CANAIS.find((c) => c.id === t.canal)?.rotulo ?? t.canal;
      // Troca o link-base pelo link com o marcador do canal.
      const texto = t.texto.split(linkBase).join(comOrigem(t.canal));
      const final = { ...t, texto };
      const copia = [t.titulo ? `${t.titulo}\n` : "", texto, t.briefing_arte ? `\n\nBriefing da arte: ${t.briefing_arte}` : ""]
        .join("")
        .trim();
      return {
        canal: t.canal,
        rotulo,
        titulo: t.titulo,
        ganchos: t.ganchos,
        texto,
        briefing_arte: t.briefing_arte,
        copia,
        verificacoes: verificarDivulgacao(final, {
          perfilTecnico,
          temFaixa: !!vaga.remuneracao_texto,
          mostrarFaixa,
          vagaPublicada: vaga.status === "publicada",
          link: comOrigem(t.canal),
        }),
      };
    });

    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "vaga_divulgacao_gerada",
      objeto_tipo: "job",
      objeto_id: jobId,
      depois: { canais: resultados.map((x) => x.canal), provedor: r.provedor, modelo: r.modelo },
    });
    return { erro: null, resultados, suposicoes: lido.suposicoes, link: linkBase };
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    return falha("Não foi possível gerar agora. Tente de novo.");
  }
}

export type EstadoTranscricao = { erro: string | null; texto: string; segundos: number };

const TAMANHO_MAX_AUDIO = 4 * 1024 * 1024;

/**
 * Transcreve o áudio do gestor para a pessoa conferir antes de gerar os
 * critérios. O arquivo não é guardado; o texto só volta para a tela.
 */
export async function transcreverRecado(_anterior: EstadoTranscricao, formData: FormData): Promise<EstadoTranscricao> {
  const falha = (erro: string): EstadoTranscricao => ({ erro, texto: "", segundos: 0 });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) return falha("Vaga inválida.");
    const arq = formData.get("audio");
    if (!(arq instanceof File) || arq.size === 0) return falha("Escolha o arquivo de áudio.");
    if (arq.size > TAMANHO_MAX_AUDIO) return falha("O áudio passa de 4 MB. Corte ou comprima antes de enviar.");
    const tipo = (arq.type || "").toLowerCase();
    if (!tipo.startsWith("audio/") && tipo !== "video/mp4" && tipo !== "video/webm") {
      return falha("Envie um arquivo de áudio (ogg, mp3, m4a, wav ou webm).");
    }

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    const { data: vaga } = await admin.from("jobs").select("id, company_id").eq("id", jobId).maybeSingle();
    if (!vaga) return falha("Vaga não encontrada.");

    const r = await transcreverAudio({
      companyId: vaga.company_id,
      bytes: new Uint8Array(await arq.arrayBuffer()),
      mime: tipo,
      nome: arq.name.slice(0, 80),
    });
    if (!r.ok) return falha(r.erro);

    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "vaga_audio_transcrito",
      objeto_tipo: "job",
      objeto_id: jobId,
      depois: { segundos: Math.round(r.segundos) },
    });
    return { erro: null, texto: r.texto.slice(0, 6000), segundos: r.segundos };
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    return falha("Não foi possível transcrever agora. Tente de novo.");
  }
}

/**
 * Salva as regras que a IA segue nesta vaga (modo de entrevista, cortes, perguntas,
 * gatilhos). Regra que contraria um guardrail (reprovar sem validação, perguntar atributo
 * protegido, citar a empresa numa vaga sigilosa) NÃO é salva. O resultado volta pela URL.
 */
export async function salvarRegrasIA(formData: FormData) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const jobId = String(formData.get("job_id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) throw new Error("Vaga inválida.");
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, jobId);

  const destino = `/admin/vagas/${jobId}/criterios`;
  const admin = createAdminClient();
  const { data: vaga } = await admin.from("jobs").select("id, confidencial, criterios, regras_ia").eq("id", jobId).maybeSingle();
  if (!vaga) redirect(`${destino}?regras_erro=${encodeURIComponent("Vaga não encontrada.")}`);

  const atual = normalizarRegras(vaga.regras_ia);
  const regras = regrasDoFormulario((k) => String(formData.get(k) ?? ""), atual.versao);
  const criterios = normalizarCriterios(vaga.criterios);
  const verificacoes = verificarRegras(regras, { temObrigatorios: criterios.obrigatorios.length > 0, confidencial: !!vaga.confidencial });

  const bloqueios = verificacoes.filter((v) => v.nivel === "bloqueio");
  if (bloqueios.length > 0) {
    redirect(`${destino}?regras_erro=${encodeURIComponent(bloqueios.map((b) => b.mensagem).join(" "))}`);
  }

  const { error } = await admin
    .from("jobs")
    .update({ regras_ia: regras as unknown as import("@/lib/supabase/types").Json, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) redirect(`${destino}?regras_erro=${encodeURIComponent("Não foi possível salvar as regras.")}`);

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "vaga_regras_ia_atualizadas",
    objeto_tipo: "job",
    objeto_id: jobId,
    depois: { versao: regras.versao, modo: regras.modo, corte_triagem: regras.corte_triagem, gatilhos: regras.gatilhos_escalada.length },
  });

  revalidatePath(`/admin/vagas/${jobId}`);
  revalidatePath(destino);
  redirect(`${destino}?regras=ok`);
}
