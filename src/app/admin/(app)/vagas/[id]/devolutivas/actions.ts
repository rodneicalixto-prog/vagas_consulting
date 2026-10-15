"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { bloqueadoNaEmpresa } from "@/lib/blacklist-empresa";
import { normalizarTelefoneBR } from "@/lib/whatsapp";
import { listaDeTexto } from "@/lib/vaga-estruturada";
import {
  canalValido,
  podeEnviarEncerramento,
  sugerirTipo,
  temBloqueioDevolutiva,
  textoBase,
  tipoValido,
  tomValido,
  verificarDevolutiva,
  type DadosDevolutiva,
  type TipoDevolutiva,
} from "@/lib/devolutiva";
import type { Json } from "@/lib/supabase/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ehRedirect(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

type Admin = ReturnType<typeof createAdminClient>;

async function contexto(admin: Admin, jobId: string, applicationId: string) {
  const { data: app } = await admin
    .from("applications")
    .select("id, job_id, candidate_id, status, updated_at")
    .eq("id", applicationId)
    .maybeSingle();
  if (!app || app.job_id !== jobId) return null;
  const [{ data: perfil }, { data: vaga }, { data: ficha }, { data: enviada }] = await Promise.all([
    admin.from("profiles").select("id, nome_completo, telefone, blacklisted").eq("id", app.candidate_id).maybeSingle(),
    admin.from("jobs").select("id, company_id, titulo, companies(nome_fantasia, razao_social)").eq("id", jobId).maybeSingle(),
    admin
      .from("interview_scorecards")
      .select("pontos_fortes, pontos_atencao")
      .eq("application_id", applicationId)
      .eq("status", "fechada")
      .order("fechada_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("candidate_feedbacks").select("id").eq("application_id", applicationId).eq("status", "enviada").limit(1),
  ]);
  if (!perfil || !vaga) return null;

  const tel = normalizarTelefoneBR(perfil.telefone ?? null);
  const [{ data: optOut }, bloqueado] = await Promise.all([
    tel
      ? admin
          .from("channel_opt_outs")
          .select("id")
          .eq("canal", "whatsapp")
          .eq("telefone_normalizado", tel)
          .or(`company_id.eq.${vaga.company_id},company_id.is.null`)
          .limit(1)
      : Promise.resolve({ data: [] as { id: string }[] }),
    bloqueadoNaEmpresa(vaga.company_id, { id: perfil.id, telefone: perfil.telefone }),
  ]);
  const emp = Array.isArray(vaga.companies) ? vaga.companies[0] : vaga.companies;
  return {
    app,
    perfil,
    vaga,
    ficha,
    empresa: emp?.nome_fantasia || emp?.razao_social || "a empresa",
    regra: podeEnviarEncerramento({
      descadastrado: (optOut ?? []).length > 0,
      bloqueado: bloqueado || !!perfil.blacklisted,
      jaEnviada: (enviada ?? []).length > 0,
      statusCandidatura: app.status,
      decididaEm: app.updated_at ? new Date(app.updated_at) : null,
    }),
  };
}

export type EstadoDevolutiva = { erro: string | null; ok: boolean; id: string | null; avisos: string[] };

export async function gerarDevolutiva(_a: EstadoDevolutiva, formData: FormData): Promise<EstadoDevolutiva> {
  const falha = (erro: string): EstadoDevolutiva => ({ erro, ok: false, id: null, avisos: [] });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const appId = String(formData.get("application_id") ?? "");
    if (!UUID.test(jobId) || !UUID.test(appId)) return falha("Escolha o candidato.");
    const tipo = String(formData.get("tipo") ?? "");
    const canal = String(formData.get("canal") ?? "");
    const tom = String(formData.get("tom") ?? "formal");
    if (!tipoValido(tipo)) return falha("Escolha o tipo: aprovação, genérica ou com feedback.");
    if (!canalValido(canal)) return falha("Escolha o canal.");
    if (!tomValido(tom)) return falha("Tom inválido.");

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    const ctx = await contexto(admin, jobId, appId);
    if (!ctx) return falha("Candidatura não encontrada nesta vaga.");
    if (!ctx.regra.ok) return falha(ctx.regra.motivo ?? "Envio não permitido para esta pessoa.");

    let fortes = String(formData.get("fortes") ?? "").trim().slice(0, 400);
    let melhoria = String(formData.get("melhoria") ?? "").trim().slice(0, 400);
    if (tipo === "feedback") {
      if (!fortes) fortes = (ctx.ficha?.pontos_fortes ?? "").trim().slice(0, 400);
      if (!melhoria) melhoria = (ctx.ficha?.pontos_atencao ?? "").trim().slice(0, 400);
      if (!fortes || !melhoria) {
        return falha("Sem pontos fortes e de melhoria (da ficha ou digitados), só a devolutiva genérica é permitida.");
      }
    }
    const dados: DadosDevolutiva = {
      nome: ctx.perfil.nome_completo.split(/\s+/)[0] ?? "",
      cargo: ctx.vaga.titulo,
      empresa: ctx.empresa,
      recrutador: String(formData.get("recrutador") ?? "").trim().slice(0, 80) || "Equipe de Recrutamento",
      tom,
      fortes,
      melhoria,
      proximo_passo: String(formData.get("proximo_passo") ?? "").trim().slice(0, 300),
      prazo: String(formData.get("prazo") ?? "").trim().slice(0, 80),
      documentos: listaDeTexto(String(formData.get("documentos") ?? "")).slice(0, 10),
      banco_talentos: formData.get("banco_talentos") === "sim",
    };
    if (tipo === "aprovacao" && (!dados.proximo_passo || !dados.prazo)) {
      return falha("A aprovação exige o próximo passo e o prazo.");
    }

    const texto = textoBase(tipo, canal, dados);
    const { data: criado, error } = await admin
      .from("candidate_feedbacks")
      .insert({
        job_id: jobId,
        application_id: appId,
        tipo,
        canal,
        texto,
        dados: dados as unknown as Json,
        criado_por: user.id,
      })
      .select("id")
      .single();
    if (error || !criado) return falha("Não foi possível salvar o rascunho.");

    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "devolutiva_rascunho_gerada",
      objeto_tipo: "application",
      objeto_id: appId,
      depois: { tipo, canal },
    });
    revalidatePath(`/admin/vagas/${jobId}/devolutivas`);
    const avisos = sugerirTipo({ fichaFechada: !!ctx.ficha, statusCandidatura: ctx.app.status }).sugerirLigacao && tipo === "feedback" && canal !== "ligacao"
      ? ["Para finalista, uma ligação costuma ser melhor que texto: gere também o roteiro de ligação."]
      : [];
    return { erro: null, ok: true, id: criado.id, avisos };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível gerar agora. Tente de novo.");
  }
}

