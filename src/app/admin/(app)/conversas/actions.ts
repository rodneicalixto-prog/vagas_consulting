"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { candidatosVisiveis, exigirEmpresa, obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import { conversaVisivelParaOperador } from "@/lib/conversas";
import {
  TAMANHO_MAX_ENVIO,
  extensaoDoMime,
  nomeSeguro,
  podeEnviar,
  previa,
  rotuloAnexo,
  tipoDoAnexo,
  type TipoAnexo,
} from "@/lib/conversas";
import {
  configEvolutionDaEmpresa,
  empresaDaOperacao,
  enviarMidia,
  enviarTexto,
  type Citada,
} from "@/lib/evolution";
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

const BUCKET = "conversas-anexos";

/** Envia texto e/ou arquivo (imagem, documento, áudio) pelo WhatsApp da empresa. */
export async function enviarMensagem(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const conversaId = uuidDe(formData, "conversation_id");
  const texto = String(formData.get("texto") ?? "").trim();

  const arquivo = formData.get("arquivo");
  const anexo = arquivo instanceof File && arquivo.size > 0 ? arquivo : null;
  let tipoAnexo: TipoAnexo | null = null;
  if (anexo) {
    tipoAnexo = tipoDoAnexo(anexo.type);
    if (!tipoAnexo) {
      throw new Error("Tipo de arquivo não permitido. Envie imagem, PDF, Word, Excel, texto, áudio ou vídeo MP4.");
    }
    if (anexo.size > TAMANHO_MAX_ENVIO) throw new Error("O arquivo passa de 4 MB. Envie um menor.");
    if (tipoAnexo === "audio" && texto) {
      throw new Error("Áudio não aceita legenda. Envie o texto em outra mensagem.");
    }
    if (texto.length > 1000) throw new Error("A legenda deve ter até 1000 caracteres.");
  } else if (texto.length < 1 || texto.length > 2000) {
    throw new Error("A mensagem deve ter entre 1 e 2000 caracteres.");
  }
  const respostaBruta = String(formData.get("resposta_a") ?? "").trim();
  if (respostaBruta && !UUID.test(respostaBruta)) throw new Error("Identificador inválido.");

  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);

  // A empresa vem da conversa carregada no servidor, nunca do formulário.
  const { data: conversa } = await admin
    .from("conversations")
    .select("id, company_id, telefone_normalizado, candidate_id, status, atendente_id")
    .eq("id", conversaId)
    .maybeSingle();
  if (!conversa) throw new Error("Conversa não encontrada.");
  exigirEmpresa(escopo, conversa.company_id);

  // Dono da conversa: só o atendente responde. Gestão assume a fila ao responder.
  if (role === "operador" && !conversaVisivelParaOperador(conversa, user.id)) {
    redirect("/admin/acesso-negado");
  }
  if (!conversa.atendente_id) {
    if (role === "operador") throw new Error("Assuma a conversa antes de responder.");
    const { data: tomou } = await admin
      .from("conversations")
      .update({ atendente_id: user.id, atribuida_em: new Date().toISOString() })
      .eq("id", conversa.id)
      .is("atendente_id", null)
      .select("id");
    if (!tomou || tomou.length === 0) throw new Error("Esta conversa acabou de ser assumida por outra pessoa.");
  } else if (conversa.atendente_id !== user.id) {
    throw new Error("Esta conversa está com outra pessoa. Assuma a conversa para responder.");
  }

  const companyId = conversa.company_id;
  const telefone = conversa.telefone_normalizado;
  const candidateId = conversa.candidate_id;

  // Contato de empresa cliente: só vale na conversa da empresa da operação.
  let contatoDeCliente = false;
  if (companyId === (await empresaDaOperacao())) {
    const { data: clientes } = await admin
      .from("companies")
      .select("telefone, responsavel_telefone")
      .eq("status", "aprovada")
      .neq("id", companyId)
      .limit(1000);
    contatoDeCliente = (clientes ?? []).some(
      (c) =>
        normalizarTelefoneBR(c.telefone) === telefone || normalizarTelefoneBR(c.responsavel_telefone) === telefone,
    );
  }

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
    contatoDeCliente,
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

  // Citação: só vale mensagem desta mesma conversa.
  let citada: Citada | undefined;
  let respostaId: string | null = null;
  if (respostaBruta) {
    const { data: ref } = await admin
      .from("conversation_messages")
      .select("id, provedor_msg_id, texto")
      .eq("id", respostaBruta)
      .eq("conversation_id", conversa.id)
      .maybeSingle();
    if (ref) {
      respostaId = ref.id;
      if (ref.provedor_msg_id) citada = { id: ref.provedor_msg_id, texto: ref.texto };
    }
  }

  // Arquivo: guardado no bucket privado antes de registrar a mensagem.
  let bytes: Buffer | null = null;
  let mime = "";
  let nomeArquivo: string | null = null;
  let anexoPath: string | null = null;
  if (anexo && tipoAnexo) {
    mime = anexo.type.split(";")[0].trim().toLowerCase();
    bytes = Buffer.from(await anexo.arrayBuffer());
    nomeArquivo = (anexo.name || `${tipoAnexo}.${extensaoDoMime(mime)}`).replace(/[\\/]/g, "_").slice(0, 100);
    anexoPath = `${companyId}/${conversa.id}/${globalThis.crypto.randomUUID()}-${nomeSeguro(nomeArquivo)}`;
    const { error: erroUp } = await admin.storage
      .from(BUCKET)
      .upload(anexoPath, bytes, { contentType: mime, upsert: false });
    if (erroUp) throw new Error("Não foi possível guardar o arquivo. Tente novamente.");
  }

  const textoRegistro = texto || (tipoAnexo ? rotuloAnexo(tipoAnexo, nomeArquivo) : "");

  // Registra antes de enviar: se a rede cair, o histórico não perde a tentativa.
  const { data: msg, error: erroInsert } = await admin
    .from("conversation_messages")
    .insert({
      conversation_id: conversa.id,
      direcao: "saida",
      autor: "operador",
      autor_id: user.id,
      texto: textoRegistro,
      tipo: tipoAnexo ?? "texto",
      anexo_path: anexoPath,
      anexo_nome: nomeArquivo,
      anexo_mime: anexoPath ? mime : null,
      anexo_tamanho: bytes ? bytes.length : null,
      resposta_a: respostaId,
      status: "enviada",
    })
    .select("id")
    .single();
  if (erroInsert || !msg) {
    if (anexoPath) await admin.storage.from(BUCKET).remove([anexoPath]);
    throw new Error("Não foi possível registrar a mensagem. Tente novamente.");
  }

  const enviar = (c?: Citada) =>
    bytes && tipoAnexo
      ? enviarMidia(
          cfg.config,
          telefone,
          { tipo: tipoAnexo, base64: bytes.toString("base64"), mime, nome: nomeArquivo ?? "arquivo", legenda: texto || undefined },
          c,
        )
      : enviarTexto(cfg.config, telefone, texto, c);
  let envio = await enviar(citada);
  // Se a citação for o problema, reenvia sem ela em vez de perder a mensagem.
  if (!envio.ok && citada && envio.erro.startsWith("A Evolution respondeu com erro")) {
    envio = await enviar(undefined);
  }
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
    .update({ ultima_msg_em: new Date().toISOString(), ultima_msg_previa: previa(textoRegistro) })
    .eq("id", conversa.id);

  // O texto da mensagem nunca vai para a auditoria (dado pessoal).
  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "whatsapp_mensagem_enviada",
    objeto_tipo: "conversation",
    objeto_id: conversa.id,
    depois: { company_id: companyId, tipo: tipoAnexo ?? "texto" },
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

  await admin
    .from("conversations")
    .update({ atendente_id: user.id, atribuida_em: new Date().toISOString() })
    .eq("id", conversa.id)
    .is("atendente_id", null);

  redirect(`/admin/conversas?c=${conversa.id}`);
}

