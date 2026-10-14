"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Define (ou limpa) o prazo de entrega de candidatos ao cliente de uma vaga. */
export async function definirPrazoEntrega(formData: FormData) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const jobId = String(formData.get("job_id") ?? "");
  const data = String(formData.get("prazo") ?? "").trim();
  if (!UUID_RE.test(jobId)) throw new Error("Vaga inválida.");
  if (data && !DATA_RE.test(data)) throw new Error("Data inválida.");

  // Carteira: a vaga precisa estar no escopo do usuário.
  const escopo = await obterEscopo(user.id, role);
  const vaga = await exigirVaga(escopo, jobId);

  // Fim do dia, para a vaga valer durante todo o último dia.
  const expiraEm = data ? new Date(`${data}T23:59:59.000Z`).toISOString() : null;
  if (expiraEm && Number.isNaN(new Date(expiraEm).getTime())) throw new Error("Data inválida.");

  const admin = createAdminClient();
  const { data: antes } = await admin.from("jobs").select("expira_em").eq("id", jobId).maybeSingle();
  const { data: atualizada, error } = await admin
    .from("jobs")
    .update({ expira_em: expiraEm })
    .eq("id", jobId)
    .select("id");
  if (error || !atualizada || atualizada.length === 0) {
    throw new Error("Não foi possível salvar o prazo.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "vaga_prazo_entrega_definido",
    objeto_tipo: "job",
    objeto_id: vaga.id,
    antes: { expira_em: antes?.expira_em ?? null },
    depois: { expira_em: expiraEm },
  });

  revalidatePath("/admin/agenda/entregas");
}
