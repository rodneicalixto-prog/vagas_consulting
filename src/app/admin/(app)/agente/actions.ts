"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { empresaDaOperacao } from "@/lib/evolution";
import {
  LIMITE_ROTEIRO,
  provedorAgenteValido,
  tipoNotaValido,
  tomValido,
  validarNota,
} from "@/lib/agente";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Passo 3A: só o superadmin, e só na empresa da operação (piloto). */
async function contexto() {
  const { user, role } = await requireInternalUser();
  if (role !== "superadmin") redirect("/admin/acesso-negado");
  const operacaoId = await empresaDaOperacao();
  if (!operacaoId) throw new Error("A empresa da operação ainda não foi definida na plataforma.");
  return { user, admin: createAdminClient(), companyId: operacaoId };
}

async function auditar(
  admin: ReturnType<typeof createAdminClient>,
  atorId: string,
  acao: string,
  objetoTipo: string,
  objetoId: string | null,
  depois: { company_id: string; titulo?: string; tipo?: string; status?: string; versao?: number; ativo?: boolean },
) {
  await admin.from("audit_log").insert({ ator_id: atorId, acao, objeto_tipo: objetoTipo, objeto_id: objetoId, depois });
}

export async function criarAgente() {
  const { user, admin, companyId } = await contexto();
  const { data: existente } = await admin.from("ai_agents").select("id").eq("company_id", companyId).maybeSingle();
  if (existente) return;
  const { data, error } = await admin
    .from("ai_agents")
    .insert({ company_id: companyId, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) throw new Error("Não foi possível criar o agente.");
  await auditar(admin, user.id, "agente_criado", "ai_agent", data.id, { company_id: companyId });
  revalidatePath("/admin/agente");
}

export async function salvarAgente(formData: FormData) {
  const { user, admin, companyId } = await contexto();
  const nome = String(formData.get("nome") ?? "").trim();
  const tom = String(formData.get("tom") ?? "");
  const provedor = String(formData.get("provedor") ?? "");
  const modelo = String(formData.get("modelo") ?? "").trim().slice(0, 80);
  const roteiro = String(formData.get("roteiro") ?? "");
  const ativo = formData.get("ativo") === "sim";
  const autonomia = String(formData.get("autonomia") ?? "0") === "2" ? 2 : 0;

  if (nome.length < 2 || nome.length > 60) throw new Error("O nome do agente deve ter de 2 a 60 caracteres.");
  if (!tomValido(tom)) throw new Error("Tom inválido.");
  if (!provedorAgenteValido(provedor)) throw new Error("Provedor inválido.");
  if (roteiro.length > LIMITE_ROTEIRO) throw new Error("O roteiro está longo demais.");

  const { data, error } = await admin
    .from("ai_agents")
    .update({
      nome,
      tom,
      provedor,
      modelo: modelo || null,
      roteiro,
      ativo,
      nivel_autonomia: autonomia,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .select("id");
  if (error || !data || data.length === 0) throw new Error("Não foi possível salvar o agente.");

  await auditar(admin, user.id, "agente_atualizado", "ai_agent", data[0].id, { company_id: companyId, ativo });
  revalidatePath("/admin/agente");
}

/** Cria ou edita uma nota. Editar nota aprovada devolve para rascunho (nova aprovação). */
export async function salvarNota(formData: FormData) {
  const { user, admin, companyId } = await contexto();
  const id = String(formData.get("id") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const corpo_md = String(formData.get("corpo_md") ?? "");

  const validaBruta = String(formData.get("valida_ate") ?? "").trim();
  const valida_ate = /^\d{4}-\d{2}-\d{2}$/.test(validaBruta) ? validaBruta : null;
  const donoBruto = String(formData.get("dono_id") ?? "").trim();
  const dono_id = UUID.test(donoBruto) ? donoBruto : user.id;

  const erro = validarNota({ titulo, tipo, corpo_md });
  if (erro) throw new Error(erro);
  if (!tipoNotaValido(tipo)) throw new Error("Tipo de nota inválido.");

  if (!id) {
    const { data, error } = await admin
      .from("ai_knowledge_notes")
      .insert({ company_id: companyId, tipo, titulo, corpo_md, criado_por: user.id, valida_ate, dono_id })
      .select("id")
      .single();
    if (error || !data) throw new Error("Não foi possível criar a nota.");
    await auditar(admin, user.id, "nota_agente_criada", "ai_knowledge_note", data.id, {
      company_id: companyId,
      titulo,
      tipo,
    });
  } else {
    if (!UUID.test(id)) throw new Error("Nota inválida.");
    const { data: atual } = await admin
      .from("ai_knowledge_notes")
      .select("id, versao, status")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!atual) throw new Error("Nota não encontrada.");
    const { error } = await admin
      .from("ai_knowledge_notes")
      .update({
        titulo,
        tipo,
        corpo_md,
        valida_ate,
        dono_id,
        versao: atual.versao + 1,
        status: atual.status === "aprovada" ? "rascunho" : atual.status,
        aprovada_por: null,
        aprovada_em: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", companyId);
    if (error) throw new Error("Não foi possível salvar a nota.");
    await auditar(admin, user.id, "nota_agente_atualizada", "ai_knowledge_note", id, {
      company_id: companyId,
      titulo,
      tipo,
      versao: atual.versao + 1,
    });
  }
  revalidatePath("/admin/agente");
}

/** Aprova de uma vez as lições candidatas (origem aprendizado) em rascunho. */
export async function aprovarLicoes() {
  const { user, admin, companyId } = await contexto();
  const agora = new Date().toISOString();
  const { data } = await admin
    .from("ai_knowledge_notes")
    .update({ status: "aprovada", aprovada_por: user.id, aprovada_em: agora, updated_at: agora })
    .eq("company_id", companyId)
    .eq("tipo", "licao")
    .eq("origem", "aprendizado")
    .eq("status", "rascunho")
    .select("id");
  await auditar(admin, user.id, "licoes_aprovadas_em_lote", "ai_knowledge_note", null, {
    company_id: companyId,
    versao: data?.length ?? 0,
  });
  revalidatePath("/admin/agente");
}

/** Aprovar, arquivar ou reabrir (volta a rascunho). */
export async function mudarStatusNota(formData: FormData) {
  const { user, admin, companyId } = await contexto();
  const id = String(formData.get("id") ?? "");
  const acao = String(formData.get("acao") ?? "");
  if (!UUID.test(id)) throw new Error("Nota inválida.");
  const novo = acao === "aprovar" ? "aprovada" : acao === "arquivar" ? "arquivada" : acao === "reabrir" ? "rascunho" : null;
  if (!novo) throw new Error("Ação inválida.");

  if (novo === "aprovada") {
    const { data: n } = await admin
      .from("ai_knowledge_notes")
      .select("valida_ate")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (n?.valida_ate && n.valida_ate < new Date().toISOString().slice(0, 10)) {
      throw new Error("A nota está vencida: renove a data em \"Vale até\" antes de aprovar.");
    }
  }

  const agora = new Date().toISOString();
  const { data, error } = await admin
    .from("ai_knowledge_notes")
    .update({
      status: novo,
      aprovada_por: novo === "aprovada" ? user.id : null,
      aprovada_em: novo === "aprovada" ? agora : null,
      updated_at: agora,
    })
    .eq("id", id)
    .eq("company_id", companyId)
    .select("id, titulo, tipo");
  if (error || !data || data.length === 0) throw new Error("Não foi possível atualizar a nota.");

  await auditar(admin, user.id, `nota_agente_${novo}`, "ai_knowledge_note", id, {
    company_id: companyId,
    titulo: data[0].titulo,
    tipo: data[0].tipo,
    status: novo,
  });
  revalidatePath("/admin/agente");
}