export type EstadoLote = { erro: string | null; geradas: number; puladas: string[] };

/** Genérica em lote: um rascunho por pessoa, todos para revisão. */
export async function gerarLote(_a: EstadoLote, formData: FormData): Promise<EstadoLote> {
  const falha = (erro: string): EstadoLote => ({ erro, geradas: 0, puladas: [] });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    if (!UUID.test(jobId)) return falha("Vaga inválida.");
    const ids = [...new Set(formData.getAll("ids").map(String).filter((x) => UUID.test(x)))].slice(0, 100);
    if (ids.length === 0) return falha("Marque os candidatos do lote.");
    const tom = String(formData.get("tom") ?? "formal");
    if (!tomValido(tom)) return falha("Tom inválido.");
    const recrutador = String(formData.get("recrutador") ?? "").trim().slice(0, 80) || "Equipe de Recrutamento";

    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    let geradas = 0;
    const puladas: string[] = [];
    for (const appId of ids) {
      const ctx = await contexto(admin, jobId, appId);
      if (!ctx) continue;
      const nome = ctx.perfil.nome_completo.split(/\s+/)[0] ?? "Candidato";
      if (!ctx.regra.ok) {
        puladas.push(`${nome}: ${ctx.regra.motivo}`);
        continue;
      }
      const dados: DadosDevolutiva = {
        nome,
        cargo: ctx.vaga.titulo,
        empresa: ctx.empresa,
        recrutador,
        tom,
        fortes: "",
        melhoria: "",
        proximo_passo: "",
        prazo: "",
        documentos: [],
        banco_talentos: false,
      };
      const { error } = await admin.from("candidate_feedbacks").insert({
        job_id: jobId,
        application_id: appId,
        tipo: "generica" satisfies TipoDevolutiva,
        canal: "whatsapp",
        texto: textoBase("generica", "whatsapp", dados),
        dados: dados as unknown as Json,
        criado_por: user.id,
      });
      if (error) puladas.push(`${nome}: não foi possível salvar.`);
      else geradas += 1;
    }
    await admin.from("audit_log").insert({
      ator_id: user.id,
      acao: "devolutiva_lote_gerado",
      objeto_tipo: "job",
      objeto_id: jobId,
      depois: { geradas, puladas: puladas.length },
    });
    revalidatePath(`/admin/vagas/${jobId}/devolutivas`);
    return { erro: null, geradas, puladas };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível gerar o lote agora.");
  }
}

