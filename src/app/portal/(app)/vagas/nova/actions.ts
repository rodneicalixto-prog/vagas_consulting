"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type NovaVagaState = { error: string | null };

export async function solicitarVaga(
  _prevState: NovaVagaState,
  formData: FormData,
): Promise<NovaVagaState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Sessão expirada. Entre novamente." };

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return { error: "Conta sem empresa vinculada." };

  const titulo = String(formData.get("titulo") ?? "").trim();
  const modalidade = String(formData.get("modalidade") ?? "");
  const local = String(formData.get("local") ?? "").trim();
  const modelo_trabalho = String(formData.get("modelo_trabalho") ?? "") || null;
  const remuneracao_texto = String(formData.get("remuneracao_texto") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const requisitos = String(formData.get("requisitos") ?? "").trim();
  const etapas = String(formData.get("etapas") ?? "").trim();

  if (!titulo || !modalidade) {
    return { error: "Preencha ao menos título e modalidade." };
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      company_id: membership.company_id,
      titulo,
      modalidade: modalidade as "efetiva" | "pj" | "temporaria",
      local: local || null,
      modelo_trabalho: modelo_trabalho as "presencial" | "hibrido" | "remoto" | null,
      remuneracao_texto: remuneracao_texto || null,
      descricao: descricao || null,
      requisitos: requisitos || null,
      regras: etapas ? { etapas } : {},
      status: "revisao",
      responsavel_id: user.id,
    })
    .select("id")
    .single();

  if (error || !job) {
    return { error: "Não foi possível enviar a solicitação. Tente de novo." };
  }

  redirect(`/portal/vagas/${job.id}`);
}
