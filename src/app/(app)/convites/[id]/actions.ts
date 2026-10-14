"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/security/audit";
import { RespondInviteSchema } from "@/lib/validation/schemas";
import { CONVITES_ABERTOS, conviteExpirado } from "@/lib/convites";

export async function responderConvite(formData: FormData) {
  const parsed = RespondInviteSchema.safeParse({
    invite_id: formData.get("invite_id"),
    acao: formData.get("acao"),
    motivo: formData.get("motivo") || null,
  });
  if (!parsed.success) {
    redirect("/convites?erro=dados");
  }
  const { invite_id: inviteId, acao, motivo } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Leitura pelo cliente do candidato: a RLS (invites_select_own) garante que
  // só o dono enxerga o convite.
  const { data: convite } = await supabase
    .from("invites")
    .select("id, candidate_id, status, validade, jobs(status)")
    .eq("id", inviteId)
    .maybeSingle();

  if (!convite || convite.candidate_id !== user.id) {
    redirect("/convites?erro=nao-encontrado");
  }
  if (!CONVITES_ABERTOS.includes(convite.status)) {
    redirect(`/convites/${inviteId}?erro=ja-respondido`);
  }
  if (conviteExpirado(convite)) {
    redirect(`/convites/${inviteId}?erro=expirado`);
  }

  // Só aceita se a vaga continua publicada (RLS esconde vaga não publicada, e
  // o join volta nulo) e o candidato não foi para a black list depois do envio.
  if (acao === "aceitar") {
    if (convite.jobs?.status !== "publicada") {
      redirect(`/convites/${inviteId}?erro=vaga-encerrada`);
    }
    const { data: perfil } = await supabase
      .from("profiles")
      .select("blacklisted")
      .eq("id", user.id)
      .maybeSingle();
    if (perfil?.blacklisted) {
      redirect(`/convites/${inviteId}?erro=indisponivel`);
    }
  }

  const novoStatus = acao === "aceitar" ? "aceito" : "recusado";
  const agora = new Date().toISOString();

  // Escrita pelo cliente admin, só depois das verificações acima. Evita abrir
  // política de UPDATE ao candidato no banco. A condição de status no WHERE
  // impede resposta dupla em corrida.
  const admin = createAdminClient();
  const { data: atualizado, error } = await admin
    .from("invites")
    .update({
      status: novoStatus,
      motivo: acao === "recusar" ? motivo : null,
      resposta_em: agora,
    })
    .eq("id", inviteId)
    .eq("candidate_id", user.id)
    .in("status", CONVITES_ABERTOS)
    // revalida a validade na própria escrita (fecha a janela entre ler e gravar)
    .or(`validade.is.null,validade.gt.${agora}`)
    .select("id")
    .maybeSingle();

  if (error || !atualizado) {
    redirect(`/convites/${inviteId}?erro=ja-respondido`);
  }

  await logAudit({
    ator_id: user.id,
    acao: acao === "aceitar" ? "convite_aceito" : "convite_recusado",
    objeto_tipo: "invite",
    objeto_id: inviteId,
    antes: { status: convite.status },
    depois: { status: novoStatus },
    detalhes: acao === "recusar" && motivo ? { motivo } : undefined,
  });

  revalidatePath("/convites");
  revalidatePath(`/convites/${inviteId}`);
  redirect(`/convites/${inviteId}?ok=${acao}`);
}
