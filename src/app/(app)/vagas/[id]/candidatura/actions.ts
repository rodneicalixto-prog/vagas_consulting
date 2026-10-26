"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bloqueadoNaEmpresa } from "@/lib/blacklist-empresa";
import { ApplyJobSchema, type ApplyJobInput } from "@/lib/validation/schemas";
import { canalValido } from "@/lib/divulgacao";
import { TOKEN_RE, origemDaCandidatura, type FonteHunter } from "@/lib/hunter";
import { origemDoCookie } from "@/lib/origem-servidor";
import { textoDaCandidatura } from "@/lib/origem";

export async function enviarCandidatura(jobId: string, respostas: Record<string, boolean>, origem?: string) {
  // Validar com Zod
  const validated = ApplyJobSchema.parse({ job_id: jobId, respostas });
  const { job_id: validatedJobId, respostas: validatedRespostas } = validated;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("telefone, endereco, curriculo_url")
    .eq("id", user.id)
    .maybeSingle();

  const temCurriculo = Boolean(profile?.curriculo_url);
  const temDadosDeContato = Boolean(profile?.telefone?.trim() && profile?.endereco?.trim());

  if (!temCurriculo && !temDadosDeContato) {
    return {
      error:
        "Complete seu perfil (telefone e endereço) antes de se candidatar — sem currículo, é isso que a empresa recebe.",
    };
  }

  // Black list da empresa: a mensagem não revela o motivo nem a empresa.
  const { data: vaga } = await createAdminClient()
    .from("jobs")
    .select("company_id")
    .eq("id", validatedJobId)
    .maybeSingle();
  if (await bloqueadoNaEmpresa(vaga?.company_id, { id: user.id, telefone: profile?.telefone })) {
    return { error: "Não foi possível enviar sua candidatura para esta vaga." };
  }

  // Veio de uma abordagem do hunter? O cookie do link rastreado diz de qual fonte.
  let origemFinal = origem && canalValido(origem) ? `divulgacao_${origem}` : "app_candidato";
  let prospectId: string | null = null;
  try {
    const token = (await cookies()).get("hunter_token")?.value;
    if (token && TOKEN_RE.test(token)) {
      const { data: pr } = await createAdminClient()
        .from("hunter_prospects")
        .select("id, job_id, fonte, estado")
        .eq("token", token)
        .maybeSingle();
      if (pr && pr.job_id === validatedJobId && pr.estado !== "nao_contactar") {
        origemFinal = origemDaCandidatura(pr.fonte as FonteHunter);
        prospectId = pr.id;
      }
    }
    // Sem marcador no link nem hunter: usa o canal do primeiro toque (cookie), se houver.
    if (origemFinal === "app_candidato") {
      const ct = await origemDoCookie();
      if (ct) origemFinal = textoDaCandidatura(ct);
    }
  } catch {
    // A origem é só rastro: nunca impede a candidatura.
  }

  const { error } = await supabase.from("applications").insert({
    job_id: validatedJobId,
    candidate_id: user.id,
    respostas: validatedRespostas as Record<string, boolean>,
    origem: origemFinal,
  });

  if (error && error.code !== "23505") {
    // 23505 = já existe candidatura pra essa vaga (unique constraint) — trata como sucesso silencioso
    return { error: "Não foi possível enviar a candidatura. Tente novamente." };
  }

  if (prospectId) {
    try {
      const agora = new Date().toISOString();
      await createAdminClient()
        .from("hunter_prospects")
        .update({ estado: "candidatou", candidate_id: user.id, candidatou_em: agora, updated_at: agora })
        .eq("id", prospectId);
    } catch {
      // Rastro do hunter: a candidatura já valeu.
    }
  }

  return { error: null };
}
