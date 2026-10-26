import { registrarRespostaDoProspect } from "@/lib/hunter-servidor";
import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gerarSugestao } from "@/lib/agente-servidor";
import {
  apikeyDaPlataforma,
  baixarMidia,
  empresaDaInstancia,
  tokenDaInstancia,
} from "@/lib/evolution";
import { configEvolutionDaLinha, linhaDaInstancia, type Linha } from "@/lib/linhas-servidor";
import {
  TAMANHO_MAX_ANEXO,
  detectarMidia,
  ehPedidoDeSaida,
  extensaoDoMime,
  extrairTexto,
  nomeSeguro,
  previa,
  rotuloAnexo,
  telefoneDeJid,
  tipoDoAnexo,
  type MidiaDetectada,
} from "@/lib/conversas";
import { normalizarTelefoneBR } from "@/lib/whatsapp";

/**
 * Webhook da Evolution API (WhatsApp) → inbox de conversas.
 * Spec: docs/specs/COMUNICACAO_OMNICANAL.md §5-§7.
 *
 * - Autenticação pela apikey da plataforma (cabeçalho `apikey` ou campo do corpo).
 * - Idempotente: o índice único (conversation_id, provedor_msg_id) barra reentregas.
 * - Sem chamadas externas: só banco. Nunca loga apikey nem corpo.
 */

// Baixar a mídia da Evolution e guardá-la pode levar alguns segundos.
export const maxDuration = 30;

const SEM_DETALHE = { ok: false } as const;

type Admin = ReturnType<typeof createAdminClient>;

function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function normalizarEvento(ev: unknown): string {
  return typeof ev === "string" ? ev.trim().toLowerCase().replace(/_/g, ".") : "";
}

function paraLista(data: unknown): Record<string, unknown>[] {
  const itens = Array.isArray(data) ? data : data ? [data] : [];
  return itens.filter((i): i is Record<string, unknown> => !!i && typeof i === "object");
}

/** messageTimestamp vem em segundos (número, texto ou {low}); inválido → agora. */
function instanteDaMensagem(ts: unknown): string {
  let n: number | null = null;
  if (typeof ts === "number") n = ts;
  else if (typeof ts === "string" && /^\d+$/.test(ts)) n = Number(ts);
  else if (ts && typeof ts === "object" && typeof (ts as { low?: unknown }).low === "number") {
    n = (ts as { low: number }).low;
  }
  if (n !== null && n > 1_000_000_000 && n < 100_000_000_000) {
    const d = new Date(n * 1000);
    // Não aceita datas no futuro além de 1 dia (relógio errado).
    if (d.getTime() <= Date.now() + 86_400_000) return d.toISOString();
  }
  return new Date().toISOString();
}

/** Acha ou cria a conversa (empresa, whatsapp, telefone, linha). */
async function obterConversa(
  admin: Admin,
  companyId: string,
  telefone: string,
  nome: string | null,
  linha: Linha | null,
): Promise<{ id: string; nao_lidas: number; candidate_id: string | null; nome_contato: string | null } | null> {
  const buscar = async () => {
    let q = admin
      .from("conversations")
      .select("id, nao_lidas, candidate_id, nome_contato")
      .eq("company_id", companyId)
      .eq("canal", "whatsapp")
      .eq("telefone_normalizado", telefone);
    q = linha ? q.eq("line_id", linha.id) : q.is("line_id", null);
    const { data } = await q.maybeSingle();
    return data ?? null;
  };

  let conversa = await buscar();
  if (!conversa) {
    const { error } = await admin.from("conversations").insert({
      company_id: companyId,
      canal: "whatsapp",
      telefone_normalizado: telefone,
      nome_contato: nome,
      line_id: linha?.id ?? null,
      // Linha dedicada: a conversa já nasce do operador dono do número.
      ...(linha?.operador_id ? { atendente_id: linha.operador_id, atribuida_em: new Date().toISOString() } : {}),
    });
    // 23505: outra requisição criou no meio; relê.
    if (error && error.code !== "23505") throw error;
    conversa = await buscar();
  } else if (!conversa.nome_contato && nome) {
    await admin.from("conversations").update({ nome_contato: nome }).eq("id", conversa.id);
    conversa = { ...conversa, nome_contato: nome };
  }
  return conversa;
}

/** Vincula candidato só se houver exatamente um perfil com esse telefone. */
async function candidatoPorTelefone(admin: Admin, telefone: string): Promise<string | null> {
  // O telefone pode estar formatado ("(11) 99999-9999"); os 4 últimos dígitos
  // são contíguos em qualquer formato usual, então servem de pré-filtro.
  const finais = telefone.slice(-4);
  const { data } = await admin
    .from("profiles")
    .select("id, telefone")
    .ilike("telefone", `%${finais}%`)
    .limit(200);
  const achados = (data ?? []).filter((p) => normalizarTelefoneBR(p.telefone) === telefone);
  return achados.length === 1 ? achados[0].id : null;
}

