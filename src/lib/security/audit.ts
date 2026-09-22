import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditOptions {
  ator_id: string;
  acao: string;
  objeto_tipo: string;
  objeto_id: string;
  antes?: any;
  depois?: any;
  detalhes?: Record<string, any>;
}

export async function logAudit(options: AuditOptions): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from("audit_log").insert({
    ator_id: options.ator_id,
    acao: options.acao,
    objeto_tipo: options.objeto_tipo,
    objeto_id: options.objeto_id,
    antes: options.antes || null,
    depois: options.depois || null,
    detalhes: options.detalhes || null,
    criado_em: new Date().toISOString(),
  });

  if (error) {
    console.error("Erro ao registrar auditoria:", error);
    throw new Error("Falha ao registrar ação na auditoria");
  }
}

export async function logDelete(options: Omit<AuditOptions, "acao">): Promise<void> {
  await logAudit({
    ...options,
    acao: `${options.objeto_tipo}_deletado`,
  });
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  acao?: string;
  objeto_tipo?: string;
  ator_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

export async function getAuditLogs(query: AuditLogQuery) {
  const admin = createAdminClient();
  const page = query.page || 1;
  const limit = Math.min(query.limit || 50, 100);
  const offset = (page - 1) * limit;

  let q = admin.from("audit_log").select("*", { count: "exact" });

  if (query.acao) q = q.eq("acao", query.acao);
  if (query.objeto_tipo) q = q.eq("objeto_tipo", query.objeto_tipo);
  if (query.ator_id) q = q.eq("ator_id", query.ator_id);
  if (query.data_inicio) q = q.gte("criado_em", query.data_inicio);
  if (query.data_fim) q = q.lte("criado_em", query.data_fim);

  const { data, error, count } = await q
    .order("criado_em", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    logs: data || [],
    total: count || 0,
    page,
    limit,
    pages: Math.ceil((count || 0) / limit),
  };
}

export function auditLogsToCSV(logs: any[]): string {
  const headers = ["Data", "Ação", "Tipo", "ID", "Ator", "Detalhes"];
  const rows = logs.map((log) => [
    new Date(log.criado_em).toLocaleString("pt-BR"),
    log.acao,
    log.objeto_tipo,
    log.objeto_id,
    log.ator_id,
    log.detalhes ? JSON.stringify(log.detalhes) : "",
  ]);

  const csv = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csv;
}
