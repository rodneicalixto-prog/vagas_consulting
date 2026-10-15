import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decifrar } from "@/lib/crypto-segredos";
import { bloqueadoNaEmpresa } from "@/lib/blacklist-empresa";
import { fonteDaSelecao, selecionarNotas } from "@/lib/recuperacao";
import { STATUS_CANDIDATURA_EM_ABERTO } from "@/lib/format";
import { normalizarTelefoneBR } from "@/lib/whatsapp";
import { configEvolutionDaEmpresa, enviarTexto } from "@/lib/evolution";
import {
  MODELO_PADRAO,
  limparPlaceholders,
  podeRetomar,
  atendeSozinho,
  comIdentificacao,
  ehEncerramento,
  mensagemDeEncaminhamento,
  pedeHumano,
  escolherModeloDisponivel,
  corpoDaLicao,
  ehLicaoSegura,
  estadoDaSugestao,
  tituloDaLicao,
  SINAL_ENCAMINHAR,
  assuntoDeRisco,
  custoEstimadoUsd,
  montarPrompt,
  provedorAgenteValido,
  type ProvedorAgente,
} from "@/lib/agente";

type Resposta = { texto: string; tokensIn: number; tokensOut: number };

const URLS: Record<"groq" | "openai", string> = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
};

/** Chave da empresa (se tiver) ou da plataforma, direto do cofre. Nunca sai do servidor. */
async function chaveDoProvedor(companyId: string, provedor: ProvedorAgente): Promise<string | null> {
  const admin = createAdminClient();
  const { data: propria } = await admin
    .from("integration_credentials")
    .select("segredo_cifrado")
    .eq("escopo", "empresa")
    .eq("company_id", companyId)
    .eq("provedor", provedor)
    .maybeSingle();
  const { data: plataforma } = propria?.segredo_cifrado
    ? { data: null }
    : await admin
        .from("integration_credentials")
        .select("segredo_cifrado")
        .eq("escopo", "plataforma")
        .eq("provedor", provedor)
        .maybeSingle();
  const cifrado = propria?.segredo_cifrado ?? plataforma?.segredo_cifrado;
  if (!cifrado) return null;
  try {
    return decifrar(cifrado);
  } catch {
    return null;
  }
}

/** Resumo do erro do provedor (código e mensagem); nunca inclui a chave. */
async function detalheDoErro(r: Response): Promise<string> {
  let msg = "";
  try {
    const j = (await r.json()) as { error?: { message?: string } | string; message?: string };
    msg = typeof j.error === "string" ? j.error : (j.error?.message ?? j.message ?? "");
  } catch {
    msg = "";
  }
  return `HTTP ${r.status}${msg ? `: ${msg.replace(/\s+/g, " ").slice(0, 140)}` : ""}`;
}

/** Lista os modelos que a chave enxerga (Groq e OpenAI usam o mesmo formato). */
async function listarModelos(provedor: ProvedorAgente, chave: string): Promise<string[]> {
  if (provedor === "anthropic") return [];
  const base = provedor === "groq" ? "https://api.groq.com/openai/v1/models" : "https://api.openai.com/v1/models";
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8_000);
  try {
    const r = await fetch(base, { headers: { Authorization: `Bearer ${chave}` }, signal: c.signal, cache: "no-store" });
    if (!r.ok) return [];
    const j = (await r.json()) as { data?: { id?: string }[] };
    return (j.data ?? []).map((m) => m.id ?? "").filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

async function chamarModelo(
  provedor: ProvedorAgente,
  modelo: string,
  chave: string,
  system: string,
  user: string,
  opcoes: { json?: boolean; maxTokens?: number } = {},
): Promise<Resposta> {
  const maxTokens = opcoes.maxTokens ?? 400;
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), opcoes.json ? 40_000 : 20_000);
  try {
    if (provedor === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: modelo, max_tokens: maxTokens, temperature: 0.3, system, messages: [{ role: "user", content: user }] }),
        signal: c.signal,
        cache: "no-store",
      });
      if (!r.ok) throw new Error(await detalheDoErro(r));
      const j = (await r.json()) as {
        content?: { text?: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      return {
        texto: (j.content?.[0]?.text ?? "").trim(),
        tokensIn: j.usage?.input_tokens ?? 0,
        tokensOut: j.usage?.output_tokens ?? 0,
      };
    }
    const r = await fetch(URLS[provedor], {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        temperature: 0.3,
        max_tokens: maxTokens,
        ...(opcoes.json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: c.signal,
      cache: "no-store",
    });
    if (!r.ok) throw new Error(await detalheDoErro(r));
    const j = (await r.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      texto: (j.choices?.[0]?.message?.content ?? "").trim(),
      tokensIn: j.usage?.prompt_tokens ?? 0,
      tokensOut: j.usage?.completion_tokens ?? 0,
    };
  } finally {
    clearTimeout(t);
  }
}

