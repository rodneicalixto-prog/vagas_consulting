"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

export async function criarCompromisso(formData: FormData) {
  const { user } = await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "interno");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const dataInicio = String(formData.get("data_inicio") ?? "");
  const horaInicio = String(formData.get("hora_inicio") ?? "");
  const dataFim = String(formData.get("data_fim") ?? "");
  const horaFim = String(formData.get("hora_fim") ?? "");
  const applicationId = String(formData.get("application_id") ?? "").trim();

  if (!titulo || !dataInicio || !horaInicio) {
    throw new Error("Preencha título, data e horário de início.");
  }

  const inicio = new Date(`${dataInicio}T${horaInicio}`).toISOString();
  const fim = dataFim && horaFim ? new Date(`${dataFim}T${horaFim}`).toISOString() : null;

  const { error } = await admin.from("compromissos").insert({
    responsavel_id: user.id,
    criado_por: user.id,
    titulo,
    tipo: tipo === "entrevista" ? "entrevista" : "interno",
    descricao: descricao || null,
    inicio,
    fim,
    application_id: tipo === "entrevista" && applicationId ? applicationId : null,
  });

  if (error) {
    throw new Error("Não foi possível criar o compromisso.");
  }

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/equipe");
}

export async function atualizarStatusCompromisso(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();

  const id = String(formData.get("compromisso_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !["agendado", "concluido", "cancelado"].includes(status)) {
    throw new Error("Dados inválidos.");
  }

  // Superadmin pode gerenciar o compromisso de qualquer um (visão de equipe);
  // admin/operador só o próprio.
  const query = admin.from("compromissos").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  const { error } = role === "superadmin" ? await query : await query.eq("responsavel_id", user.id);

  if (error) {
    throw new Error("Não foi possível atualizar o compromisso.");
  }

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/equipe");
}

export async function excluirCompromisso(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();

  const id = String(formData.get("compromisso_id") ?? "");
  if (!id) throw new Error("Compromisso inválido.");

  const query = admin.from("compromissos").delete().eq("id", id);
  const { error } = role === "superadmin" ? await query : await query.eq("responsavel_id", user.id);

  if (error) {
    throw new Error("Não foi possível excluir o compromisso.");
  }

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/agenda/equipe");
}
