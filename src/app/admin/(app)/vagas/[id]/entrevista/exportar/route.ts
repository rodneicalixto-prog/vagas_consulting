import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import type { BlocoDocx } from "@/lib/docx";
import { respostaDocx, uuidValido } from "@/lib/exportar-servidor";
import type { Roteiro } from "@/lib/entrevista";

const TIPO = { star: "STAR", situacional: "Situacional", comportamento: "Comportamento" } as const;

/** Roteiro de entrevista vigente, com campos de anotação e nota para a condução. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!uuidValido(id)) return new NextResponse("Pedido inválido.", { status: 400 });
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const [{ data: vaga }, { data: s }] = await Promise.all([
    admin.from("jobs").select("titulo").eq("id", id).maybeSingle(),
    admin
      .from("interview_scripts")
      .select("versao, duracao_min, conteudo")
      .eq("job_id", id)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!s) return new NextResponse("Gere o roteiro antes de exportar.", { status: 404 });
  const r = s.conteudo as unknown as Roteiro;

  const b: BlocoDocx[] = [
    { tipo: "titulo", texto: `Roteiro de entrevista · ${vaga?.titulo ?? "Vaga"}` },
    { tipo: "paragrafo", texto: `Versão ${s.versao} · ${s.duracao_min} minutos` },
    { tipo: "paragrafo", texto: "Candidato: ______________________   Entrevistador: ______________________   Data: ____/____/____" },
    { tipo: "subtitulo", texto: "Abertura" },
    { tipo: "paragrafo", texto: r.abertura },
    { tipo: "subtitulo", texto: "Aquecimento" },
    { tipo: "paragrafo", texto: r.aquecimento },
  ];
  r.itens.forEach((i, n) => {
    b.push({ tipo: "subtitulo", texto: `${n + 1}. ${i.nome} (${TIPO[i.tipo]})` });
    b.push({ tipo: "paragrafo", texto: i.pergunta });
    for (const sd of i.sondagens) b.push({ tipo: "item", texto: sd });
    b.push({ tipo: "paragrafo", texto: `O que observar: ${i.observar}` });
    b.push({ tipo: "paragrafo", texto: "Anotações: ______________________________________________" });
    b.push({ tipo: "paragrafo", texto: "Avaliação: ( ) 1 Não atende   ( ) 2 Parcial   ( ) 3 Atende   ( ) 4 Supera   Evidência: ____________" });
  });
  b.push({ tipo: "subtitulo", texto: "Encerramento" });
  b.push({ tipo: "paragrafo", texto: r.encerramento });
  b.push({ tipo: "subtitulo", texto: "Parecer" });
  b.push({ tipo: "paragrafo", texto: "Recomendação: ( ) Avançar   ( ) Avançar com ressalva   ( ) Não avançar" });
  b.push({ tipo: "paragrafo", texto: "Por quê (comportamento observado): ____________________________________________" });

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "roteiro_exportado_docx",
    objeto_tipo: "job",
    objeto_id: id,
    depois: { versao: s.versao },
  });
  return respostaDocx(b, `roteiro-entrevista-v${s.versao}`);
}
