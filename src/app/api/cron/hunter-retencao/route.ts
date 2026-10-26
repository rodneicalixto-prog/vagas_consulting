import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAMPOS_ANONIMIZADOS } from "@/lib/hunter-servidor";

export const dynamic = "force-dynamic";

/** Estados de quem já interagiu: não são apagados pela retenção (candidatou, abriu o link ou respondeu). */
const PROTEGIDOS = ["clicou", "candidatou", "respondeu"];

/**
 * Retenção do hunter (LGPD): passados 30 dias, quem não interagiu tem nome, contato, perfil, avaliação e
 * mensagem apagados. Ficam só os hashes do contato, para nunca mais importar nem abordar a mesma pessoa.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") || "";
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const agora = new Date().toISOString();
  const alvo = () =>
    admin
      .from("hunter_prospects")
      .update({ ...CAMPOS_ANONIMIZADOS, anonimizado_em: agora, updated_at: agora })
      .is("anonimizado_em", null)
      .lte("retencao_ate", agora)
      .not("estado", "in", `(${PROTEGIDOS.join(",")})`);

  // "Não contactar" continua assim; os demais viram "expirado".
  const { data: bloqueados, error: e1 } = await alvo().eq("estado", "nao_contactar").select("id");
  const { data: expirados, error: e2 } = await alvo().neq("estado", "nao_contactar").select("id");
  if (e1 || e2) {
    console.error("[CRON] hunter-retencao falhou");
    return NextResponse.json({ error: "Falha na retenção" }, { status: 500 });
  }
  // `.update` acima não troca o estado dos expirados; faz em seguida só para os recém-anonimizados.
  const ids = (expirados ?? []).map((r) => r.id);
  if (ids.length > 0) await admin.from("hunter_prospects").update({ estado: "expirado" }).in("id", ids);

  return NextResponse.json({ anonimizados: (bloqueados?.length ?? 0) + ids.length });
}
