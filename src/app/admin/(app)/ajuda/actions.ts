"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { empresaDaOperacao } from "@/lib/evolution";
import { gerarTextoIA } from "@/lib/agente-servidor";
import { anonimizarTexto } from "@/lib/agente";
import indice from "@/lib/ajuda/indice.json";
import {
  LIMITE_DIARIO,
  MENSAGEM_SEM_RESPOSTA,
  NAO_ENCONTRADO,
  avisoDeEstado,
  buscar,
  corteDeRetencao,
  fontesParaTela,
  inicioDoDiaBR,
  limiteAtingido,
  montarPromptAjuda,
  perguntaValida,
  permitidos,
  type Pedaco,
} from "@/lib/ajuda";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RespostaAjuda = {
  ok: boolean;
  erro: string | null;
  id: string | null;
  resposta: string;
  aviso: string | null;
  fontes: { id: string; capitulo: string; titulo: string; texto: string }[];
  restantes: number | null;
};

const vazia = (erro: string | null, resposta = ""): RespostaAjuda => ({
  ok: false,
  erro,
  id: null,
  resposta,
  aviso: null,
  fontes: [],
  restantes: null,
});

/**
 * Responde uma dúvida de funcionamento com base só no manual. Não consulta
 * dados de candidatos, vagas ou conversas e não executa ações.
 */
export async function perguntarAjuda(perguntaBruta: string, rotaBruta: string): Promise<RespostaAjuda> {
  try {
    const { user, role } = await requireInternalUser();
    const admin = createAdminClient();

    const valida = perguntaValida(String(perguntaBruta ?? ""));
    if (!valida.ok) return vazia(valida.erro);
    const rota = String(rotaBruta ?? "").startsWith("/admin") ? String(rotaBruta).slice(0, 200) : "";

    const operacaoId = await empresaDaOperacao();
    if (!operacaoId) return vazia("O assistente ainda não foi configurado pela plataforma.");
    const { data: agente } = await admin.from("ai_agents").select("ajuda_ativa").eq("company_id", operacaoId).maybeSingle();
    if (agente && agente.ajuda_ativa === false) {
      return vazia("O assistente está desligado no momento. Consulte o manual ou fale com o suporte.");
    }

    // Limite diário por pessoa.
    const agora = new Date();
    const { count } = await admin
      .from("help_questions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", inicioDoDiaBR(agora));
    if (limiteAtingido(count ?? 0)) {
      return vazia(`Você usou as ${LIMITE_DIARIO} perguntas de hoje. Volte amanhã ou consulte o manual.`);
    }

    // A pergunta é anonimizada antes de tudo: busca, modelo e registro.
    const pergunta = anonimizarTexto(valida.texto);
    const base = permitidos(indice.pedacos as Pedaco[], role);
    const achados = buscar(base, pergunta, rota);

    let resposta = MENSAGEM_SEM_RESPOSTA;
    let semResposta = achados.length === 0;
    let usados = achados.map((a) => a.pedaco);

    if (!semResposta) {
      const { system, user: prompt } = montarPromptAjuda({ papel: role, rota, pergunta, pedacos: usados });
      const r = await gerarTextoIA({ companyId: operacaoId, system, user: prompt, maxTokens: 450 });
      if (!r.ok) return vazia(r.erro);
      const texto = r.texto.trim();
      if (!texto || texto.includes(NAO_ENCONTRADO)) {
        semResposta = true;
        usados = [];
      } else {
        resposta = texto.slice(0, 1500);
      }
    }

    const { data: reg } = await admin
      .from("help_questions")
      .insert({
        user_id: user.id,
        papel: role,
        rota,
        pergunta: pergunta.slice(0, 400),
        pedacos: usados.map((p) => p.id),
        sem_resposta: semResposta,
      })
      .select("id")
      .single();

    // Retenção: apaga o que passou de 90 dias, sem atrasar a resposta.
    await admin.from("help_questions").delete().lt("created_at", corteDeRetencao(agora));

    return {
      ok: true,
      erro: null,
      id: reg?.id ?? null,
      resposta,
      aviso: semResposta ? null : avisoDeEstado(usados),
      fontes: semResposta ? [] : fontesParaTela(usados),
      restantes: Math.max(0, LIMITE_DIARIO - (count ?? 0) - 1),
    };
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    return vazia("Não foi possível responder agora. Tente de novo.");
  }
}

/** 👍 ou 👎 em uma resposta (só da própria pessoa). */
export async function avaliarResposta(id: string, util: boolean): Promise<{ ok: boolean }> {
  try {
    const { user } = await requireInternalUser();
    if (!UUID.test(id)) return { ok: false };
    const { error } = await createAdminClient()
      .from("help_questions")
      .update({ util })
      .eq("id", id)
      .eq("user_id", user.id);
    return { ok: !error };
  } catch (e) {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
    return { ok: false };
  }
}

/** O superadmin liga e desliga o assistente. */
export async function definirAjudaAtiva(formData: FormData): Promise<void> {
  const { user, role } = await requireInternalUser();
  if (role !== "superadmin") throw new Error("Só a plataforma liga ou desliga o assistente.");
  const operacaoId = await empresaDaOperacao();
  if (!operacaoId) throw new Error("A empresa da operação ainda não foi definida.");
  const ativa = formData.get("ativa") === "sim";
  const admin = createAdminClient();
  const { error } = await admin.from("ai_agents").update({ ajuda_ativa: ativa }).eq("company_id", operacaoId);
  if (error) throw new Error("Não foi possível salvar.");
  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: ativa ? "ajuda_ligada" : "ajuda_desligada",
    objeto_tipo: "company",
    objeto_id: operacaoId,
  });
  revalidatePath("/admin/agente");
}