/**
 * Baixa a mídia recebida e guarda no bucket privado. Falhar aqui não derruba
 * o webhook: a mensagem já está registrada e aparece sem o arquivo.
 */
async function guardarMidia(
  admin: Admin,
  companyId: string,
  conversaId: string,
  mensagemId: string,
  provedorId: string | null,
  item: Record<string, unknown>,
  midia: MidiaDetectada,
  linha: Linha | null,
) {
  try {
    const inline = (item.message as { base64?: unknown } | null)?.base64;
    let base64 = typeof inline === "string" && inline ? inline.replace(/^data:[^;]+;base64,/, "") : null;
    let mime = midia.mime;
    let nome = midia.nome;
    if (!base64) {
      if (!provedorId) return;
      const cfg = await configEvolutionDaLinha(linha, companyId);
      if (!cfg.ok) return;
      const baixada = await baixarMidia(cfg.config, provedorId);
      if (!baixada) return;
      base64 = baixada.base64;
      mime = mime ?? baixada.mime;
      nome = nome ?? baixada.nome;
    }
    const tipo = tipoDoAnexo(mime);
    if (!tipo || !mime) return;
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length === 0 || bytes.length > TAMANHO_MAX_ANEXO) return;

    const contentType = mime.split(";")[0].trim().toLowerCase();
    const arquivo = (nome ?? `${tipo}.${extensaoDoMime(mime)}`).replace(/[\\/]/g, "_").slice(0, 100);
    const path = `${companyId}/${conversaId}/${mensagemId}-${nomeSeguro(arquivo)}`;
    const { error } = await admin.storage
      .from("conversas-anexos")
      .upload(path, bytes, { contentType, upsert: true });
    if (error) return;
    await admin
      .from("conversation_messages")
      .update({ tipo, anexo_path: path, anexo_nome: arquivo, anexo_mime: contentType, anexo_tamanho: bytes.length })
      .eq("id", mensagemId);
  } catch {
    // mensagem preservada sem o arquivo
  }
}

async function tratarMensagem(admin: Admin, companyId: string, item: Record<string, unknown>, linha: Linha | null) {
  const key = (item.key ?? {}) as { remoteJid?: unknown; fromMe?: unknown; id?: unknown };
  if (key.fromMe === true) return; // saídas passam pelo nosso sistema
  const telefone = telefoneDeJid(key.remoteJid);
  const midia = detectarMidia(item.message);
  const texto = midia ? rotuloAnexo(midia.tipo, midia.nome, midia.legenda) : extrairTexto(item.message);
  if (!telefone || !texto) return;

  const pushName = typeof item.pushName === "string" && item.pushName.trim() ? item.pushName.trim().slice(0, 120) : null;
  const conversa = await obterConversa(admin, companyId, telefone, pushName, linha);
  if (!conversa) return;

  // Descadastro primeiro e de forma idempotente: mesmo que o resto falhe ou a
  // mensagem chegue repetida, o pedido do titular nunca fica sem registro.
  const pediuSaida = ehPedidoDeSaida(texto);
  if (pediuSaida) {
    const { error: errOpt } = await admin.from("channel_opt_outs").insert({
      company_id: companyId,
      canal: "whatsapp",
      telefone_normalizado: telefone,
      motivo: "pedido do titular (SAIR)",
    });
    if (errOpt && errOpt.code !== "23505") throw errOpt;
  }

  // Número abordado pelo hunter: marca "respondeu" ou, se pediu SAIR, apaga os dados e bloqueia.
  await registrarRespostaDoProspect(telefone, pediuSaida);

  const provedorId = typeof key.id === "string" && key.id ? key.id.slice(0, 200) : null;
  const { data: nova, error: errMsg } = await admin
    .from("conversation_messages")
    .insert({
      conversation_id: conversa.id,
      direcao: "entrada",
      autor: "candidato",
      texto,
      tipo: midia?.tipo ?? "texto",
      provedor_msg_id: provedorId,
      status: "recebida",
    })
    .select("id")
    .single();
  if (errMsg) {
    if (errMsg.code === "23505") return; // reentrega: já processada
    throw errMsg;
  }

  const atualizacao: {
    ultima_msg_em: string;
    ultima_msg_previa: string;
    nao_lidas: number;
    candidate_id?: string;
  } = {
    ultima_msg_em: instanteDaMensagem(item.messageTimestamp),
    ultima_msg_previa: previa(texto),
    nao_lidas: (conversa.nao_lidas ?? 0) + 1,
  };
  if (!conversa.candidate_id) {
    const candidato = await candidatoPorTelefone(admin, telefone);
    if (candidato) atualizacao.candidate_id = candidato;
  }
  await admin.from("conversations").update(atualizacao).eq("id", conversa.id);

  if (midia && nova) await guardarMidia(admin, companyId, conversa.id, nova.id, provedorId, item, midia, linha);

  // Sugestão do agente (modo sugestão): roda depois da resposta ao webhook.
  if (!midia && !pediuSaida && nova) {
    const conversaId = conversa.id;
    const mensagemId = nova.id;
    after(async () => {
      try {
        await gerarSugestao(conversaId, mensagemId);
      } catch {
        // o inbox segue sem a sugestão
      }
    });
  }

  if (pediuSaida) {
    await admin.from("conversation_messages").insert({
      conversation_id: conversa.id,
      direcao: "saida",
      autor: "sistema",
      texto: "Pedido de descadastro registrado. Esta pessoa não receberá novas mensagens.",
      status: "enviada",
    });
    await admin.from("audit_log").insert({
      ator_id: null,
      acao: "whatsapp_descadastro",
      objeto_tipo: "conversation",
      objeto_id: conversa.id,
    });
  }
}