/**
 * Abre a conversa da empresa da operação (SOS Vagas) com o responsável de uma
 * empresa cliente. A conversa vive na empresa da operação, não na do cliente.
 */
export async function abrirConversaComEmpresaCliente(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const clienteId = uuidDe(formData, "company_id");
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);

  const operacaoId = await empresaDaOperacao();
  if (!operacaoId) throw new Error("A empresa da operação ainda não foi definida na plataforma.");
  exigirEmpresa(escopo, operacaoId);
  if (clienteId === operacaoId) throw new Error("Esta é a sua própria empresa.");

  const { data: cliente } = await admin
    .from("companies")
    .select("nome_fantasia, razao_social, telefone, responsavel_nome, responsavel_telefone")
    .eq("id", clienteId)
    .maybeSingle();
  if (!cliente) throw new Error("Empresa não encontrada.");

  const telefone = normalizarTelefoneBR(cliente.responsavel_telefone) ?? normalizarTelefoneBR(cliente.telefone);
  if (!telefone) {
    throw new Error("A empresa não tem telefone do responsável válido. Complete o cadastro em Empresas.");
  }
  const empresa = cliente.nome_fantasia || cliente.razao_social || "Empresa";
  const nome = cliente.responsavel_nome ? `${cliente.responsavel_nome} (${empresa})` : empresa;

  const { data: conversa, error } = await admin
    .from("conversations")
    .upsert(
      { company_id: operacaoId, canal: "whatsapp", telefone_normalizado: telefone, nome_contato: nome },
      { onConflict: "company_id,canal,telefone_normalizado" },
    )
    .select("id")
    .single();
  if (error || !conversa) throw new Error("Não foi possível abrir a conversa. Tente novamente.");

  await admin
    .from("conversations")
    .update({ atendente_id: user.id, atribuida_em: new Date().toISOString() })
    .eq("id", conversa.id)
    .is("atendente_id", null);

  redirect(`/admin/conversas?c=${conversa.id}`);
}

