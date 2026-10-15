import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import type { BlocoDocx } from "@/lib/docx";
import { pode, respostaDocx, uuidValido } from "@/lib/exportar-servidor";
import { ROTULO_FONTE, ROTULO_RECOMENDACAO, type ConteudoLaudo, type Recomendacao } from "@/lib/laudo";

/** Laudo em Word. `?visao=gestor` omite o texto das evidências, como na tela. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; laudoId: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id, laudoId } = await params;
  if (!uuidValido(id) || !uuidValido(laudoId)) return new NextResponse("Pedido inválido.", { status: 400 });
  const gestor = new URL(req.url).searchParams.get("visao") === "gestor";
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: l } = await admin
    .from("candidate_reports")
    .select("id, application_id, versao, modo, conteudo, recomendacao, status, criado_por, assinado_em")
    .eq("id", laudoId)
    .eq("job_id", id)
    .maybeSingle();
  if (!l || (!pode(role) && l.criado_por !== user.id)) return new NextResponse("Não encontrado.", { status: 404 });

  const [{ data: vaga }, { data: app }] = await Promise.all([
    admin.from("jobs").select("titulo").eq("id", id).maybeSingle(),
    admin.from("applications").select("candidate_id").eq("id", l.application_id).maybeSingle(),
  ]);
  const { data: perfil } = app
    ? await admin.from("profiles").select("nome_completo").eq("id", app.candidate_id).maybeSingle()
    : { data: null };

  const c = l.conteudo as unknown as ConteudoLaudo;
  const rec = l.recomendacao as unknown as Recomendacao | null;
  const b: BlocoDocx[] = [
    { tipo: "titulo", texto: `Laudo do candidato${gestor ? " (resumo para o gestor)" : ""}` },
    { tipo: "paragrafo", texto: `${perfil?.nome_completo ?? "Candidato"} · ${vaga?.titulo ?? "Vaga"} · versão ${l.versao} · ${l.status === "assinado" ? "assinado" : "rascunho"}` },
  ];
  for (const m of c.limitacoes) b.push({ tipo: "item", texto: m });
  b.push({ tipo: "subtitulo", texto: "Fontes" });
  b.push({ tipo: "paragrafo", texto: c.fontes.map((f) => `${ROTULO_FONTE[f.fonte]}: ${f.disponivel ? "usada" : "não avaliado"}`).join(" · ") });
  if (c.resumo) {
    b.push({ tipo: "subtitulo", texto: "Resumo do perfil" });
    b.push({ tipo: "paragrafo", texto: c.resumo });
  }
  b.push({ tipo: "subtitulo", texto: "Quadro cargo × candidato" });
  for (const ln of c.linhas) {
    b.push({ tipo: "paragrafo", texto: `${ln.id} · ${ln.competencia} — ${ln.exige}. Aderência: ${ln.aderencia ?? "não avaliado"}${gestor ? "" : ` (${ln.forca})`}` });
    if (!gestor) {
      if (ln.estado === "avaliado") {
        for (const e of ln.evidencias) b.push({ tipo: "item", texto: `${ROTULO_FONTE[e.fonte]} (${e.nota}): ${e.texto}` });
      } else {
        b.push({ tipo: "item", texto: `Não avaliado. ${ln.como_avaliar}` });
      }
    }
  }
  if (c.fit.length > 0) {
    b.push({ tipo: "subtitulo", texto: "Fit cultural" });
    for (const f of c.fit) b.push({ tipo: "item", texto: `${f.nome}: ${f.nota}${!gestor && f.evidencia ? ` — ${f.evidencia}` : ""}` });
  }
  const listas: [string, string[]][] = [
    ["Pontos fortes", c.fortes],
    ["A validar", c.a_validar],
    ["Divergências entre fontes", c.divergencias],
  ];
  for (const [titulo, itens] of listas) {
    if (itens.length === 0) continue;
    b.push({ tipo: "subtitulo", texto: titulo });
    for (const i of itens) b.push({ tipo: "item", texto: i });
  }
  if (l.modo === "recomendacao" && rec) {
    b.push({ tipo: "subtitulo", texto: `Recomendação: ${ROTULO_RECOMENDACAO[rec.tipo]}` });
    b.push({ tipo: "paragrafo", texto: rec.porque });
    if (rec.condicoes) b.push({ tipo: "paragrafo", texto: `Condições: ${rec.condicoes}` });
    b.push({ tipo: "paragrafo", texto: `Linhas citadas: ${rec.linhas.join(", ")}` });
  }
  if (l.assinado_em) b.push({ tipo: "paragrafo", texto: `Assinado em ${new Date(l.assinado_em).toLocaleDateString("pt-BR")}.` });
  b.push({ tipo: "paragrafo", texto: "Documento confidencial, com dados pessoais: uso restrito à seleção (LGPD)." });

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "laudo_exportado_docx",
    objeto_tipo: "application",
    objeto_id: l.application_id,
    depois: { laudo_id: l.id, visao: gestor ? "gestor" : "completo" },
  });
  return respostaDocx(b, `laudo-v${l.versao}${gestor ? "-gestor" : ""}`);
}
