import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decifrar } from "@/lib/crypto-segredos";
import { bloqueadoNaEmpresa } from "@/lib/blacklist-empresa";
import { STATUS_CANDIDATURA_EM_ABERTO } from "@/lib/format";
import { normalizarTelefoneBR } from "@/lib/whatsapp";
import {
  MODELO_PADRAO,
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

async function chamarModelo(
  provedor: ProvedorAgente,
  modelo: string,
  chave: string,
  system: string,
  user: string,
): Promise<Resposta> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 20_000);
  try {
    if (provedor === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: modelo, max_tokens: 400, temperature: 0.3, system, messages: [{ role: "user", content: user }] }),
        signal: c.signal,
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
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
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: c.signal,
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
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
      .select("id, company_id, candidate_id, telefone_normalizado")
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

  // 1) Assunto de risco: vai direto para a pessoa, sem chamar a IA.
  const risco = assuntoDeRisco(msg.texto);
  if (risco) {
    await registrar("", `risco_${risco}`);
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
    return;
  }

  const hist = (historico ?? [])
    .filter((h) => h.tipo === "texto" && h.autor !== "sistema")
    .reverse()
    .map((h) => ({
      autor: (h.direcao === "entrada" ? "candidato" : "atendente") as "candidato" | "atendente",
      texto: h.texto,
    }));

  const { system, user } = montarPrompt({
    nomeAgente: agente.nome,
    tom: agente.tom,
    roteiro: agente.roteiro,
    notas: notas ?? [],
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
      modelo,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      custo_usd: tokensIn !== null && tokensOut !== null ? custoEstimadoUsd(modelo, tokensIn, tokensOut) : null,
      latencia_ms: Date.now() - inicio,
      motivo_parada: motivo,
    });
  };

  if (!chave) {
    await registrarRun(null, "sem_chave", null, null);
    return;
  }

  let resposta: Resposta;
  try {
    resposta = await chamarModelo(provedor, modelo, chave, system, user);
  } catch {
    await registrarRun(null, "erro_provedor", null, null);
    return;
  }

  const texto = resposta.texto;
  if (!texto || texto.includes(SINAL_ENCAMINHAR)) {
    const id = await registrar("", "sem_fonte");
    await registrarRun(id, "sem_fonte", resposta.tokensIn, resposta.tokensOut);
    return;
  }

  const fonte = (notas ?? []).map((n) => n.titulo).slice(0, 20);
  if (vaga) fonte.unshift(`Vaga: ${vaga.titulo}`);
  const id = await registrar(texto.slice(0, 1500), null, { fonte });
  await registrarRun(id, null, resposta.tokensIn, resposta.tokensOut);
}
