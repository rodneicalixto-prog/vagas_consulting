"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirEmpresa, obterEscopo } from "@/lib/auth/escopo";
import {
  estadoPlanoValido,
  manualDeFormulario,
  metasDeFormulario,
  periodoDoMes,
  validarPlano,
} from "@/lib/indicadores";
import type { Json } from "@/lib/supabase/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ehRedirect(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function campos(formData: FormData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") o[k] = v;
  return o;
}

export type EstadoInd = { erro: string | null; ok: boolean; pendencias: string[] };
const falha = (erro: string, pendencias: string[] = []): EstadoInd => ({ erro, ok: false, pendencias });
const sucesso: EstadoInd = { erro: null, ok: true, pendencias: [] };

async function empresaPermitida(formData: FormData) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const companyId = String(formData.get("company_id") ?? "");
  if (!UUID.test(companyId)) return null;
  const escopo = await obterEscopo(user.id, role);
  exigirEmpresa(escopo, companyId);
  return { user, role, companyId };
}

export async function salvarMetas(_a: EstadoInd, formData: FormData): Promise<EstadoInd> {
  try {
    const ctx = await empresaPermitida(formData);
    if (!ctx) return falha("Empresa inválida.");
    const metas = metasDeFormulario(campos(formData));
    const admin = createAdminClient();
    const { error } = await admin.from("recruitment_goals").upsert(
      {
        company_id: ctx.companyId,
        metas: metas as unknown as Json,
        atualizado_por: ctx.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    );
    if (error) return falha("Não foi possível salvar as metas.");
    await admin.from("audit_log").insert({
      ator_id: ctx.user.id,
      acao: "indicadores_metas_salvas",
      objeto_tipo: "company",
      objeto_id: ctx.companyId,
      depois: metas as unknown as Json,
    });
    revalidatePath("/admin/indicadores");
    return sucesso;
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora.");
  }
}

export async function salvarManual(_a: EstadoInd, formData: FormData): Promise<EstadoInd> {
  try {
    const ctx = await empresaPermitida(formData);
    if (!ctx) return falha("Empresa inválida.");
    const per = periodoDoMes(String(formData.get("mes") ?? ""));
    if (!per) return falha("Mês inválido.");
    const valores = manualDeFormulario(campos(formData));
    const admin = createAdminClient();
    const { error } = await admin.from("recruitment_monthly").upsert(
      {
        company_id: ctx.companyId,
        periodo: per.inicioISO,
        valores: valores as unknown as Json,
        atualizado_por: ctx.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,periodo" },
    );
    if (error) return falha("Não foi possível salvar os números do mês.");
    revalidatePath("/admin/indicadores");
    return sucesso;
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora.");
  }
}

export async function criarPlano(_a: EstadoInd, formData: FormData): Promise<EstadoInd> {
  try {
    const ctx = await empresaPermitida(formData);
    if (!ctx) return falha("Empresa inválida.");
    const per = periodoDoMes(String(formData.get("mes") ?? ""));
    if (!per) return falha("Mês inválido.");
    const f = campos(formData);
    const admin = createAdminClient();
    const { count } = await admin
      .from("recruitment_action_plans")
      .select("id", { count: "exact", head: true })
      .eq("company_id", ctx.companyId)
      .eq("periodo", per.inicioISO)
      .in("estado", ["aberta", "em_andamento"]);
    const pend = validarPlano(
      { indicador: f.indicador ?? "", acao: f.acao ?? "", responsavel: f.responsavel ?? "", prazo: f.prazo ?? "" },
      count ?? 0,
    );
    if (pend.length > 0) return falha("O plano ainda não pode ser criado.", pend);

    const { error } = await admin.from("recruitment_action_plans").insert({
      company_id: ctx.companyId,
      periodo: per.inicioISO,
      indicador: f.indicador.trim().slice(0, 120),
      valor_texto: (f.valor_texto ?? "").trim().slice(0, 80),
      meta_texto: (f.meta_texto ?? "").trim().slice(0, 80),
      causa: (f.causa ?? "").trim().slice(0, 600),
      acao: f.acao.trim().slice(0, 800),
      responsavel: f.responsavel.trim().slice(0, 120),
      prazo: f.prazo,
      criado_por: ctx.user.id,
    });
    if (error) return falha("Não foi possível criar o plano.");
    revalidatePath("/admin/indicadores");
    return sucesso;
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora.");
  }
}

export async function atualizarPlano(_a: EstadoInd, formData: FormData): Promise<EstadoInd> {
  try {
    const ctx = await empresaPermitida(formData);
    if (!ctx) return falha("Empresa inválida.");
    const id = String(formData.get("plan_id") ?? "");
    const estado = String(formData.get("estado") ?? "");
    if (!UUID.test(id) || !estadoPlanoValido(estado)) return falha("Dados inválidos.");
    const funcionou = String(formData.get("o_que_funcionou") ?? "").trim().slice(0, 600);
    if (estado === "concluida" && funcionou.length < 5) {
      return falha("Ao concluir, registre o que funcionou (vira lição para a próxima vez).");
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from("recruitment_action_plans")
      .update({ estado, o_que_funcionou: funcionou, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", ctx.companyId);
    if (error) return falha("Não foi possível atualizar o plano.");
    revalidatePath("/admin/indicadores");
    return sucesso;
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora.");
  }
}
