import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { ordenarRanking, ranqueamentoParaCsv, type ResultadoTriagem } from "@/lib/triagem";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ranking da triagem em planilha: só os campos que a tela já mostra. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Vaga inválida.", { status: 400 });
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: telas } = await admin
    .from("job_screenings")
    .select("candidate_id, resultado")
    .eq("job_id", id)
    .limit(1000);
  const ids = [...new Set((telas ?? []).map((t) => t.candidate_id))];
  const { data: perfis } = ids.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", ids)
    : { data: [] as { id: string; nome_completo: string }[] };
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));

  const linhas = ordenarRanking(
    (telas ?? []).map((t) => ({
      nome: nome.get(t.candidate_id) ?? "Candidato",
      resultado: t.resultado as unknown as ResultadoTriagem,
    })),
  );
  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "triagem_exportada",
    objeto_tipo: "job",
    objeto_id: id,
    depois: { linhas: linhas.length },
  });

  return new NextResponse(ranqueamentoParaCsv(linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="triagem-${id.slice(0, 8)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
