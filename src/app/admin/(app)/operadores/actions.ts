"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, requireInternalUser } from "@/lib/auth/internal";
import { empresaDaOperacao } from "@/lib/evolution";
import { erroLimiteExcedido } from "@/lib/operadores";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MSG_CHEIO =
  "O limite de operadores contratados da empresa foi atingido. Desative um operador ou peça ao superadmin para ampliar o limite.";

function campoId(formData: FormData, campo: string): string {
  const v = String(formData.get(campo) ?? "");
  if (!UUID.test(v)) throw new Error("Dados inválidos.");
  return v;
}

/**
 * Autoriza e deriva a empresa DA SESSÃO: a atribuição ativa com papel
 * 'admin_empresa'. Nunca aceita company_id do formulário.
 * O superadmin gerencia a equipe da PRÓPRIA empresa da operação (SOS Vagas),
 * nunca a de empresas clientes (essas ficam em leitura).
 */
async function contexto() {
  const { user, role } = await requireInternalUser();
  const admin = createAdminClient();
  if (role === "superadmin") {
    const operacaoId = await empresaDaOperacao();
    if (!operacaoId) throw new Error("A empresa da operação ainda não foi definida na plataforma.");
    return { user, admin, companyId: operacaoId };
  }
  if (!can(role, "operadores.manage")) throw new Error("Sem permissão para gerenciar operadores.");
  const { data } = await admin
    .from("company_assignments")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("papel", "admin_empresa")
    .eq("ativo", true)
    .limit(1);
  const companyId = data?.[0]?.company_id;
  if (!companyId) throw new Error("Você não é administrador de nenhuma empresa.");
  return { user, admin, companyId: companyId as string };
}

async function contarOperadoresAtivos(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("company_assignments")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("papel", "operador")
    .eq("ativo", true);
  if (error) throw new Error("Não foi possível conferir o limite de operadores.");
  return count ?? 0;
}

async function limiteDaEmpresa(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
): Promise<number> {
  const { data, error } = await admin
    .from("companies")
    .select("max_operadores")
    .eq("id", companyId)
    .maybeSingle();
  if (error || !data) throw new Error("Empresa não encontrada.");
  return Number(data.max_operadores ?? 0);
}

/**
 * Remove a conta de autenticação só se ela acabou de ser criada por este
 * convite (menos de 2 minutos) e não tem nenhum perfil de candidato.
 */
async function limparContaNova(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  createdAt: string | undefined,
) {
  const idade = createdAt ? Date.now() - new Date(createdAt).getTime() : Number.POSITIVE_INFINITY;
  if (idade > 2 * 60_000) return;
  const { data: perfil } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (perfil) return;
  await admin.auth.admin.deleteUser(userId);
}

/** Convida um operador novo para a empresa do admin da empresa. */
export async function convidarOperador(formData: FormData) {
  const { user, admin, companyId } = await contexto();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!EMAIL.test(email) || email.length > 254) throw new Error("E-mail inválido.");
  if (nome.length < 2 || nome.length > 120) throw new Error("Informe o nome do operador.");

  // Conferência prévia no servidor (o gatilho do banco é a trava final).
  const [limite, emUso] = await Promise.all([
    limiteDaEmpresa(admin, companyId),
    contarOperadoresAtivos(admin, companyId),
  ]);
  if (emUso >= limite) throw new Error(MSG_CHEIO);

  const cab = await headers();
  const host = cab.get("x-forwarded-host") ?? cab.get("host");
  const redirectTo = host
    ? `${host.startsWith("localhost") ? "http" : "https"}://${host}/admin/definir-senha`
    : undefined;
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (inviteError || !invited?.user) {
    const msg = inviteError?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      throw new Error("Este e-mail já pertence a outra pessoa cadastrada na plataforma.");
    }
    throw new Error("Não foi possível enviar o convite. Verifique o e-mail e tente de novo.");
  }
  const novoId = invited.user.id;

  // Conta que já existia (candidato ou outro perfil interno): não toca nela.
  // Segurança: sem isto, um candidato poderia virar operador, e a limpeza de
  // erro abaixo apagaria a conta dele.
  const [{ data: existente }, { data: perfilCandidato }] = await Promise.all([
    admin.from("admin_users").select("user_id").eq("user_id", novoId).maybeSingle(),
    admin.from("profiles").select("id").eq("id", novoId).maybeSingle(),
  ]);
  if (existente || perfilCandidato) {
    throw new Error("Este e-mail já pertence a outra pessoa cadastrada na plataforma.");
  }

  const { error: perfilError } = await admin.from("admin_users").insert({
    user_id: novoId,
    perfil: "operador",
    nome_exibicao: nome,
  });
  if (perfilError) {
    await limparContaNova(admin, novoId, invited.user.created_at);
    throw new Error("Convite enviado, mas não foi possível registrar o operador. Tente de novo.");
  }

  const { data: linha, error: atribError } = await admin
    .from("company_assignments")
    .insert({
      company_id: companyId,
      user_id: novoId,
      papel: "operador",
      ativo: true,
      criado_por: user.id,
    })
    .select("id");
  if (atribError || !linha || linha.length === 0) {
    // Desfaz só o que acabamos de criar, para não deixar usuário órfão.
    await admin.from("admin_users").delete().eq("user_id", novoId);
    await limparContaNova(admin, novoId, invited.user.created_at);
    if (erroLimiteExcedido(atribError)) throw new Error(MSG_CHEIO);
    throw new Error("Não foi possível vincular o operador à empresa.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "operador_convidado",
    objeto_tipo: "company_assignment",
    objeto_id: linha[0].id,
    depois: { company_id: companyId, user_id: novoId, email, nome, papel: "operador" },
  });
  revalidatePath("/admin/operadores");
}