export type EstadoEnvio = { erro: string | null; ok: boolean; enviada: boolean; bloqueios: string[]; avisos: string[] };

/** Salva a edição e, se pedido, registra que a pessoa enviou (uma única vez). */
export async function salvarDevolutiva(_a: EstadoEnvio, formData: FormData): Promise<EstadoEnvio> {
  const falha = (erro: string, bloqueios: string[] = []): EstadoEnvio => ({ erro, ok: false, enviada: false, bloqueios, avisos: [] });
  try {
    const { user, role } = await requireInternalUser("jobs.manage");
    const jobId = String(formData.get("job_id") ?? "");
    const fbId = String(formData.get("feedback_id") ?? "");
    if (!UUID.test(jobId) || !UUID.test(fbId)) return falha("Dados inválidos.");
    const escopo = await obterEscopo(user.id, role);
    await exigirVaga(escopo, jobId);
    const admin = createAdminClient();
    const { data: fb } = await admin
      .from("candidate_feedbacks")
      .select("id, job_id, application_id, tipo, canal, status, dados, criado_por")
      .eq("id", fbId)
      .eq("job_id", jobId)
      .maybeSingle();
    if (!fb) return falha("Devolutiva não encontrada.");
    const gestao = role === "superadmin" || role === "admin" || role === "admin_empresa";
    if (!gestao && fb.criado_por !== user.id) return falha("Sem acesso a esta devolutiva.");
    if (fb.status === "enviada") return falha("Esta devolutiva já foi enviada e não muda.");

    const texto = String(formData.get("texto") ?? "").trim().slice(0, 3000);
    if (texto.length < 20) return falha("O texto está muito curto.");
    const dados = fb.dados as unknown as DadosDevolutiva;
    const vs = verificarDevolutiva(texto, {
      tipo: fb.tipo as TipoDevolutiva,
      nome: dados.nome,
      cargo: dados.cargo,
      bancoTalentos: dados.banco_talentos,
      proximoPasso: dados.proximo_passo,
      prazo: dados.prazo,
      fortes: dados.fortes,
      melhoria: dados.melhoria,
    });
    const avisos = vs.filter((v) => v.nivel === "aviso").map((v) => v.mensagem);
    const marcar = formData.get("enviada") === "sim";

    if (marcar) {
      const bloqueios = vs.filter((v) => v.nivel === "bloqueio").map((v) => v.mensagem);
      if (temBloqueioDevolutiva(vs)) return falha("O texto ainda não pode ser enviado.", bloqueios);
      const ctx = await contexto(admin, jobId, fb.application_id);
      if (!ctx) return falha("Candidatura não encontrada.");
      if (!ctx.regra.ok) return falha(ctx.regra.motivo ?? "Envio não permitido.");
    }

    const agora = new Date().toISOString();
    const { error } = await admin
      .from("candidate_feedbacks")
      .update({
        texto,
        status: marcar ? "enviada" : "rascunho",
        enviada_por: marcar ? user.id : null,
        enviada_em: marcar ? agora : null,
        updated_at: agora,
      })
      .eq("id", fb.id)
      .eq("status", "rascunho");
    if (error) {
      // O índice parcial barra a segunda devolutiva enviada da mesma candidatura.
      return falha(marcar ? "Já existe uma devolutiva enviada para esta candidatura." : "Não foi possível salvar.");
    }
    if (marcar) {
      await admin.from("audit_log").insert({
        ator_id: user.id,
        acao: "devolutiva_enviada",
        objeto_tipo: "application",
        objeto_id: fb.application_id,
        depois: { tipo: fb.tipo, canal: fb.canal },
      });
    }
    revalidatePath(`/admin/vagas/${jobId}/devolutivas`);
    return { erro: null, ok: true, enviada: marcar, bloqueios: [], avisos };
  } catch (e) {
    if (ehRedirect(e)) throw e;
    return falha("Não foi possível salvar agora.");
  }
}
