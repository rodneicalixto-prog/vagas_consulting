import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { intervaloDaPagina, type BuscaVagas } from "@/lib/busca-vagas";
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

/**
 * Página da lista pública, com busca e filtros no servidor.
 * A palavra procura no título e, só em vaga não confidencial, na descrição:
 * em vaga confidencial o texto pode citar a empresa e a busca revelaria o nome.
 */
export async function buscarVagasPublicas(busca: BuscaVagas): Promise<{ vagas: VagaPublica[]; total: number }> {
  let q = createAdminClient()
    .from("jobs")
    .select(COLUNAS, { count: "exact" })
    .eq("status", "publicada")
    .or(`expira_em.is.null,expira_em.gt.${new Date().toISOString()}`);
  if (busca.q) {
    q = q.or(`titulo.ilike.%${busca.q}%,and(confidencial.eq.false,descricao.ilike.%${busca.q}%)`);
  }
  if (busca.modalidade) q = q.eq("modalidade", busca.modalidade);
  if (busca.cidade) q = q.ilike("local", `%${busca.cidade}%`);
  const { from, to } = intervaloDaPagina(busca.pagina);
  const { data, error, count } = await q.order("publicada_em", { ascending: false }).range(from, to);
  // Página além do fim (PGRST103): a página manda para a última; aqui só devolve a contagem.
  if (error?.code === "PGRST103") {
    const { count: total } = await q.range(0, 0);
    return { vagas: [], total: total ?? 0 };
  }
  if (error) throw new Error(`buscarVagasPublicas: ${error.message}`);
  return { vagas: ((data as VagaPublica[] | null) ?? []).map(protegerSigilo), total: count ?? 0 };
}

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
