"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { logAudit } from "@/lib/security/audit";
import { continuacaoDaDecisao, decidir, decisaoValida, type StatusValidacao } from "@/lib/validacao-reprovacao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Decisão da pessoa sobre uma reprovação apontada pela IA. Um clique devolve a
 * missão à IA (ver `continuacaoDaDecisao`). O resultado volta pela URL, porque
 * erro lançado chega sem texto ao navegador em produção.
 */
export async function decidirValidacao(formData: FormData) {
  const volta = String(formData.get("volta") ?? "/admin/validacoes");
  const destino = volta.startsWith("/admin/") ? volta : "/admin/validacoes";
  const sep = destino.includes("?") ? "&" : "?";
  const falha = (msg: string): never => redirect(`${destino}${sep}erro=${encodeURIComponent(msg)}`);

  const { user, role } = await requireInternalUser("pipeline.manage");
  const id = String(formData.get("id") ?? "");
  const decisao = formData.get("decisao");
  const observacao = String(formData.get("observacao") ?? "").trim().slice(0, 1000);
  if (!UUID.test(id) || !decisaoValida(decisao)) return falha("Pedido inválido.");

  // Reverter e pedir dados precisam de uma frase: alimenta o ajuste de prompt e de nota de corte.
  if ((decisao === "reverter" || decisao === "pedir_dados") && observacao.length < 5) {
    return falha(decisao === "reverter" ? "Diga em uma frase por que está revertendo." : "Diga qual dado falta pedir ao candidato.");
  }

  const admin = createAdminClient();
  const { data: caso } = await admin
    .from("validacoes_reprovacao")
    .select("id, job_id, application_id, candidate_id, etapa, status")
    .eq("id", id)
    .maybeSingle();
  if (!caso) return falha("Caso não encontrado.");

  // Carteira e sigilo: a vaga precisa estar no escopo (vaga confidencial só para quem tem acesso).
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, caso.job_id);

  const t = decidir(caso.status as StatusValidacao, decisao);
  if (!t.ok) return falha(t.erro);
  const cont = continuacaoDaDecisao(decisao);

  // Atualização condicional: se outra pessoa decidiu no meio tempo, não sobrescreve.
  const { data: atualizados, error } = await admin
    .from("validacoes_reprovacao")
    .update({
      status: t.novoStatus,
      observacao,
      decidido_por: user.id,
      decidido_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["aguardando", "aguardando_dados"])
    .select("id");
  if (error || !atualizados || atualizados.length === 0) return falha("Este caso já foi decidido por outra pessoa.");

  // A IA continua a partir daqui.
  if (cont.statusCandidatura) {
    await admin
      .from("applications")
      .update({ status: cont.statusCandidatura, updated_at: new Date().toISOString() })
      .eq("id", caso.application_id);
  }
  if (cont.retomarProcesso) {
    // A triagem volta a considerar a pessoa; o registro original da IA fica no caso.
    await admin
      .from("job_screenings")
      .update({ eliminado: false, updated_at: new Date().toISOString() })
      .eq("job_id", caso.job_id)
      .eq("application_id", caso.application_id);
  }

  // A decisão já valeu; falha de auditoria não a desfaz (e fica no log do servidor).
  try {
    await logAudit({
      ator_id: user.id,
      acao: `validacao_reprovacao_${decisao}`,
      objeto_tipo: "validacao_reprovacao",
      objeto_id: id,
      depois: { etapa: caso.etapa, job_id: caso.job_id, novo_status: t.novoStatus, continuacao: cont.descricao },
    });
  } catch {
    /* já registrado em console por logAudit */
  }

  revalidatePath("/admin/validacoes");
  revalidatePath(`/admin/vagas/${caso.job_id}`);
  revalidatePath(`/admin/vagas/${caso.job_id}/validacoes`);
  revalidatePath(`/admin/vagas/${caso.job_id}/triagem`);
  redirect(`${destino}${sep}aviso=${decisao}`);
}