const ORDEM_STATUS: Record<string, number> = { enviada: 1, entregue: 2, lida: 3 };

async function tratarStatus(admin: Admin, companyId: string, item: Record<string, unknown>) {
  const key = (item.key ?? {}) as { id?: unknown };
  const id = typeof item.keyId === "string" ? item.keyId : typeof key.id === "string" ? key.id : null;
  const bruto = typeof item.status === "string" ? item.status.toUpperCase() : "";
  const novo = bruto === "DELIVERY_ACK" ? "entregue" : bruto === "READ" ? "lida" : null;
  if (!id || !novo) return;

  const { data: msgs } = await admin
    .from("conversation_messages")
    .select("id, status, conversation_id, direcao")
    .eq("provedor_msg_id", id)
    .eq("direcao", "saida")
    .limit(5);
  for (const m of msgs ?? []) {
    if ((ORDEM_STATUS[m.status] ?? 0) >= ORDEM_STATUS[novo]) continue; // nunca regride
    // Só mexe em mensagem de conversa desta empresa.
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", m.conversation_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!conv) continue;
    await admin.from("conversation_messages").update({ status: novo }).eq("id", m.id);
  }
}

export async function POST(request: NextRequest) {
  try {
    let corpo: Record<string, unknown>;
    try {
      const j = await request.json();
      if (!j || typeof j !== "object" || Array.isArray(j)) return NextResponse.json(SEM_DETALHE, { status: 400 });
      corpo = j as Record<string, unknown>;
    } catch {
      return NextResponse.json(SEM_DETALHE, { status: 400 });
    }

    const instancia = typeof corpo.instance === "string" ? corpo.instance : "";
    const recebidas = [request.headers.get("apikey"), typeof corpo.apikey === "string" ? corpo.apikey : null].filter(
      (v): v is string => !!v,
    );
    // Aceita a chave global (cabeçalho) ou o token da própria instância, que é
    // o que a Evolution envia no corpo do webhook.
    const esperada = await apikeyDaPlataforma();
    let autenticado = !!esperada && recebidas.some((r) => iguais(r, esperada));
    if (!autenticado && instancia && recebidas.length > 0) {
      const tokenInstancia = await tokenDaInstancia(instancia);
      autenticado = !!tokenInstancia && recebidas.some((r) => iguais(r, tokenInstancia));
    }
    if (!autenticado) return NextResponse.json(SEM_DETALHE, { status: 401 });

    const evento = normalizarEvento(corpo.event);
    if (evento !== "messages.upsert" && evento !== "messages.update") {
      return NextResponse.json({ ok: true, ignorado: true });
    }

    // A instância pertence a uma linha (uma empresa pode ter várias); sem linha, cadastro antigo.
    const linha = instancia ? await linhaDaInstancia(instancia) : null;
    const companyId = linha?.company_id ?? (instancia ? await empresaDaInstancia(instancia) : null);
    if (!companyId) return NextResponse.json({ ok: true, ignorado: true });

    const admin = createAdminClient();
    for (const item of paraLista(corpo.data)) {
      if (evento === "messages.upsert") await tratarMensagem(admin, companyId, item, linha);
      else await tratarStatus(admin, companyId, item);
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Sem detalhes: nada de apikey, corpo ou mensagem de erro na resposta.
    return NextResponse.json(SEM_DETALHE, { status: 500 });
  }
}