/** Carrega a atribuição e exige: da empresa do admin e papel 'operador'. */
async function atribuicaoDoOperador(
  admin: ReturnType<typeof createAdminClient>,
  companyId: string,
  assignmentId: string,
) {
  const { data } = await admin
    .from("company_assignments")
    .select("id, company_id, user_id, papel, ativo, acessa_confidenciais")
    .eq("id", assignmentId)
    .eq("company_id", companyId)
    .eq("papel", "operador")
    .maybeSingle();
  if (!data) throw new Error("Operador não encontrado nesta empresa.");
  return data;
}

/** Desativa o operador: libera a vaga e preserva o histórico. */
export async function desativarOperador(formData: FormData) {
  const { user, admin, companyId } = await contexto();
  const assignmentId = campoId(formData, "assignment_id");
  const alvo = await atribuicaoDoOperador(admin, companyId, assignmentId);
  if (!alvo.ativo) return;

  const { data, error } = await admin
    .from("company_assignments")
    .update({ ativo: false })
    .eq("id", assignmentId)
    .eq("company_id", companyId)
    .eq("papel", "operador")
    .select("id");
  if (error || !data || data.length === 0) throw new Error("Não foi possível desativar o operador.");

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "operador_desativado",
    objeto_tipo: "company_assignment",
    objeto_id: assignmentId,
    antes: { company_id: companyId, user_id: alvo.user_id, ativo: true },
    depois: { ativo: false },
  });
  revalidatePath("/admin/operadores");
}

/** Reativa o operador, respeitando o limite contratado. */
export async function reativarOperador(formData: FormData) {
  const { user, admin, companyId } = await contexto();
  const assignmentId = campoId(formData, "assignment_id");
  const alvo = await atribuicaoDoOperador(admin, companyId, assignmentId);
  if (alvo.ativo) return;

  const [limite, emUso] = await Promise.all([
    limiteDaEmpresa(admin, companyId),
    contarOperadoresAtivos(admin, companyId),
  ]);
  if (emUso >= limite) throw new Error(MSG_CHEIO);

  const { data, error } = await admin
    .from("company_assignments")
    .update({ ativo: true })
    .eq("id", assignmentId)
    .eq("company_id", companyId)
    .eq("papel", "operador")
    .select("id");
  if (error) {
    if (erroLimiteExcedido(error)) throw new Error(MSG_CHEIO);
    throw new Error("Não foi possível reativar o operador.");
  }
  if (!data || data.length === 0) throw new Error("Operador não encontrado nesta empresa.");

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "operador_reativado",
    objeto_tipo: "company_assignment",
    objeto_id: assignmentId,
    antes: { company_id: companyId, user_id: alvo.user_id, ativo: false },
    depois: { ativo: true },
  });
  revalidatePath("/admin/operadores");
}

/** Concede ou retira o acesso de confiança (vagas sigilosas) do operador. */
export async function alternarConfianca(formData: FormData) {
  const { user, admin, companyId } = await contexto();
  const assignmentId = campoId(formData, "assignment_id");
  const valor = formData.get("valor") === "true";
  const alvo = await atribuicaoDoOperador(admin, companyId, assignmentId);

  const { data, error } = await admin
    .from("company_assignments")
    .update({ acessa_confidenciais: valor })
    .eq("id", assignmentId)
    .eq("company_id", companyId)
    .eq("papel", "operador")
    .select("id");
  if (error || !data || data.length === 0) {
    throw new Error("Não foi possível alterar o acesso de confiança.");
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: valor ? "acesso_confianca_concedido" : "acesso_confianca_retirado",
    objeto_tipo: "company_assignment",
    objeto_id: assignmentId,
    antes: { company_id: companyId, user_id: alvo.user_id, acessa_confidenciais: alvo.acessa_confidenciais },
    depois: { acessa_confidenciais: valor },
  });
  revalidatePath("/admin/operadores");
}
