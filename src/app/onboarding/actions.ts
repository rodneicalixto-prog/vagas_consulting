"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

export type HistoricoTerceirizadora = {
  empresa: string;
  periodo: string;
  liderDireto: string;
};

export type SaveProfileInput = {
  nomeCompleto: string;
  idade: string;
  cidade: string;
  telefone: string;
  endereco: string;
  modeloTrabalho: Enums<"modelo_trabalho">[];
  modalidades: Enums<"modalidade_vaga">[];
  disponibilidade: string;
  historicoTerceirizadoras: HistoricoTerceirizadora[];
};

export async function saveProfile(input: SaveProfileInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!input.nomeCompleto.trim() || !input.cidade.trim() || !input.telefone.trim() || !input.endereco.trim()) {
    throw new Error("Nome, cidade, telefone e endereço são obrigatórios.");
  }

  const camposPreenchidos = [
    input.nomeCompleto,
    input.idade,
    input.cidade,
    input.telefone,
    input.endereco,
    input.modeloTrabalho.length > 0,
    input.modalidades.length > 0,
    input.disponibilidade,
  ].filter(Boolean).length;
  const perfilCompletoPct = Math.round((camposPreenchidos / 8) * 100);

  await supabase.from("profiles").upsert({
    id: user.id,
    nome_completo: input.nomeCompleto,
    idade: input.idade ? Number(input.idade) : null,
    cidade: input.cidade,
    telefone: input.telefone,
    endereco: input.endereco,
    modelo_trabalho: input.modeloTrabalho,
    modalidades_desejadas: input.modalidades,
    disponibilidade: input.disponibilidade,
    historico_terceirizadoras: input.historicoTerceirizadoras,
    perfil_completo_pct: perfilCompletoPct,
  });

  redirect("/inicio");
}
