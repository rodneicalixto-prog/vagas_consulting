"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { gerarTextoIA } from "@/lib/agente-servidor";
import { normalizarCriterios } from "@/lib/vaga-estruturada";
import {
  bloqueiosDaTriagem,
  montarCurriculoCego,
  montarPromptTriagem,
  resultadoDaResposta,
  resultadoSemDados,
} from "@/lib/triagem";
import { normalizarRegras } from "@/lib/regras-vaga";
import type { Json } from "@/lib/supabase/types";
import {
  LIMITE_AVALIACAO_POR_RODADA,
  dentroDaJanela,
  fitDaTriagem,
  fonteValida,
  lerPlanilha,
  mensagemEmail,
  mensagemWhatsApp,
  prepararProspect,
  retencaoAte,
  tokenRastreio,
  temBloqueio,
  verificarMensagem,
  type CanalHunter,
  type FonteHunter,
  type LinhaImportada,
} from "@/lib/hunter";
import { CAMPOS_ANONIMIZADOS, contatoBloqueado, linkRastreado, restanteHoje } from "@/lib/hunter-servidor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** O resultado volta pela URL: erro lançado chega sem texto ao navegador em produção. */
function volta(jobId: string, p: Record<string, string | number>): string {
  const qs = new URLSearchParams(Object.entries(p).map(([k, v]) => [k, String(v)]));
  return `/admin/vagas/${jobId}/hunter?${qs.toString()}`;
}

async function contexto(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const jobId = String(formData.get("job_id") ?? "");
  if (!UUID.test(jobId)) redirect("/admin/vagas");
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, jobId);
  const admin = createAdminClient();
  const { data: vaga } = await admin
    .from("jobs")
    .select("id, company_id, titulo, confidencial, criterios, regras_ia, companies(nome_fantasia, razao_social)")
    .eq("id", jobId)
    .maybeSingle();
  if (!vaga) redirect("/admin/vagas");
  const emp = Array.isArray(vaga.companies) ? vaga.companies[0] : vaga.companies;
  const nomeEmpresa = emp?.nome_fantasia || emp?.razao_social || null;
  return { user, admin, jobId, vaga, nomeEmpresa };
}

async function auditar(admin: ReturnType<typeof createAdminClient>, ator: string, acao: string, jobId: string, depois: Record<string, unknown>) {
  // Rastro sem dado pessoal: só contagens e ids.
  await admin.from("audit_log").insert({
    ator_id: ator,
    acao,
    objeto_tipo: "job",
    objeto_id: jobId,
    depois: depois as unknown as Json,
  });
}

/** Importa uma planilha (CSV) ou um contato avulso. Pula quem pediu para sair e quem já está na vaga. */
export async function importarProspects(formData: FormData) {
  const { user, admin, jobId } = await contexto(formData);
  const fonte = formData.get("fonte");
  if (!fonteValida(fonte)) redirect(volta(jobId, { erro: "Escolha a fonte dos dados." }));
  const fonteOk = fonte as FonteHunter;

  let linhas: LinhaImportada[] = [];
  let truncada = false;
  const planilha = String(formData.get("planilha") ?? "").trim();
  if (planilha) {
    const l = lerPlanilha(planilha);
    if (l.semCabecalho) {
      redirect(volta(jobId, { erro: "A planilha precisa de cabeçalho com uma coluna de telefone ou e-mail (ex.: nome;telefone;email;cargo;resumo)." }));
    }
    linhas = l.linhas;
    truncada = l.truncada;
  } else {
    const v = (k: string) => String(formData.get(k) ?? "").trim();
    if (v("telefone") || v("email")) {
      linhas = [{ nome: v("nome").slice(0, 120), telefone: v("telefone"), email: v("email"), cidade: v("cidade").slice(0, 80), cargo: v("cargo").slice(0, 120), perfil: v("perfil") }];
    }
  }
  if (linhas.length === 0) redirect(volta(jobId, { erro: "Cole uma planilha ou preencha um contato com telefone ou e-mail." }));

  let importados = 0;
  let ignorados = 0;
  let bloqueados = 0;
  let repetidos = 0;
  for (const l of linhas) {
    const p = prepararProspect(l);
    if (!p) {
      ignorados++;
      continue;
    }
    // Quem pediu para sair, em qualquer vaga, nunca volta.
    if (await contatoBloqueado({ telefone: p.telefone, email: p.email })) {
      bloqueados++;
      continue;
    }
    const { error } = await admin.from("hunter_prospects").insert({
      job_id: jobId,
      criado_por: user.id,
      fonte: fonteOk,
      nome: p.nome,
      telefone: p.telefone,
      email: p.email,
      cidade: p.cidade,
      perfil: p.perfil,
      chave_tel: p.chave_tel,
      chave_email: p.chave_email,
      token: tokenRastreio(),
      retencao_ate: retencaoAte().toISOString(),
    });
    if (error) {
      if (error.code === "23505") repetidos++;
      else ignorados++;
      continue;
    }
    importados++;
  }

  await auditar(admin, user.id, "hunter_importacao", jobId, { fonte: fonteOk, importados, ignorados, bloqueados, repetidos });
  revalidatePath(`/admin/vagas/${jobId}/hunter`);
  redirect(volta(jobId, { importados, ignorados, bloqueados, repetidos, ...(truncada ? { truncada: 1 } : {}) }));
}

