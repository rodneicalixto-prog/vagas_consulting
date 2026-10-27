import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAMPOS_ANONIMIZADOS } from "@/lib/hunter-servidor";
import { cronAutorizado } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

/** Quem já interagiu de forma qualificada (candidatou ou respondeu) tem prazo maior que os 30 dias. */
const INTERAGIRAM = ["candidatou", "respondeu"];
/** Depois deste prazo sem movimento, mesmo quem interagiu tem os dados de prospecção apagados. */
const PRAZO_INTERAGIRAM_DIAS = 180;

/**
 * Retenção do hunter (LGPD):
 * - passados 30 dias do envio, quem não se candidatou nem respondeu (inclui quem só abriu o link) tem nome, contato,
 *   perfil, avaliação e mensagem apagados;
 * - quem se candidatou ou respondeu tem os dados de prospecção apagados após 180 dias sem movimento
 *   (a candidatura tem conta própria e segue sua retenção);
 * - ficam só os hashes do contato, para nunca mais importar nem abordar a mesma pessoa.
 * Cada grupo é uma única escrita: não existe estado intermediário "sem dados, mas aprovado".
 */
export async function GET(request: Request) {
  if (!cronAutorizado(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const agora = new Date();
  const iso = agora.toISOString();
  const limiteInteracao = new Date(agora.getTime() - PRAZO_INTERAGIRAM_DIAS * 24 * 3600 * 1000).toISOString();
  const apagar = (estado: string) => ({ ...CAMPOS_ANONIMIZADOS, estado, anonimizado_em: iso, updated_at: iso });

  // "Não contactar" continua assim; quem só passou pelo funil vira "expirado".
  const { data: bloqueados, error: e1 } = await admin
    .from("hunter_prospects")
    .update(apagar("nao_contactar"))
    .is("anonimizado_em", null)
    .lte("retencao_ate", iso)
    .eq("estado", "nao_contactar")
    .select("id");
  const { data: expirados, error: e2 } = await admin
    .from("hunter_prospects")
    .update(apagar("expirado"))
    .is("anonimizado_em", null)
    .lte("retencao_ate", iso)
    .not("estado", "in", `(nao_contactar,${INTERAGIRAM.join(",")})`)
    .select("id");
  const { data: antigos, error: e3 } = await admin
    .from("hunter_prospects")
    .update(apagar("expirado"))
    .is("anonimizado_em", null)
    .in("estado", INTERAGIRAM)
    .lte("updated_at", limiteInteracao)
    .select("id");
  if (e1 || e2 || e3) {
    console.error("[CRON] hunter-retencao falhou");
    return NextResponse.json({ error: "Falha na retenção" }, { status: 500 });
  }

  return NextResponse.json({
    anonimizados: (bloqueados?.length ?? 0) + (expirados?.length ?? 0) + (antigos?.length ?? 0),
  });
}
