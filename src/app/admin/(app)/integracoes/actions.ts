"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, requireInternalUser } from "@/lib/auth/internal";
import { ChaveMestraAusente, cifrar, decifrar, ultimos4 } from "@/lib/crypto-segredos";
import {
  PROVEDORES,
  ehPlataformaDeEmprego,
  instanciaValida,
  provedorValido,
  testarConexao,
  testeAutomaticoDisponivel,
  urlEvolutionSegura,
  validarAcessoEmprego,
  type Provedor,
} from "@/lib/integracoes";
import { empresaDaOperacao } from "@/lib/evolution";

const UUID_OK = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Escopo = { escopo: "plataforma" | "empresa"; companyId: string | null };

/**
 * Autoriza e resolve o escopo.
 * - superadmin: plataforma ou qualquer empresa (company_id do formulário);
 * - admin da empresa: SEMPRE a empresa da sessão, só chaves de IA (BYOK).
 */
async function contexto(formData: FormData) {
  const { user, role } = await requireInternalUser();
  const admin = createAdminClient();

  if (can(role, "integracoes.manage")) {
    const bruto = String(formData.get("company_id") ?? "").trim();
    if (bruto && !UUID_OK.test(bruto)) throw new Error("Empresa inválida.");
    const escopo: Escopo = bruto
      ? { escopo: "empresa", companyId: bruto }
      : { escopo: "plataforma", companyId: null };
    return { user, role, admin, ...escopo, ehSuper: true };
  }

  if (can(role, "integracoes.empresa")) {
    const { data } = await admin
      .from("company_assignments")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("papel", "admin_empresa")
      .eq("ativo", true)
      .limit(1);
    const companyId = data?.[0]?.company_id as string | undefined;
    if (!companyId) throw new Error("Você não é administrador de nenhuma empresa.");
    return { user, role, admin, escopo: "empresa" as const, companyId, ehSuper: false };
  }

  throw new Error("Sem permissão para gerenciar integrações.");
}

function exigirProvedorPermitido(p: unknown, esc: Escopo, ehSuper: boolean): Provedor {
  if (!provedorValido(p)) throw new Error("Provedor inválido.");
  const def = PROVEDORES.find((x) => x.id === p)!;
  if (!ehSuper && !def.byokEmpresa) {
    throw new Error("Este canal é gerenciado pela plataforma.");
  }
  // Na empresa, só IA própria e a instância do WhatsApp (superadmin).
  if (esc.escopo === "empresa" && !def.byokEmpresa && p !== "evolution") {
    throw new Error("Este canal é configurado apenas na plataforma.");
  }
  return p;
}

function mensagemFalhaCofre(e: unknown): never {
  if (e instanceof ChaveMestraAusente) {
    throw new Error(
      "A chave-mestra de criptografia ainda não está configurada no servidor. Nada foi gravado.",
    );
  }
  throw e instanceof Error ? e : new Error("Falha ao usar o cofre de chaves.");
}