/** Avalia às cegas contra os critérios da vaga (mesmo método da triagem). Só avalia: não contata ninguém. */
export async function avaliarProspects(formData: FormData) {
  const { user, admin, jobId, vaga } = await contexto(formData);
  const criterios = normalizarCriterios(vaga.criterios);
  const bloqueios = bloqueiosDaTriagem(criterios);
  if (bloqueios.length > 0) redirect(volta(jobId, { erro: `Critérios da vaga com pendência: ${bloqueios.join(" ")}` }));

  const { data: lote } = await admin
    .from("hunter_prospects")
    .select("id, perfil")
    .eq("job_id", jobId)
    .eq("estado", "novo")
    .is("anonimizado_em", null)
    .order("created_at", { ascending: true })
    .limit(LIMITE_AVALIACAO_POR_RODADA);
  const rodada = lote ?? [];
  if (rodada.length === 0) redirect(volta(jobId, { erro: "Nenhum prospect novo para avaliar." }));

  let avaliados = 0;
  let falhas = 0;
  let parou = "";

  const avaliarUm = async (p: { id: string; perfil: string }) => {
    const cego = montarCurriculoCego({ titulo_profissional: "", resumo: p.perfil });
    let resultado;
    if (cego.vazio) {
      resultado = resultadoSemDados(criterios);
    } else {
      const { system, user: prompt } = montarPromptTriagem(criterios, cego.texto, null);
      const r = await gerarTextoIA({ companyId: vaga.company_id, system, user: prompt, json: true, maxTokens: 900 });
      if (!r.ok) {
        if (/teto|chave/i.test(r.erro)) parou = r.erro;
        falhas++;
        return;
      }
      const lido = resultadoDaResposta(r.texto, criterios, cego.texto, null, []);
      if (!lido) {
        falhas++;
        return;
      }
      resultado = lido;
    }
    const { error } = await admin
      .from("hunter_prospects")
      .update({
        estado: "avaliado",
        fit: cego.vazio ? "nao_avaliado" : fitDaTriagem(resultado),
        pontuacao: resultado.pontuacao,
        resultado: resultado as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id)
      .eq("estado", "novo");
    if (error) falhas++;
    else avaliados++;
  };

  // Em blocos de 5: cabe no tempo e respeita o teto de custo entre os blocos.
  for (let i = 0; i < rodada.length && !parou; i += 5) {
    await Promise.all(rodada.slice(i, i + 5).map(avaliarUm));
  }

  await auditar(admin, user.id, "hunter_avaliacao", jobId, { avaliados, falhas, parou: parou || null });
  revalidatePath(`/admin/vagas/${jobId}/hunter`);
  redirect(volta(jobId, { avaliados, falhas, ...(parou ? { erro: parou } : {}) }));
}

/** Gera a mensagem de primeiro contato (modelo fixo e identificado) para os avaliados com bom encaixe. */
export async function gerarMensagens(formData: FormData) {
  const { user, admin, jobId, vaga, nomeEmpresa } = await contexto(formData);
  const canal = formData.get("canal") === "email" ? ("email" as CanalHunter) : ("whatsapp" as CanalHunter);
  const fits = formData.get("incluir_medio") === "sim" ? ["alto", "medio"] : ["alto"];

  const { data: lista } = await admin
    .from("hunter_prospects")
    .select("id, nome, fonte, telefone, email, token")
    .eq("job_id", jobId)
    .eq("estado", "avaliado")
    .in("fit", fits)
    .is("anonimizado_em", null)
    .limit(200);

  let geradas = 0;
  let semContato = 0;
  for (const p of lista ?? []) {
    if ((canal === "whatsapp" && !p.telefone) || (canal === "email" && !p.email)) {
      semContato++;
      continue;
    }
    const base = {
      nome: p.nome,
      fonte: p.fonte as FonteHunter,
      tituloVaga: vaga.titulo,
      // Vaga sigilosa: a mensagem não revela a empresa.
      empresa: vaga.confidencial ? null : nomeEmpresa,
      link: linkRastreado(p.token),
    };
    const texto = canal === "whatsapp" ? mensagemWhatsApp(base) : (() => {
      const e = mensagemEmail(base);
      return `Assunto: ${e.assunto}\n\n${e.texto}`;
    })();
    const { error } = await admin
      .from("hunter_prospects")
      .update({ canal, texto, estado: "mensagem_pronta", updated_at: new Date().toISOString() })
      .eq("id", p.id)
      .eq("estado", "avaliado");
    if (!error) geradas++;
  }

  await auditar(admin, user.id, "hunter_mensagens_geradas", jobId, { canal, geradas, semContato });
  revalidatePath(`/admin/vagas/${jobId}/hunter`);
  redirect(volta(jobId, { geradas, semContato }));
}

/** A pessoa pode ajustar o texto antes de aprovar; a verificação roda de novo na aprovação. */
export async function editarMensagem(formData: FormData) {
  const { admin, jobId } = await contexto(formData);
  const id = String(formData.get("id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim().slice(0, 2000);
  if (!UUID.test(id) || texto.length < 20) redirect(volta(jobId, { erro: "Texto da mensagem muito curto." }));
  await admin
    .from("hunter_prospects")
    .update({ texto, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("job_id", jobId)
    .eq("estado", "mensagem_pronta");
  revalidatePath(`/admin/vagas/${jobId}/hunter`);
  redirect(volta(jobId, { editada: 1 }));
}

/** Aprova em lote. Respeita o teto diário do WhatsApp e barra mensagem com bloqueio ou contato que pediu para sair. */
export async function aprovarMensagens(formData: FormData) {
  const { user, admin, jobId, vaga, nomeEmpresa } = await contexto(formData);
  const ids = formData.getAll("ids").map(String).filter((i) => UUID.test(i));
  if (ids.length === 0) redirect(volta(jobId, { erro: "Marque ao menos uma mensagem para aprovar." }));

  const { data: lista } = await admin
    .from("hunter_prospects")
    .select("id, canal, texto, telefone, email, token")
    .eq("job_id", jobId)
    .eq("estado", "mensagem_pronta")
    .in("id", ids);

  // O teto conta o que já foi enviado hoje e o que já está aprovado esperando envio.
  const { restante } = await restanteHoje();
  const { count: aprovadosWhats } = await admin
    .from("hunter_prospects")
    .select("id", { count: "exact", head: true })
    .eq("canal", "whatsapp")
    .eq("estado", "aprovado");
  let vagas = Math.max(0, restante - (aprovadosWhats ?? 0));

  let aprovadas = 0;
  let barradas = 0;
  let foraDoTeto = 0;
  for (const p of lista ?? []) {
    const canal = (p.canal === "email" ? "email" : "whatsapp") as CanalHunter;
    const vs = verificarMensagem(p.texto, { canal, vagaSigilosa: !!vaga.confidencial, nomeEmpresa, link: linkRastreado(p.token) });
    if (temBloqueio(vs) || (await contatoBloqueado({ telefone: p.telefone, email: p.email }))) {
      barradas++;
      continue;
    }
    if (canal === "whatsapp") {
      if (vagas <= 0) {
        foraDoTeto++;
        continue;
      }
      vagas--;
    }
    const { error } = await admin
      .from("hunter_prospects")
      .update({ estado: "aprovado", aprovado_por: user.id, aprovado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", p.id)
      .eq("estado", "mensagem_pronta");
    if (!error) aprovadas++;
  }

  await auditar(admin, user.id, "hunter_mensagens_aprovadas", jobId, { aprovadas, barradas, foraDoTeto });
  revalidatePath(`/admin/vagas/${jobId}/hunter`);
  redirect(volta(jobId, { aprovadas, barradas, foraDoTeto }));
}

/** Depois que a pessoa enviou pelo número dedicado (link do WhatsApp ou e-mail), registra o envio e começa a contar os 30 dias. */
export async function marcarEnviado(formData: FormData) {
  const { user, admin, jobId, vaga } = await contexto(formData);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect(volta(jobId, { erro: "Registro inválido." }));
  const { data: p } = await admin
    .from("hunter_prospects")
    .select("id, canal, telefone, email, estado")
    .eq("id", id)
    .eq("job_id", jobId)
    .maybeSingle();
  if (!p || p.estado !== "aprovado") redirect(volta(jobId, { erro: "Só mensagem aprovada pode ser marcada como enviada." }));

  if (await contatoBloqueado({ telefone: p.telefone, email: p.email })) {
    redirect(volta(jobId, { erro: "Esta pessoa pediu para não ser contactada. Não envie." }));
  }
  if (p.canal === "whatsapp") {
    const regras = normalizarRegras(vaga.regras_ia);
    if (!dentroDaJanela(new Date(), regras.horario_inicio, regras.horario_fim)) {
      redirect(volta(jobId, { erro: "Fora da janela de horário de contato desta vaga. Envie dentro do horário." }));
    }
    const { restante } = await restanteHoje();
    if (restante <= 0) redirect(volta(jobId, { erro: "O teto diário de WhatsApp do hunter foi atingido. Continue amanhã." }));
  }

  const agora = new Date();
  await admin
    .from("hunter_prospects")
    .update({ estado: "enviado", enviada_em: agora.toISOString(), retencao_ate: retencaoAte(agora).toISOString(), updated_at: agora.toISOString() })
    .eq("id", id)
    .eq("estado", "aprovado");

  await auditar(admin, user.id, "hunter_envio_registrado", jobId, { prospect_id: id, canal: p.canal });
  revalidatePath(`/admin/vagas/${jobId}/hunter`);
  redirect(volta(jobId, { enviado: 1 }));
}

/** A pessoa pediu para sair por outro meio (ligação, e-mail): apaga os dados e bloqueia o contato para sempre. */
export async function registrarSaida(formData: FormData) {
  const { user, admin, jobId } = await contexto(formData);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) redirect(volta(jobId, { erro: "Registro inválido." }));
  const { data: p } = await admin.from("hunter_prospects").select("id, telefone").eq("id", id).eq("job_id", jobId).maybeSingle();
  if (!p) redirect(volta(jobId, { erro: "Prospect não encontrado." }));

  // O bloqueio do número vale para todas as vagas e canais de WhatsApp.
  if (p.telefone) {
    const { error } = await admin.from("channel_opt_outs").insert({
      company_id: null,
      canal: "whatsapp",
      telefone_normalizado: p.telefone,
      motivo: "pedido do titular (hunter)",
    });
    if (error && error.code !== "23505") redirect(volta(jobId, { erro: "Não foi possível registrar o bloqueio. Nada foi apagado." }));
  }
  const agora = new Date().toISOString();
  await admin
    .from("hunter_prospects")
    .update({ ...CAMPOS_ANONIMIZADOS, estado: "nao_contactar", anonimizado_em: agora, updated_at: agora })
    .eq("id", id);

  await auditar(admin, user.id, "hunter_saida_registrada", jobId, { prospect_id: id });
  revalidatePath(`/admin/vagas/${jobId}/hunter`);
  redirect(volta(jobId, { saida: 1 }));
}

export async function descartarProspect(formData: FormData) {
  const { admin, jobId } = await contexto(formData);
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) {
    await admin
      .from("hunter_prospects")
      .update({ estado: "descartado", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("job_id", jobId)
      .in("estado", ["novo", "avaliado", "mensagem_pronta", "aprovado"]);
  }
  revalidatePath(`/admin/vagas/${jobId}/hunter`);
  redirect(volta(jobId, { descartado: 1 }));
}
