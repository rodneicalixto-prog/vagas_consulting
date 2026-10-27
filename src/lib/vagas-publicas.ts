import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { mencionaEmpresa, type VagaPublica } from "@/lib/vaga-publica";

const COLUNAS =
  "id, titulo, local, modalidade, modelo_trabalho, remuneracao_texto, descricao, regras, publicada_em, updated_at, expira_em, confidencial, companies(nome_fantasia, razao_social)";

/** Vaga confidencial: marca se o texto cita a empresa e não deixa o cadastro da empresa seguir adiante. */
function protegerSigilo(v: VagaPublica): VagaPublica {
  if (!v.confidencial) return v;
  return { ...v, menciona_empresa: mencionaEmpresa(v), companies: null };
}

const UUID = /^[0-9a-f-]{36}$/i;

/** Leitura pública no servidor: só vaga publicada e dentro do prazo. */
export const buscarVagaPublica = cache(async (id: string): Promise<VagaPublica | null> => {
  if (!UUID.test(id)) return null;
  const { data } = await createAdminClient()
    .from("jobs")
    .select(COLUNAS)
    .eq("id", id)
    .eq("status", "publicada")
    .or(`expira_em.is.null,expira_em.gt.${new Date().toISOString()}`)
    .maybeSingle();
  return data ? protegerSigilo(data as VagaPublica) : null;
});

export async function listarVagasPublicas(limite = 200): Promise<VagaPublica[]> {
  const { data, error } = await createAdminClient()
    .from("jobs")
    .select(COLUNAS)
    .eq("status", "publicada")
    .or(`expira_em.is.null,expira_em.gt.${new Date().toISOString()}`)
    .order("publicada_em", { ascending: false })
    .limit(limite);
  // Falha do banco não pode virar "nenhuma vaga": o sitemap esvaziado diz ao Google que as vagas saíram.
  if (error) throw new Error(`listarVagasPublicas: ${error.message}`);
  return ((data as VagaPublica[] | null) ?? []).map(protegerSigilo);
}
