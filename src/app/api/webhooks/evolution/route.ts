import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apikeyDaPlataforma, empresaDaInstancia } from "@/lib/evolution";
import { ehPedidoDeSaida, extrairTexto, previa, telefoneDeJid } from "@/lib/conversas";
import { normalizarTelefoneBR } from "@/lib/whatsapp";

/**
 * Webhook da Evolution API (WhatsApp) → inbox de conversas.
 * Spec: docs/specs/COMUNICACAO_OMNICANAL.md §5-§7.
 *
 * - Autenticação pela apikey da plataforma (cabeçalho `apikey` ou campo do corpo).
 * - Idempotente: o índice único (conversation_id, provedor_msg_id) barra reentregas.
 * - Sem chamadas externas: só banco. Nunca loga apikey nem corpo.
 */

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

/** Acha ou cria a conversa (company, whatsapp, telefone). */
async function obterConversa(
  admin: Admin,
  companyId: string,
  telefone: string,
  nome: string | null,
): Promise<{ id: string; nao_lidas: number; candidate_id: string | null; nome_contato: string | null } | null> {
  const buscar = async () => {
    const { data } = await admin
      .from("conversations")
      .select("id, nao_lidas, candidate_id, nome_contato")
      .eq("company_id", companyId)
      .eq("canal", "whatsapp")
      .eq("telefone_normalizado", telefone)
      .maybeSingle();
    return data ?? null;
  };

  let conversa = await buscar();
  if (!conversa) {
    const { error } = await admin.from("conversations").insert({
      company_id: companyId,
      canal: "whatsapp",
      telefone_normalizado: telefone,
      nome_contato: nome,
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

async function tratarMensagem(admin: Admin, companyId: string, item: Record<string, unknown>) {
  const key = (item.key ?? {}) as { remoteJid?: unknown; fromMe?: unknown; id?: unknown };
  if (key.fromMe === true) return; // saídas passam pelo nosso sistema
  const telefone = telefoneDeJid(key.remoteJid);
  const texto = extrairTexto(item.message);
  if (!telefone || !texto) return;

  const pushName = typeof item.pushName === "string" && item.pushName.trim() ? item.pushName.trim().slice(0, 120) : null;
  const conversa = await obterConversa(admin, companyId, telefone, pushName);
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

  const provedorId = typeof key.id === "string" && key.id ? key.id.slice(0, 200) : null;
  const { error: errMsg } = await admin.from("conversation_messages").insert({
    conversation_id: conversa.id,
    direcao: "entrada",
    autor: "candidato",
    texto,
    provedor_msg_id: provedorId,
    status: "recebida",
  });
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

    const esperada = await apikeyDaPlataforma();
    const recebidas = [request.headers.get("apikey"), typeof corpo.apikey === "string" ? corpo.apikey : null].filter(
      (v): v is string => !!v,
    );
    if (!esperada || !recebidas.some((r) => iguais(r, esperada))) {
      return NextResponse.json(SEM_DETALHE, { status: 401 });
    }

    const evento = normalizarEvento(corpo.event);
    const instancia = typeof corpo.instance === "string" ? corpo.instance : "";
    if (evento !== "messages.upsert" && evento !== "messages.update") {
      return NextResponse.json({ ok: true, ignorado: true });
    }

    const companyId = instancia ? await empresaDaInstancia(instancia) : null;
    if (!companyId) return NextResponse.json({ ok: true, ignorado: true });

    const admin = createAdminClient();
    for (const item of paraLista(corpo.data)) {
      if (evento === "messages.upsert") await tratarMensagem(admin, companyId, item);
      else await tratarStatus(admin, companyId, item);
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Sem detalhes: nada de apikey, corpo ou mensagem de erro na resposta.
    return NextResponse.json(SEM_DETALHE, { status: 500 });
  }
}
