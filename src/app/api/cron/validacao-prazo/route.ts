import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAutorizado } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Escala os casos da fila de validação que passaram do prazo de 72 h.
 * NÃO decide nada e NÃO fala com o candidato: só marca o caso como alertado (uma única vez) e deixa o rastro
 * na auditoria, por vaga, para a tela de validações destacar o atraso. A decisão continua sendo da pessoa.
 */
export async function GET(request: Request) {
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const agora = new Date().toISOString();
  // Idempotente: só pega quem ainda não foi alertado; a segunda rodada não repete.
  const { data, error } = await admin
    .from("validacoes_reprovacao")
    .update({ alertada_em: agora, updated_at: agora })
    .in("status", ["aguardando", "aguardando_dados"])
    .is("alertada_em", null)
    .lte("prazo_em", agora)
    .select("id, job_id");
  if (error) {
    console.error("[CRON] validacao-prazo falhou");
    return NextResponse.json({ error: "Falha ao escalar prazos" }, { status: 500 });
  }

  const porVaga = new Map<string, number>();
  for (const l of data ?? []) porVaga.set(l.job_id, (porVaga.get(l.job_id) ?? 0) + 1);
  if (porVaga.size > 0) {
    await admin.from("audit_log").insert(
      [...porVaga.entries()].map(([jobId, casos]) => ({
        ator_id: null,
        acao: "validacao_prazo_vencido",
        objeto_tipo: "job",
        objeto_id: jobId,
        depois: { casos },
      })),
    );
  }
  return NextResponse.json({ alertados: data?.length ?? 0, vagas: porVaga.size });
}
