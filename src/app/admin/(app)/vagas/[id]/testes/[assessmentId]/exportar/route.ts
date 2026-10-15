import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import type { BlocoDocx } from "@/lib/docx";
import { respostaDocx, uuidValido } from "@/lib/exportar-servidor";
import { ROTULO_NOTA, ROTULO_TIPO, folhaDoCandidato, type Instrumento } from "@/lib/avaliacao";

/**
 * Instrumento em Word. `?folha=candidato` (padrão) nunca traz gabarito,
 * critério, rubrica nem grade; `?folha=aplicador` traz tudo.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; assessmentId: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id, assessmentId } = await params;
  if (!uuidValido(id) || !uuidValido(assessmentId)) return new NextResponse("Pedido inválido.", { status: 400 });
  const aplicador = new URL(req.url).searchParams.get("folha") === "aplicador";
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: a } = await admin
    .from("assessments")
    .select("id, status, conteudo")
    .eq("id", assessmentId)
    .eq("job_id", id)
    .maybeSingle();
  if (!a) return new NextResponse("Não encontrado.", { status: 404 });
  const i = a.conteudo as unknown as Instrumento;

  let b: BlocoDocx[];
  if (!aplicador) {
    const f = folhaDoCandidato(i);
    b = [
      { tipo: "titulo", texto: f.titulo },
      { tipo: "paragrafo", texto: `Tempo: ${f.tempo_min} minutos` },
      { tipo: "paragrafo", texto: "Nome: ______________________________   Data: ____/____/____" },
    ];
    if (f.instrucoes) b.push({ tipo: "paragrafo", texto: f.instrucoes });
    if (f.materiais) b.push({ tipo: "paragrafo", texto: `Materiais: ${f.materiais}` });
    for (const q of f.questoes) {
      b.push({ tipo: "subtitulo", texto: `${q.numero}.` });
      b.push({ tipo: "paragrafo", texto: q.enunciado });
      q.alternativas.forEach((alt, k) => b.push({ tipo: "item", texto: `(${String.fromCharCode(97 + k)}) ${alt}` }));
    }
  } else {
    b = [
      { tipo: "titulo", texto: `${i.titulo} · folha do aplicador` },
      { tipo: "paragrafo", texto: `${ROTULO_TIPO[i.tipo]} · ${i.competencia} · ${i.tempo_min} minutos · ${a.status === "aprovado" ? "aprovado" : "rascunho"}` },
    ];
    if (i.instrucoes_candidato) b.push({ tipo: "paragrafo", texto: `Instruções: ${i.instrucoes_candidato}` });
    if (i.materiais) b.push({ tipo: "paragrafo", texto: `Materiais: ${i.materiais}` });
    i.questoes.forEach((q, n) => {
      b.push({ tipo: "subtitulo", texto: `${n + 1}. (mede: ${q.competencia})` });
      b.push({ tipo: "paragrafo", texto: q.enunciado });
      q.alternativas.forEach((alt, k) => b.push({ tipo: "item", texto: `(${String.fromCharCode(97 + k)}) ${alt}` }));
      if (q.gabarito) b.push({ tipo: "paragrafo", texto: `Gabarito: ${q.gabarito}` });
      if (q.criterio) b.push({ tipo: "paragrafo", texto: `Critério: ${q.criterio}` });
    });
    if (i.rubrica.length > 0) {
      b.push({ tipo: "subtitulo", texto: "Rubrica" });
      for (const r of i.rubrica) b.push({ tipo: "item", texto: `${r.nivel} · ${ROTULO_NOTA[r.nivel]}: ${r.descricao}` });
    }
    if (i.grade.length > 0) {
      b.push({ tipo: "subtitulo", texto: "Grade de observação" });
      for (const g of i.grade) {
        b.push({ tipo: "paragrafo", texto: g.comportamento });
        g.niveis.forEach((n, k) => b.push({ tipo: "item", texto: `${k + 1} · ${ROTULO_NOTA[k + 1]}: ${n || "(não descrito)"}` }));
      }
    }
    if (i.observacoes_aplicador) b.push({ tipo: "paragrafo", texto: `Observações: ${i.observacoes_aplicador}` });
    if (i.adaptacoes_pcd) b.push({ tipo: "paragrafo", texto: `Adaptações para PcD (confirme com a pessoa): ${i.adaptacoes_pcd}` });
  }

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "avaliacao_exportada_docx",
    objeto_tipo: "assessment",
    objeto_id: a.id,
    depois: { folha: aplicador ? "aplicador" : "candidato" },
  });
  return respostaDocx(b, `${aplicador ? "aplicador" : "candidato"}-${i.titulo}`);
}
