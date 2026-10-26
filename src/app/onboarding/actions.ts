"use server";

import { origemParaCadastro } from "@/lib/origem-servidor";
import { redirect } from "next/navigation";
import { consumirDestino } from "@/lib/destino-cookie";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";
import { avaliarPerfil } from "@/lib/perfil";

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

  // Mesma função usada nas telas (o valor gravado é só um espelho; as telas
  // calculam na hora). No onboarding ainda não há experiência informada.
  const perfilCompletoPct = avaliarPerfil({
    nome_completo: input.nomeCompleto,
    idade: input.idade ? Number(input.idade) : null,
    cidade: input.cidade,
    telefone: input.telefone,
    endereco: input.endereco,
    modelo_trabalho: input.modeloTrabalho,
    modalidades_desejadas: input.modalidades,
    disponibilidade: input.disponibilidade,
  }).pct;

  // Primeiro toque: grava só se o perfil ainda não tem origem (nunca sobrescreve).
  const { data: atual } = await supabase.from("profiles").select("origem_canal").eq("id", user.id).maybeSingle();
  const origemCampos = atual?.origem_canal
    ? {}
    : await origemParaCadastro().then((o) => ({ origem_canal: o.canal, origem_detalhe: o.detalhe, origem_em: new Date().toISOString() }));

  await supabase.from("profiles").upsert({
    id: user.id,
    ...origemCampos,
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

  // Cadastro completo: volta para a vaga escolhida, se houver.
  redirect((await consumirDestino()) ?? "/inicio");
}