/** Cria ou atualiza a credencial. Segredo vazio mantém o atual. */
export async function salvarCredencial(formData: FormData) {
  const ctx = await contexto(formData);
  const provedor = exigirProvedorPermitido(formData.get("provedor"), ctx, ctx.ehSuper);

  const segredo = String(formData.get("segredo") ?? "").trim();
  const ehEmprego = ehPlataformaDeEmprego(provedor);
  // Plataformas de emprego têm validação própria (senha pode ter menos de 8 caracteres).
  if (!ehEmprego && segredo.length > 0 && (segredo.length < 8 || segredo.length > 400)) {
    throw new Error("A chave informada parece inválida.");
  }

  const config: Record<string, string> = {};
  // Instância do WhatsApp da operação (empresa da plataforma), configurada na aba Plataforma.
  let instanciaOperacao: string | null = null;
  if (provedor === "evolution") {
    if (ctx.escopo === "plataforma") {
      const instOp = String(formData.get("instance_operacao") ?? "").trim();
      if (instOp) {
        if (!instanciaValida(instOp)) throw new Error("Nome da instância da operação inválido (letras, números, _ ou -).");
        instanciaOperacao = instOp;
      }
      const base = urlEvolutionSegura(String(formData.get("base_url") ?? ""));
      if (!base) throw new Error("Informe a URL https pública da Evolution (sem IP interno).");
      config.base_url = base;
    } else {
      const inst = String(formData.get("instance") ?? "").trim();
      if (!instanciaValida(inst)) throw new Error("Nome da instância inválido (letras, números, _ ou -).");
      config.instance = inst;
    }
  }
  if (provedor === "resend") {
    const remetente = String(formData.get("remetente") ?? "").trim();
    if (remetente) config.remetente = remetente.slice(0, 120);
  }
  if (provedor === "sms") {
    const prov = String(formData.get("sms_provedor") ?? "").trim();
    if (prov) config.provedor = prov.slice(0, 40);
  }

  const tetoBruto = String(formData.get("teto") ?? "").trim();
  let teto: number | null = null;
  if (tetoBruto) {
    teto = Number(tetoBruto.replace(",", "."));
    if (!Number.isFinite(teto) || teto < 0 || teto > 100000) throw new Error("Teto mensal inválido.");
  }

  // Existe? (índices únicos parciais: lemos e depois atualizamos ou inserimos)
  let q = ctx.admin.from("integration_credentials").select("id, segredo_cifrado, config").eq("provedor", provedor);
  q = ctx.companyId ? q.eq("company_id", ctx.companyId) : q.eq("escopo", "plataforma");
  const { data: atuais } = await q.limit(1);
  const atual = atuais?.[0];

  // Plataformas de emprego (hunter): usuário, senha ou chave de API, tudo cifrado e sem volta para a tela.
  if (ehEmprego) {
    const tipo = String(formData.get("tipo_acesso") ?? "");
    const usuario = String(formData.get("usuario") ?? "").trim();
    const erro = validarAcessoEmprego({ provedor, tipo, usuario, segredo, jaTemSegredo: !!atual?.segredo_cifrado });
    if (erro) throw new Error(erro);
    config.tipo_acesso = tipo;
    config.usuario = tipo === "login" ? usuario : "";
    config.plano = String(formData.get("plano") ?? "").trim().slice(0, 80);
    // Uso automático só liga com marca explícita, depois de a plataforma confirmar que os termos permitem.
    config.automacao = formData.get("automacao") === "sim" ? "sim" : "nao";
  }

  const exigeSegredo = !(provedor === "evolution" && ctx.escopo === "empresa");
  if (!atual && exigeSegredo && !segredo) throw new Error("Cole a chave para salvar.");

  let segredoCifrado: string | undefined;
  let finais: string | undefined;
  if (segredo) {
    try {
      segredoCifrado = cifrar(segredo);
    } catch (e) {
      mensagemFalhaCofre(e);
    }
    // Senha nunca mostra nem os últimos caracteres: só chave de API tem "••••1234".
    finais = ehEmprego && config.tipo_acesso === "login" ? undefined : ultimos4(segredo);
  }

  const campos = {
    config: { ...((atual?.config as Record<string, string> | null) ?? {}), ...config },
    teto_mensal_usd: teto,
    ...(segredoCifrado ? { segredo_cifrado: segredoCifrado, ultimos4: finais ?? null } : {}),
    // Mudou a chave ou a configuração: o teste anterior deixa de valer.
    status: "nao_testada" as const,
    status_msg: null,
    testado_em: null,
    updated_at: new Date().toISOString(),
  };

  if (atual) {
    const { data, error } = await ctx.admin
      .from("integration_credentials")
      .update(campos)
      .eq("id", atual.id)
      .select("id");
    if (error || !data || data.length === 0) throw new Error("Não foi possível salvar a credencial.");
  } else {
    const { error } = await ctx.admin.from("integration_credentials").insert({
      escopo: ctx.escopo,
      company_id: ctx.companyId,
      provedor,
      criado_por: ctx.user.id,
      ...campos,
    });
    if (error) throw new Error("Não foi possível salvar a credencial.");
  }

  // Instância da operação: grava na empresa da plataforma (mesmo modelo das demais empresas).
  if (instanciaOperacao) {
    const operacaoId = await empresaDaOperacao();
    if (!operacaoId) throw new Error("A empresa da operação ainda não foi definida na plataforma.");
    const { data: existente } = await ctx.admin
      .from("integration_credentials")
      .select("id, config")
      .eq("escopo", "empresa")
      .eq("company_id", operacaoId)
      .eq("provedor", "evolution")
      .limit(1);
    const cfgNova = { ...((existente?.[0]?.config as Record<string, string> | null) ?? {}), instance: instanciaOperacao };
    const { error: erroOp } = existente?.[0]
      ? await ctx.admin
          .from("integration_credentials")
          .update({ config: cfgNova, status: "nao_testada", updated_at: new Date().toISOString() })
          .eq("id", existente[0].id)
      : await ctx.admin.from("integration_credentials").insert({
          escopo: "empresa",
          company_id: operacaoId,
          provedor: "evolution",
          config: cfgNova,
          status: "nao_testada",
          criado_por: ctx.user.id,
        });
    if (erroOp) throw new Error("Não foi possível salvar a instância da operação.");
  }

  // Auditoria: nunca grava o segredo, só o fato e os 4 últimos caracteres.
  await ctx.admin.from("audit_log").insert({
    ator_id: ctx.user.id,
    acao: atual ? "integracao_atualizada" : "integracao_cadastrada",
    objeto_tipo: "integration_credential",
    objeto_id: atual?.id ?? null,
    depois: {
      provedor,
      escopo: ctx.escopo,
      company_id: ctx.companyId,
      chave_alterada: !!segredo,
      ultimos4: finais ?? null,
      teto_mensal_usd: teto,
      ...(ehEmprego ? { tipo_acesso: config.tipo_acesso, automacao: config.automacao } : {}),
    },
  });
  revalidatePath("/admin/integracoes");
}

