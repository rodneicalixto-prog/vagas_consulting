"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { validateFormData } from "@/lib/validation/validate-form";
import {
  CreateInviteSchema,
  DecideInviteSchema,
  type CreateInviteInput,
  type DecideInviteInput,
} from "@/lib/validation/schemas";
import { logAudit } from "@/lib/security/audit";
import { CONVITES_ATIVOS, CONVITES_CANCELAVEIS, conviteExpirado } from "@/lib/convites";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { bloqueadoNaEmpresa } from "@/lib/blacklist-empresa";

export async function criarConvite(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const {
    candidate_id: candidateId,
    job_id: jobId,
    validade_horas: horas,
    mensagem: mensagemEquipe,
  } = validateFormData<CreateInviteInput>(CreateInviteSchema, formData);

  // Carteira: a vaga precisa estar no escopo. O candidato vem do banco de
  // talentos (aprovado); o operador não recebe contato, só o convite.
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, jobId);

  const admin = createAdminClient();

  const [{ data: candidato }, { data: vaga }] = await Promise.all([
    admin.from("profiles").select("id, blacklisted, status_validacao, telefone").eq("id", candidateId).maybeSingle(),
    admin.from("jobs").select("id, titulo, status, modalidade, company_id").eq("id", jobId).maybeSingle(),
  ]);

  if (!candidato) throw new Error("Candidato não encontrado.");
  if (candidato.blacklisted) throw new Error("Candidato está na black list e não pode receber convite.");
  if (await bloqueadoNaEmpresa(vaga?.company_id, { id: candidato.id, telefone: candidato.telefone })) {
    throw new Error("Este candidato está na black list da empresa e não pode ser convidado.");
  }
  if (!escopo.todos && candidato.status_validacao !== "aprovado") {
    throw new Error("Só é possível convidar candidatos aprovados.");
  }
  if (!vaga || vaga.status !== "publicada") throw new Error("A vaga precisa estar publicada.");

  // limit(1) em vez de maybeSingle: com 2+ linhas o maybeSingle erra e a guarda
  // deixaria de valer. A garantia definitiva é o índice único parcial
  // (migration 0022); esta checagem só dá a mensagem amigável.
  const { data: existentes } = await admin
    .from("invites")
    .select("id, status, validade")
    .eq("candidate_id", candidateId)
    .eq("job_id", jobId)
    .in("status", CONVITES_ATIVOS);

  // Convite vencido (sem resposta no prazo) não conta como ativo: é encerrado
  // aqui para liberar um novo convite ao mesmo candidato (índice único parcial).
  const vencidos = (existentes ?? []).filter((c) => conviteExpirado({ status: c.status, validade: c.validade }));
  const bloqueantes = (existentes ?? []).filter((c) => !vencidos.includes(c));
  if (bloqueantes.length > 0) {
    throw new Error("Este candidato já tem um convite ativo para esta vaga.");
  }
  for (const v of vencidos) {
    const { data: encerrado } = await admin
      .from("invites")
      .update({ status: "cancelado" })
      .eq("id", v.id)
      .eq("status", v.status)
      .select("id");
    if (encerrado && encerrado.length > 0) {
      await logAudit({
        ator_id: user.id,
        acao: "convite_vencido_encerrado",
        objeto_tipo: "invite",
        objeto_id: v.id,
        antes: { status: v.status, validade: v.validade },
        depois: { status: "cancelado" },
      });
    }
  }

  const validade = new Date(Date.now() + horas * 3600_000).toISOString();
  const { data: convite, error } = await admin
    .from("invites")
    .insert({ candidate_id: candidateId, job_id: jobId, status: "ofertado", validade })
    .select("id")
    .single();
  if (error?.code === "23505") {
    throw new Error("Este candidato já tem um convite ativo para esta vaga.");
  }
  if (error || !convite) throw new Error("Não foi possível criar o convite.");

  // O convite vira uma mensagem na aba Mensagens do candidato. O texto da
  // equipe (se houver) é o conteúdo; senão, um texto padrão apontando para Convites.
  const conteudo =
    mensagemEquipe ||
    `Você recebeu um convite para a vaga ${vaga.titulo}. Abra Convites para aceitar ou recusar.`;
  const { error: erroMensagem } = await admin.from("messages").insert({
    invite_id: convite.id,
    remetente_id: user.id,
    destinatario_id: candidateId,
    conteudo,
  });
  if (erroMensagem) throw new Error("Convite criado, mas a mensagem não foi enviada. Tente de novo.");

  await logAudit({
    ator_id: user.id,
    acao: "convite_criado",
    objeto_tipo: "invite",
    objeto_id: convite.id,
    depois: { candidate_id: candidateId, job_id: jobId, validade, mensagem: Boolean(mensagemEquipe) },
  });

  revalidatePath("/admin/convites");
}

/**
 * Formulário da tela de convites. O resultado volta por querystring (aviso de
 * sucesso, convite repetido ou erro): erro lançado no servidor chega ao
 * navegador sem texto em produção, então não é relançado.
 */
export async function criarConviteFormulario(formData: FormData) {
  try {
    await criarConvite(formData);
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "";
    if (mensagem.includes("já tem um convite ativo")) {
      redirect("/admin/convites?aviso=ja-convidado");
    }
    const motivo = (mensagem || "tente de novo.").slice(0, 200);
    redirect(`/admin/convites?erro=${encodeURIComponent(motivo)}`);
  }
  redirect("/admin/convites?aviso=enviado");
}

export async function decidirConvite(formData: FormData) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const { invite_id: inviteId, acao } = validateFormData<DecideInviteInput>(DecideInviteSchema, formData);

  const admin = createAdminClient();
  const { data: antes } = await admin
    .from("invites")
    .select("id, status, job_id")
    .eq("id", inviteId)
    .maybeSingle();
  if (!antes) throw new Error("Convite não encontrado.");
  // Carteira: a vaga do convite precisa estar no escopo.
  await exigirVaga(await obterEscopo(user.id, role), antes.job_id);

  // Transições permitidas pela operação:
  //   aceito -> confirmado   |   ofertado/visualizado/aceito/confirmado -> cancelado
  const permitido =
    acao === "confirmar"
      ? antes.status === "aceito"
      : CONVITES_CANCELAVEIS.includes(antes.status);
  if (!permitido) throw new Error("Esta ação não vale para o estado atual do convite.");

  const novo = acao === "confirmar" ? "confirmado" : "cancelado";
  const { data: atualizado, error } = await admin
    .from("invites")
    .update({ status: novo })
    .eq("id", inviteId)
    .eq("status", antes.status)
    .select("id");
  if (error) throw new Error("Não foi possível atualizar o convite.");
  // Outra pessoa mudou o convite entre a leitura e a escrita: nada foi
  // alterado, então também não se registra auditoria de algo que não ocorreu.
  if (!atualizado || atualizado.length === 0) {
    throw new Error("O convite mudou de situação enquanto você decidia. Atualize a página.");
  }

  await logAudit({
    ator_id: user.id,
    acao: acao === "confirmar" ? "convite_confirmado" : "convite_cancelado",
    objeto_tipo: "invite",
    objeto_id: inviteId,
    antes: { status: antes.status },
    depois: { status: novo },
  });

  revalidatePath("/admin/convites");
}