const GESTAO = ["superadmin", "admin", "admin_empresa"];

async function conversaDoEscopo(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const conversaId = uuidDe(formData, "conversation_id");
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);
  const { data: conversa } = await admin
    .from("conversations")
    .select("id, company_id, candidate_id, atendente_id")
    .eq("id", conversaId)
    .maybeSingle();
  if (!conversa) redirect("/admin/acesso-negado");
  exigirEmpresa(escopo, conversa.company_id);
  if (role === "operador" && !conversaVisivelParaOperador(conversa, user.id)) redirect("/admin/acesso-negado");
  return { user, role, admin, conversa };
}

async function registrar(
  admin: ReturnType<typeof createAdminClient>,
  atorId: string,
  acao: string,
  conversaId: string,
  depois: { de?: string | null; para?: string | null },
) {
  await admin.from("audit_log").insert({
    ator_id: atorId,
    acao,
    objeto_tipo: "conversation",
    objeto_id: conversaId,
    depois,
  });
}

/** Assume a conversa. Operador só assume da fila; a gestão pode retomar de outro. */
export async function assumirConversa(formData: FormData) {
  const { user, role, admin, conversa } = await conversaDoEscopo(formData);
  let consulta = admin
    .from("conversations")
    .update({ atendente_id: user.id, atribuida_em: new Date().toISOString() })
    .eq("id", conversa.id);
  if (!GESTAO.includes(role)) consulta = consulta.is("atendente_id", null); // sem corrida entre operadores
  const { data } = await consulta.select("id");
  if (data && data.length > 0) {
    await registrar(admin, user.id, "conversa_assumida", conversa.id, {
      de: conversa.atendente_id,
      para: user.id,
    });
  }
  revalidatePath("/admin/conversas");
}

/** Devolve a conversa à fila (o atendente ou a gestão). */
export async function devolverConversa(formData: FormData) {
  const { user, role, admin, conversa } = await conversaDoEscopo(formData);
  if (conversa.atendente_id !== user.id && !GESTAO.includes(role)) redirect("/admin/acesso-negado");
  await admin
    .from("conversations")
    .update({ atendente_id: null, atribuida_em: null })
    .eq("id", conversa.id);
  await registrar(admin, user.id, "conversa_devolvida", conversa.id, { de: conversa.atendente_id });
  revalidatePath("/admin/conversas");
}

/** Transfere para outra pessoa da equipe da empresa (só a gestão). */
export async function transferirConversa(formData: FormData) {
  const { user, role, admin, conversa } = await conversaDoEscopo(formData);
  if (!GESTAO.includes(role)) redirect("/admin/acesso-negado");
  const destino = uuidDe(formData, "para_user_id");
  const { data: vinculo } = await admin
    .from("company_assignments")
    .select("id")
    .eq("company_id", conversa.company_id)
    .eq("user_id", destino)
    .eq("ativo", true)
    .limit(1);
  if (!vinculo || vinculo.length === 0) throw new Error("Essa pessoa não faz parte da equipe desta empresa.");
  await admin
    .from("conversations")
    .update({ atendente_id: destino, atribuida_em: new Date().toISOString() })
    .eq("id", conversa.id);
  await registrar(admin, user.id, "conversa_transferida", conversa.id, {
    de: conversa.atendente_id,
    para: destino,
  });
  revalidatePath("/admin/conversas");
}