/** Testa a conexão usando o segredo guardado. Registra o resultado. */
export async function testarCredencial(formData: FormData) {
  const ctx = await contexto(formData);
  const id = String(formData.get("id") ?? "");
  if (!UUID_OK.test(id)) throw new Error("Registro inválido.");

  const { data: cred } = await ctx.admin
    .from("integration_credentials")
    .select("id, escopo, company_id, provedor, segredo_cifrado, config")
    .eq("id", id)
    .maybeSingle();
  if (!cred) throw new Error("Credencial não encontrada.");
  // Admin da empresa só testa as da própria empresa.
  if (!ctx.ehSuper && cred.company_id !== ctx.companyId) throw new Error("Credencial não encontrada.");

  // Sem conector, não há o que testar: não marca "erro" no que só ainda não tem teste.
  if (!testeAutomaticoDisponivel(cred.provedor)) {
    await ctx.admin
      .from("integration_credentials")
      .update({
        status: "nao_testada",
        status_msg: "Acesso guardado. O teste automático chega com o conector do hunter.",
        testado_em: null,
      })
      .eq("id", cred.id);
    revalidatePath("/admin/integracoes");
    return;
  }

  const config = (cred.config as { base_url?: string; instance?: string } | null) ?? {};
  let segredo: string | null = null;
  let baseUrl = config.base_url;

  try {
    if (cred.segredo_cifrado) {
      segredo = decifrar(cred.segredo_cifrado);
    } else if (cred.provedor === "evolution" && cred.escopo === "empresa") {
      // Instância da empresa usa a chave e a URL da plataforma.
      const { data: plat } = await ctx.admin
        .from("integration_credentials")
        .select("segredo_cifrado, config")
        .eq("escopo", "plataforma")
        .eq("provedor", "evolution")
        .maybeSingle();
      if (plat?.segredo_cifrado) segredo = decifrar(plat.segredo_cifrado);
      baseUrl = (plat?.config as { base_url?: string } | null)?.base_url;
    }
  } catch (e) {
    mensagemFalhaCofre(e);
  }
  if (!segredo) throw new Error("Nada para testar: cadastre a chave da plataforma primeiro.");

  const r = await testarConexao(cred.provedor as Provedor, segredo, { base_url: baseUrl, instance: config.instance });

  await ctx.admin
    .from("integration_credentials")
    .update({
      status: r.ok ? "ok" : "erro",
      status_msg: r.mensagem.slice(0, 300),
      testado_em: new Date().toISOString(),
    })
    .eq("id", cred.id);

  await ctx.admin.from("audit_log").insert({
    ator_id: ctx.user.id,
    acao: "integracao_testada",
    objeto_tipo: "integration_credential",
    objeto_id: cred.id,
    depois: { provedor: cred.provedor, ok: r.ok, mensagem: r.mensagem },
  });
  revalidatePath("/admin/integracoes");
}

/** Remove a credencial (o segredo some do cofre). */
export async function removerCredencial(formData: FormData) {
  const ctx = await contexto(formData);
  const id = String(formData.get("id") ?? "");
  if (!UUID_OK.test(id)) throw new Error("Registro inválido.");

  const { data: cred } = await ctx.admin
    .from("integration_credentials")
    .select("id, provedor, escopo, company_id")
    .eq("id", id)
    .maybeSingle();
  if (!cred) throw new Error("Credencial não encontrada.");
  if (!ctx.ehSuper && cred.company_id !== ctx.companyId) throw new Error("Credencial não encontrada.");

  const { error } = await ctx.admin.from("integration_credentials").delete().eq("id", cred.id);
  if (error) throw new Error("Não foi possível remover.");

  await ctx.admin.from("audit_log").insert({
    ator_id: ctx.user.id,
    acao: "integracao_removida",
    objeto_tipo: "integration_credential",
    objeto_id: cred.id,
    antes: { provedor: cred.provedor, escopo: cred.escopo, company_id: cred.company_id },
  });
  revalidatePath("/admin/integracoes");
}
