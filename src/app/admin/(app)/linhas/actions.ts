"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirEmpresa, obterEscopo } from "@/lib/auth/escopo";
import {
  criarInstanciaNaEvolution,
  desconectarInstancia,
  estadoDaInstancia,
  linhaPorId,
  qrDaInstancia,
  religarWebhook,
} from "@/lib/linhas-servidor";
import { modoPadrao, modoValido, nomeDaInstancia, podeCriarLinha, validarApelido } from "@/lib/linhas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GESTAO = ["superadmin", "admin_empresa"];

function ehRedirect(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

async function urlDoWebhook(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}/api/webhooks/evolution`;
}

async function contextoGestao() {
  const { user, role } = await requireInternalUser();
  if (!GESTAO.includes(role)) return null;
  return { user, role, escopo: await obterEscopo(user.id, role), admin: createAdminClient() };
}

export type EstadoLinha = { erro: string | null; ok: boolean; id: string | null; info?: string | null };

/** Cria a linha: instância na Evolution, webhook ligado e registro no banco. */
export async function criarLinha(_a: EstadoLinha, formData: FormData): Promise<EstadoLinha> {
  const falha = (erro: string): EstadoLinha => ({ erro, ok: false, id: null });
  try {
    const ctx = await contextoGestao();
    if (!ctx) return falha("Sem permissão para criar números de WhatsApp.");
    const companyId = String(formData.get("company_id") ?? "");
    if (!UUID.test(companyId)) return falha("Empresa inválida.");
    exigirEmpresa(ctx.escopo, companyId);

    const apelido = String(formData.get("apelido") ?? "").trim();
    const erroApelido = validarApelido(apelido);
    if (erroApelido) return falha(erroApelido);

    const operadorBruto = String(formData.get("operador_id") ?? "");
    const operadorId = UUID.test(operadorBruto) ? operadorBruto : null;
    if (operadorId) {
      const { data: vinculo } = await ctx.admin
        .from("company_assignments")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", operadorId)
        .eq("ativo", true)
        .maybeSingle();
      if (!vinculo) return falha("Este operador não está ativo nesta empresa.");
      const { data: jaTem } = await ctx.admin
        .from("whatsapp_lines")
        .select("id")
        .eq("company_id", companyId)
        .eq("operador_id", operadorId)
        .eq("ativa", true)
        .maybeSingle();
      if (jaTem) return falha("Este operador já tem um número ativo.");
    }
    const modoBruto = String(formData.get("agente") ?? "");
    const agente = modoValido(modoBruto) ? modoBruto : modoPadrao(operadorId);

    const [{ data: empresa }, { count: ativas }] = await Promise.all([
      ctx.admin.from("companies").select("nome_fantasia, razao_social, max_linhas_whatsapp").eq("id", companyId).maybeSingle(),
      ctx.admin.from("whatsapp_lines").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("ativa", true),
    ]);
    if (!empresa) return falha("Empresa não encontrada.");
    const limite = podeCriarLinha({ role: ctx.role, ativas: ativas ?? 0, max: empresa.max_linhas_whatsapp ?? 1 });
    if (!limite.ok) return falha(limite.motivo ?? "Limite de números atingido.");

    const nome = nomeDaInstancia(
      empresa.nome_fantasia || empresa.razao_social || "empresa",
      apelido,
      randomBytes(3).toString("hex"),
    );
    const criada = await criarInstanciaNaEvolution(nome, await urlDoWebhook());
    if (!criada.ok) return falha(criada.erro);

    const { data: nova, error } = await ctx.admin
      .from("whatsapp_lines")
      .insert({
        company_id: companyId,
        instance: nome,
        apelido,
        operador_id: operadorId,
        agente,
        padrao: (ativas ?? 0) === 0,
        criado_por: ctx.user.id,
      })
      .select("id")
      .single();
    if (error || !nova) return falha("A instância foi criada, mas não foi possível registrar o número. Tente de novo.");

    await ctx.admin.from("audit_log").insert({
      ator_id: ctx.user.id,
      acao: "linha_whatsapp_criada",
      objeto_tipo: "company",
      objeto_id: companyId,
      depois: { line_id: nova.id, dedicada: !!operadorId, agente },
    });
    revalidatePath("/admin/linhas");
    return { erro: null, ok: true, id: nova.id };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível criar o número agora. Tente de novo.");
  }
}

async function linhaDoEscopo(lineId: string) {
  const ctx = await contextoGestao();
  if (!ctx || !UUID.test(lineId)) return null;
  const linha = await linhaPorId(lineId);
  if (!linha) return null;
  exigirEmpresa(ctx.escopo, linha.company_id);
  return { ...ctx, linha };
}

export type EstadoPainel = {
  erro: string | null;
  estado: string;
  rotulo: string;
  numero: string | null;
  qr: string | null;
  codigo: string | null;
};

const ROTULO: Record<string, string> = {
  conectada: "Conectada",
  conectando: "Aguardando o QR code",
  desconectada: "Desconectada",
  desconhecido: "Estado desconhecido",
};

/** Estado atual; com `qr`, também pede um QR novo (reconectar). */
export async function consultarLinha(lineId: string, comQr: boolean): Promise<EstadoPainel> {
  const vazio = (erro: string): EstadoPainel => ({ erro, estado: "desconhecido", rotulo: ROTULO.desconhecido, numero: null, qr: null, codigo: null });
  try {
    const ctx = await linhaDoEscopo(lineId);
    if (!ctx) return vazio("Número não encontrado.");
    const est = await estadoDaInstancia(ctx.linha.instance);
    let qr: string | null = null;
    let codigo: string | null = null;
    if (comQr && est.estado !== "conectada") {
      const r = await qrDaInstancia(ctx.linha.instance);
      if (r.ok) {
        qr = r.qr;
        codigo = r.codigo;
      } else {
        return { ...vazio(r.erro), estado: est.estado, rotulo: ROTULO[est.estado] };
      }
    }
    return { erro: est.erro ?? null, estado: est.estado, rotulo: ROTULO[est.estado], numero: est.numero, qr, codigo };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return vazio("Não foi possível consultar agora.");
  }
}

export async function desconectarLinha(lineId: string): Promise<{ ok: boolean; erro: string | null }> {
  try {
    const ctx = await linhaDoEscopo(lineId);
    if (!ctx) return { ok: false, erro: "Número não encontrado." };
    const r = await desconectarInstancia(ctx.linha.instance);
    if (!r.ok) return { ok: false, erro: r.erro ?? "Não foi possível desconectar." };
    await ctx.admin.from("audit_log").insert({
      ator_id: ctx.user.id,
      acao: "linha_whatsapp_desconectada",
      objeto_tipo: "company",
      objeto_id: ctx.linha.company_id,
      depois: { line_id: ctx.linha.id },
    });
    revalidatePath("/admin/linhas");
    return { ok: true, erro: null };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return { ok: false, erro: "Não foi possível desconectar agora." };
  }
}

export async function religarWebhookDaLinha(lineId: string): Promise<{ ok: boolean; erro: string | null }> {
  try {
    const ctx = await linhaDoEscopo(lineId);
    if (!ctx) return { ok: false, erro: "Número não encontrado." };
    const r = await religarWebhook(ctx.linha.instance, await urlDoWebhook());
    return { ok: r.ok, erro: r.ok ? null : r.erro ?? "Não foi possível ligar o webhook." };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return { ok: false, erro: "Não foi possível ligar o webhook agora." };
  }
}

/** Apelido, operador, modo do agente e ativação. Não mexe na instância. */
export async function salvarLinha(_a: EstadoLinha, formData: FormData): Promise<EstadoLinha> {
  const falha = (erro: string): EstadoLinha => ({ erro, ok: false, id: null });
  try {
    const lineId = String(formData.get("line_id") ?? "");
    const ctx = await linhaDoEscopo(lineId);
    if (!ctx) return falha("Número não encontrado.");

    const apelido = String(formData.get("apelido") ?? "").trim();
    const erroApelido = validarApelido(apelido);
    if (erroApelido) return falha(erroApelido);
    const modo = String(formData.get("agente") ?? "");
    if (!modoValido(modo)) return falha("Modo do agente inválido.");
    const operadorBruto = String(formData.get("operador_id") ?? "");
    const operadorId = UUID.test(operadorBruto) ? operadorBruto : null;
    const ativa = formData.get("ativa") === "sim";

    if (operadorId) {
      const { data: vinculo } = await ctx.admin
        .from("company_assignments")
        .select("id")
        .eq("company_id", ctx.linha.company_id)
        .eq("user_id", operadorId)
        .eq("ativo", true)
        .maybeSingle();
      if (!vinculo) return falha("Este operador não está ativo nesta empresa.");
      const { data: outra } = await ctx.admin
        .from("whatsapp_lines")
        .select("id")
        .eq("company_id", ctx.linha.company_id)
        .eq("operador_id", operadorId)
        .eq("ativa", true)
        .neq("id", ctx.linha.id)
        .maybeSingle();
      if (outra) return falha("Este operador já tem outro número ativo.");
    }

    const { error } = await ctx.admin
      .from("whatsapp_lines")
      .update({ apelido, agente: modo, operador_id: operadorId, ativa, updated_at: new Date().toISOString() })
      .eq("id", ctx.linha.id);
    if (error) return falha("Não foi possível salvar o número.");

    // Linha dedicada: conversas ainda sem dono vão para o operador. Com a opção
    // marcada, as que já tinham outro dono também (troca de responsável).
    let transferidas = 0;
    if (operadorId) {
      const agora = new Date().toISOString();
      await ctx.admin
        .from("conversations")
        .update({ atendente_id: operadorId, atribuida_em: agora })
        .eq("line_id", ctx.linha.id)
        .is("atendente_id", null);
      if (formData.get("transferir") === "sim") {
        const { data: movidas } = await ctx.admin
          .from("conversations")
          .update({ atendente_id: operadorId, atribuida_em: agora })
          .eq("line_id", ctx.linha.id)
          .not("atendente_id", "is", null)
          .neq("atendente_id", operadorId)
          .select("id");
        transferidas = movidas?.length ?? 0;
      }
    }
    await ctx.admin.from("audit_log").insert({
      ator_id: ctx.user.id,
      acao: "linha_whatsapp_atualizada",
      objeto_tipo: "company",
      objeto_id: ctx.linha.company_id,
      depois: { line_id: ctx.linha.id, dedicada: !!operadorId, agente: modo, ativa, transferidas },
    });
    revalidatePath("/admin/linhas");
    return {
      erro: null,
      ok: true,
      id: ctx.linha.id,
      info: transferidas > 0 ? `${transferidas} conversa(s) passaram para o novo operador.` : null,
    };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora.");
  }
}

/** Só a plataforma ajusta o limite de números da empresa (modelo de aluguel). */
export async function definirLimiteLinhas(_a: EstadoLinha, formData: FormData): Promise<EstadoLinha> {
  const falha = (erro: string): EstadoLinha => ({ erro, ok: false, id: null });
  try {
    const { user, role } = await requireInternalUser();
    if (role !== "superadmin") return falha("Só a plataforma ajusta o limite.");
    const companyId = String(formData.get("company_id") ?? "");
    const max = Number(formData.get("max"));
    if (!UUID.test(companyId) || !Number.isInteger(max) || max < 1 || max > 50) return falha("Informe um limite de 1 a 50.");
    const admin = createAdminClient();
    const { error } = await admin.from("companies").update({ max_linhas_whatsapp: max }).eq("id", companyId);
    if (error) return falha("Não foi possível salvar o limite.");
    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "linhas_limite_ajustado",
      objeto_tipo: "company",
      objeto_id: companyId,
      depois: { max },
    });
    revalidatePath("/admin/linhas");
    return { erro: null, ok: true, id: null };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora.");
  }
}