function inicioDoMes(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/**
 * Gera a sugestão de resposta para uma mensagem de entrada (modo sugestão).
 * Nunca envia nada. Falha em silêncio: o inbox segue funcionando sem a IA.
 * Spec: docs/specs/AGENTE_IA_FASE3.md §3, §5.
 */
export async function gerarSugestao(conversationId: string, messageId: string): Promise<void> {
  const admin = createAdminClient();

  const [{ data: conversa }, { data: msg }] = await Promise.all([
    admin
      .from("conversations")
      .select("id, company_id, candidate_id, telefone_normalizado, atendente_id, atribuida_em")
      .eq("id", conversationId)
      .maybeSingle(),
    admin
      .from("conversation_messages")
      .select("id, direcao, tipo, texto, conversation_id")
      .eq("id", messageId)
      .maybeSingle(),
  ]);
  if (!conversa || !msg || msg.conversation_id !== conversa.id) return;
  if (msg.direcao !== "entrada" || msg.tipo !== "texto") return;
  // Empresa cliente cadastrada (responsável ou telefone da empresa): conversa de
  // gestão, sem agente. Contato desconhecido ou candidato recebe sugestão.
  {
    const { data: clientes } = await admin
      .from("companies")
      .select("telefone, responsavel_telefone")
      .neq("id", conversa.company_id)
      .limit(1000);
    const tel = conversa.telefone_normalizado;
    if (
      (clientes ?? []).some(
        (c) => normalizarTelefoneBR(c.telefone) === tel || normalizarTelefoneBR(c.responsavel_telefone) === tel,
      )
    ) {
      return;
    }
  }

  const { data: agente } = await admin.from("ai_agents").select("*").eq("company_id", conversa.company_id).maybeSingle();
  if (!agente || !agente.ativo) return;
  if (!provedorAgenteValido(agente.provedor)) return;
  const provedor: ProvedorAgente = agente.provedor;

  // Já existe sugestão para esta mensagem?
  const { data: jaTem } = await admin.from("ai_suggestions").select("id").eq("message_id", messageId).limit(1);
  if (jaTem && jaTem.length > 0) return;

  // Descadastro e black list bloqueiam a geração, não só o envio.
  const [{ data: optOut }, bloqueado] = await Promise.all([
    admin
      .from("channel_opt_outs")
      .select("id")
      .eq("canal", "whatsapp")
      .eq("telefone_normalizado", conversa.telefone_normalizado)
      .or(`company_id.eq.${conversa.company_id},company_id.is.null`)
      .limit(1),
    bloqueadoNaEmpresa(conversa.company_id, {
      id: conversa.candidate_id ?? "00000000-0000-0000-0000-000000000000",
      telefone: conversa.telefone_normalizado,
    }),
  ]);
  if ((optOut ?? []).length > 0 || bloqueado) return;

  const registrar = async (
    rascunho: string,
    motivo: string | null,
    extra?: { fonte?: string[] },
  ): Promise<string | null> => {
    // Substitui a sugestão pendente anterior da mesma conversa.
    await admin
      .from("ai_suggestions")
      .update({ estado: "expirada" })
      .eq("conversation_id", conversa.id)
      .eq("estado", "pendente");
    const { data } = await admin
      .from("ai_suggestions")
      .insert({
        conversation_id: conversa.id,
        message_id: messageId,
        agent_id: agente.id,
        rascunho,
        motivo_parada: motivo,
        fonte: extra?.fonte ?? [],
      })
      .select("id")
      .single();
    return data?.id ?? null;
  };

  // Auto-envio só quando ninguém da equipe assumiu a conversa e o agente está em modo de atendimento.
  let automatico = atendeSozinho(agente.nivel_autonomia) && conversa.atendente_id === null;
  let devolverAFila = false;
  // Equipe assumiu, mas sumiu: depois de 30 min sem atribuir nem responder, o agente retoma.
  if (atendeSozinho(agente.nivel_autonomia) && conversa.atendente_id !== null) {
    const { data: ultimaHumana } = await admin
      .from("conversation_messages")
      .select("created_at")
      .eq("conversation_id", conversa.id)
      .eq("autor", "operador")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (podeRetomar(conversa.atribuida_em, ultimaHumana?.created_at ?? null, Date.now())) {
      automatico = true;
      devolverAFila = true;
    }
  }

  /** Envia pelo WhatsApp da empresa e registra a mensagem como do assistente. */
  const enviarAgora = async (texto: string): Promise<boolean> => {
    // Freio contra laço: no máximo 3 respostas automáticas em 10 minutos por conversa.
    const desde = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await admin
      .from("conversation_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversa.id)
      .eq("autor", "ia")
      .gte("created_at", desde);
    if ((count ?? 0) >= 3) return false;

    const cfg = await configEvolutionDaEmpresa(conversa.company_id);
    if (!cfg.ok) return false;

    const { data: nova } = await admin
      .from("conversation_messages")
      .insert({
        conversation_id: conversa.id,
        direcao: "saida",
        autor: "ia",
        texto,
        tipo: "texto",
        status: "enviada",
      })
      .select("id")
      .single();
    if (!nova) return false;

    const envio = await enviarTexto(cfg.config, conversa.telefone_normalizado, texto);
    if (!envio.ok) {
      await admin.from("conversation_messages").update({ status: "falhou", erro: envio.erro }).eq("id", nova.id);
      return false;
    }
    if (envio.idMensagem) {
      await admin.from("conversation_messages").update({ provedor_msg_id: envio.idMensagem }).eq("id", nova.id);
    }
    await admin
      .from("conversations")
      .update({
        ultima_msg_em: new Date().toISOString(),
        ultima_msg_previa: texto.replace(/\s+/g, " ").slice(0, 80),
        ...(devolverAFila ? { atendente_id: null, atribuida_em: null } : {}),
      })
      .eq("id", conversa.id);
    await admin.from("audit_log").insert({
      ator_id: null,
      acao: "agente_resposta_automatica",
      objeto_tipo: "conversation",
      objeto_id: conversa.id,
      depois: { company_id: conversa.company_id, agente_id: agente.id },
    });
    return true;
  };

  /** Agradecimento ou encerramento não precisa de resposta. */
  if (ehEncerramento(msg.texto)) return;

  // Pedido explícito de falar com uma pessoa: encaminha e não gera resposta.
  if (pedeHumano(msg.texto)) {
    await registrar("", "pediu_humano");
    if (automatico) {
      await enviarAgora(
        "Claro! Vou chamar uma pessoa da nossa equipe para continuar esta conversa com você. Obrigado pela paciência.",
      );
    }
    return;
  }

  // 1) Assunto de risco: vai direto para a pessoa, sem chamar a IA.
  const risco = assuntoDeRisco(msg.texto);
  if (risco) {
    await registrar("", `risco_${risco}`);
    if (automatico) {
      const aviso = mensagemDeEncaminhamento(`risco_${risco}`);
      if (aviso) await enviarAgora(aviso);
    }
    return;
  }

  // 2) Teto mensal de custo da empresa.
  const { data: runs } = await admin
    .from("ai_agent_runs")
    .select("custo_usd")
    .eq("agent_id", agente.id)
    .gte("created_at", inicioDoMes())
    .limit(5000);
  const gasto = (runs ?? []).reduce((s, r) => s + Number(r.custo_usd ?? 0), 0);
  if (gasto >= Number(agente.teto_mensal_usd)) {
    await registrar("", "teto_mensal");
    return;
  }

  // 3) Contexto: notas aprovadas, vaga em andamento e histórico recente.
  const [{ data: notas }, { data: historico }, { data: apps }] = await Promise.all([
    admin
      .from("ai_knowledge_notes")
      .select("tipo, titulo, corpo_md")
      .eq("company_id", conversa.company_id)
      .eq("status", "aprovada")
      .or(`valida_ate.is.null,valida_ate.gte.${new Date().toISOString().slice(0, 10)}`)
      .order("tipo")
      .limit(40),
    admin
      .from("conversation_messages")
      .select("direcao, autor, tipo, texto, created_at")
      .eq("conversation_id", conversa.id)
      .order("created_at", { ascending: false })
      .limit(10),
    conversa.candidate_id
      ? admin
          .from("applications")
          .select("status, updated_at, jobs!inner(titulo, local, modelo_trabalho, modalidade, remuneracao_texto, descricao, requisitos, company_id, confidencial)")
          .eq("candidate_id", conversa.candidate_id)
          .eq("jobs.company_id", conversa.company_id)
          .in("status", STATUS_CANDIDATURA_EM_ABERTO)
          .order("updated_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null }),
  ]);

  const jobBruto = apps?.[0]?.jobs;
  const job = Array.isArray(jobBruto) ? jobBruto[0] : jobBruto;
  // Vaga confidencial: o agente não pode citá-la.
  const vaga =
    job && !job.confidencial
      ? {
          titulo: job.titulo,
          local: job.local,
          modelo_trabalho: job.modelo_trabalho as string | null,
          modalidade: job.modalidade as string | null,
          remuneracao_texto: job.remuneracao_texto,
          descricao: job.descricao,
          requisitos: job.requisitos,
        }
      : null;

  if ((notas ?? []).length === 0 && !vaga) {
    await registrar("", "sem_fonte");
    if (automatico) {
      const aviso = mensagemDeEncaminhamento("sem_fonte");
      if (aviso) await enviarAgora(aviso);
    }
    return;
  }

  const hist = (historico ?? [])
    .filter((h) => h.tipo === "texto" && h.autor !== "sistema")
    .reverse()
    .map((h) => ({
      autor: (h.direcao === "entrada" ? "candidato" : "atendente") as "candidato" | "atendente",
      texto: h.texto,
    }));

  // Só as notas que casam com o que a pessoa perguntou (ou todas, se nada casar).
  const consulta = hist
    .filter((h) => h.autor === "candidato")
    .slice(-3)
    .map((h) => h.texto ?? "")
    .join(" ");
  const selecao = selecionarNotas(notas ?? [], consulta);

  const { system, user } = montarPrompt({
    nomeAgente: agente.nome,
    tom: agente.tom,
    roteiro: agente.roteiro,
    notas: selecao.notas,
    vaga,
    historico: hist,
  });

  // 4) Chave e chamada ao modelo.
  const chave = await chaveDoProvedor(conversa.company_id, provedor);
  const modelo = agente.modelo?.trim() || MODELO_PADRAO[provedor];
  const inicio = Date.now();

  const registrarRun = async (
    sugestaoId: string | null,
    motivo: string | null,
    tokensIn: number | null,
    tokensOut: number | null,
  ) => {
    await admin.from("ai_agent_runs").insert({
      agent_id: agente.id,
      conversation_id: conversa.id,
      suggestion_id: sugestaoId,
      provedor,
      modelo: modeloUsado,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      custo_usd: tokensIn !== null && tokensOut !== null ? custoEstimadoUsd(modeloUsado, tokensIn, tokensOut) : null,
      latencia_ms: Date.now() - inicio,
      motivo_parada: motivo,
    });
  };

  if (!chave) {
    await registrarRun(null, "sem_chave", null, null);
    return;
  }

  let resposta: Resposta;
  let modeloUsado = modelo;
  try {
    try {
      resposta = await chamarModelo(provedor, modelo, chave, system, user);
    } catch (primeiro) {
      // Modelo inexistente ou sem acesso: escolhe um disponível na conta e tenta de novo.
      const msg = primeiro instanceof Error ? primeiro.message : "";
      if (!/HTTP (400|404)/.test(msg) || !/model/i.test(msg)) throw primeiro;
      const alternativo = escolherModeloDisponivel(provedor, await listarModelos(provedor, chave));
      if (!alternativo || alternativo === modelo) throw primeiro;
      resposta = await chamarModelo(provedor, alternativo, chave, system, user);
      modeloUsado = alternativo;
      // Guarda a escolha para as próximas mensagens irem direto.
      await admin.from("ai_agents").update({ modelo: alternativo }).eq("id", agente.id);
    }
  } catch (e) {
    const detalhe = e instanceof Error ? e.name === "AbortError" ? "tempo esgotado" : e.message : "falha";
    const motivo = `erro_provedor: ${detalhe}`.slice(0, 200);
    const id = await registrar("", motivo);
    await registrarRun(id, motivo, null, null);
    return;
  }

  const texto = limparPlaceholders(resposta.texto);
  if (!texto || texto.includes(SINAL_ENCAMINHAR)) {
    const id = await registrar("", "sem_fonte");
    await registrarRun(id, "sem_fonte", resposta.tokensIn, resposta.tokensOut);
    if (automatico) {
      const aviso = mensagemDeEncaminhamento("sem_fonte");
      if (aviso) await enviarAgora(aviso);
    }
    return;
  }

  const fonte = fonteDaSelecao(selecao.notas.map((n) => n.titulo).slice(0, 20), selecao.todas);
  if (vaga) fonte.unshift(`Vaga: ${vaga.titulo}`);
  const id = await registrar(texto.slice(0, 1500), null, { fonte });
  await registrarRun(id, null, resposta.tokensIn, resposta.tokensOut);

  // Atendimento automático: envia a resposta e fecha a sugestão como "usada".
  if (automatico && id) {
    const { count: jaFalou } = await admin
      .from("conversation_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversa.id)
      .eq("autor", "ia");
    const { data: emp } = await admin
      .from("companies")
      .select("nome_fantasia, razao_social")
      .eq("id", conversa.company_id)
      .maybeSingle();
    const nomeEmpresa = emp?.nome_fantasia || emp?.razao_social || "empresa";
    const final = comIdentificacao(texto.slice(0, 1500), nomeEmpresa, (jaFalou ?? 0) > 0);
    if (await enviarAgora(final)) {
      await admin
        .from("ai_suggestions")
        .update({ estado: "usada", texto_final: final, decidida_em: new Date().toISOString() })
        .eq("id", id);
    }
  }
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Aprende com a resposta humana: quando a equipe editou a sugestão ou
 * respondeu algo que o agente não soube, a troca vira uma lição candidata
 * (rascunho, sem dado pessoal) para o Rodnei aprovar. Nunca vira regra sozinha.
 */
export async function aprenderComResposta(
  admin: Admin,
  p: { companyId: string; conversationId: string; userId: string; resposta: string; sugestaoId: string | null },
): Promise<void> {
  const { data: agente } = await admin.from("ai_agents").select("id").eq("company_id", p.companyId).maybeSingle();
  if (!agente) return;

  const { data: ultima } = await admin
    .from("conversation_messages")
    .select("texto")
    .eq("conversation_id", p.conversationId)
    .eq("direcao", "entrada")
    .eq("tipo", "texto")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ultima) return;

  let origem: "editada" | "parada" | null = null;
  if (p.sugestaoId) {
    const { data: s } = await admin.from("ai_suggestions").select("rascunho").eq("id", p.sugestaoId).maybeSingle();
    if (s && s.rascunho && estadoDaSugestao(s.rascunho, p.resposta) === "editada") origem = "editada";
  } else {
    const { data: s } = await admin
      .from("ai_suggestions")
      .select("motivo_parada, created_at")
      .eq("conversation_id", p.conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const recente = s ? Date.now() - new Date(s.created_at).getTime() < 24 * 3_600_000 : false;
    if (recente && s?.motivo_parada && ["sem_fonte", "pediu_humano"].includes(s.motivo_parada)) origem = "parada";
  }
  if (!origem) return;
  if (!ehLicaoSegura(ultima.texto, p.resposta)) return;

  const titulo = tituloDaLicao(ultima.texto);
  const { data: igual } = await admin
    .from("ai_knowledge_notes")
    .select("id")
    .eq("company_id", p.companyId)
    .eq("titulo", titulo)
    .neq("status", "arquivada")
    .limit(1);
  if (igual && igual.length > 0) return;

  await admin.from("ai_knowledge_notes").insert({
    company_id: p.companyId,
    tipo: "licao",
    titulo,
    corpo_md: corpoDaLicao(ultima.texto, p.resposta, origem),
    status: "rascunho",
    origem: "aprendizado",
    criado_por: p.userId,
  });
}

export type ResultadoIA =
  | { ok: true; texto: string; provedor: ProvedorAgente; modelo: string }
  | { ok: false; erro: string };

/**
 * Chamada de IA de uso geral (geração de critérios da vaga etc.): usa o
 * provedor e o modelo do agente da empresa (ou OpenAI), a chave do cofre, o
 * teto mensal e registra a execução. Nunca devolve a chave.
 */
export async function gerarTextoIA(p: {
  companyId: string;
  system: string;
  user: string;
  json?: boolean;
  maxTokens?: number;
}): Promise<ResultadoIA> {
  const admin = createAdminClient();
  const { data: agente } = await admin.from("ai_agents").select("*").eq("company_id", p.companyId).maybeSingle();
  const provedor: ProvedorAgente =
    agente && provedorAgenteValido(agente.provedor) ? (agente.provedor as ProvedorAgente) : "openai";
  let modelo = agente?.modelo?.trim() || MODELO_PADRAO[provedor];

  if (agente) {
    const { data: runs } = await admin
      .from("ai_agent_runs")
      .select("custo_usd")
      .eq("agent_id", agente.id)
      .gte("created_at", inicioDoMes())
      .limit(5000);
    const gasto = (runs ?? []).reduce((s, r) => s + Number(r.custo_usd ?? 0), 0);
    if (gasto >= Number(agente.teto_mensal_usd)) {
      return { ok: false, erro: "O teto mensal de custo de IA foi atingido." };
    }
  }

  const chave = await chaveDoProvedor(p.companyId, provedor);
  if (!chave) return { ok: false, erro: "Não há chave de IA cadastrada para este provedor (Integrações)." };

  const inicio = Date.now();
  const opcoes = { json: p.json, maxTokens: p.maxTokens ?? 1200 };
  let resposta: Resposta;
  try {
    try {
      resposta = await chamarModelo(provedor, modelo, chave, p.system, p.user, opcoes);
    } catch (primeiro) {
      const msg = primeiro instanceof Error ? primeiro.message : "";
      if (!/HTTP (400|404)/.test(msg) || !/model/i.test(msg)) throw primeiro;
      const alternativo = escolherModeloDisponivel(provedor, await listarModelos(provedor, chave));
      if (!alternativo || alternativo === modelo) throw primeiro;
      resposta = await chamarModelo(provedor, alternativo, chave, p.system, p.user, opcoes);
      modelo = alternativo;
    }
  } catch (e) {
    const detalhe = e instanceof Error ? (e.name === "AbortError" ? "tempo esgotado" : e.message) : "falha";
    return { ok: false, erro: `O provedor de IA não respondeu (${detalhe.slice(0, 160)}).` };
  }

  if (agente) {
    await admin.from("ai_agent_runs").insert({
      agent_id: agente.id,
      provedor,
      modelo,
      tokens_in: resposta.tokensIn,
      tokens_out: resposta.tokensOut,
      custo_usd: custoEstimadoUsd(modelo, resposta.tokensIn, resposta.tokensOut),
      latencia_ms: Date.now() - inicio,
      motivo_parada: null,
    });
  }
  if (!resposta.texto) return { ok: false, erro: "A IA devolveu uma resposta vazia." };
  return { ok: true, texto: resposta.texto, provedor, modelo };
}

export type ResultadoTranscricao = { ok: true; texto: string; segundos: number } | { ok: false; erro: string };

/** Whisper cobra por minuto de áudio; valor aproximado, só para o painel de custo. */
const USD_POR_MINUTO_AUDIO = 0.006;

/**
 * Transcreve um áudio (recado do gestor) com a chave OpenAI do cofre. O
 * arquivo não é gravado: só o texto volta para a pessoa conferir. O custo
 * entra no teto mensal do agente da empresa.
 */
export async function transcreverAudio(p: {
  companyId: string;
  bytes: Uint8Array;
  mime: string;
  nome: string;
}): Promise<ResultadoTranscricao> {
  const admin = createAdminClient();
  const { data: agente } = await admin.from("ai_agents").select("id, teto_mensal_usd").eq("company_id", p.companyId).maybeSingle();
  if (agente) {
    const { data: runs } = await admin
      .from("ai_agent_runs")
      .select("custo_usd")
      .eq("agent_id", agente.id)
      .gte("created_at", inicioDoMes())
      .limit(5000);
    const gasto = (runs ?? []).reduce((s, r) => s + Number(r.custo_usd ?? 0), 0);
    if (gasto >= Number(agente.teto_mensal_usd)) {
      return { ok: false, erro: "O teto mensal de custo de IA foi atingido." };
    }
  }
  const chave = await chaveDoProvedor(p.companyId, "openai");
  if (!chave) return { ok: false, erro: "Não há chave da OpenAI cadastrada (Integrações) para transcrever áudio." };

  const form = new FormData();
  form.append("file", new Blob([p.bytes as BlobPart], { type: p.mime || "audio/ogg" }), p.nome || "audio.ogg");
  form.append("model", "whisper-1");
  form.append("language", "pt");
  form.append("response_format", "verbose_json");

  const inicio = Date.now();
  let r: Response;
  try {
    r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}` },
      body: form,
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    const tempo = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return {
      ok: false,
      erro: tempo ? "A transcrição demorou demais. Tente um áudio mais curto." : "Não foi possível falar com o provedor de voz.",
    };
  }
  if (!r.ok) {
    return { ok: false, erro: `O provedor de voz recusou o áudio (${await detalheDoErro(r)}).` };
  }
  const j = (await r.json()) as { text?: string; duration?: number };
  const texto = (j.text ?? "").trim();
  const segundos = Number.isFinite(j.duration) ? Number(j.duration) : 0;
  if (!texto) return { ok: false, erro: "Não consegui entender o áudio. Digite o recado ou grave de novo." };

  if (agente) {
    await admin.from("ai_agent_runs").insert({
      agent_id: agente.id,
      provedor: "openai",
      modelo: "whisper-1",
      tokens_in: 0,
      tokens_out: 0,
      custo_usd: Math.round((segundos / 60) * USD_POR_MINUTO_AUDIO * 10000) / 10000,
      latencia_ms: Date.now() - inicio,
      motivo_parada: "transcricao",
    });
  }
  return { ok: true, texto, segundos };
}
