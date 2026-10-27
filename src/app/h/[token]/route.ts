import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOKEN_RE } from "@/lib/hunter";

export const dynamic = "force-dynamic";

/** Prévia de link (WhatsApp, redes, buscadores) não é a pessoa abrindo: não conta como clique. */
const ROBO = /whatsapp|facebookexternalhit|twitterbot|slackbot|telegrambot|googlebot|bingbot|linkedinbot|preview|crawler|spider/i;

/**
 * Link rastreado do hunter: /h/<token>. Sem dado pessoal na URL.
 * Marca o clique, guarda o token num cookie (para a candidatura saber a origem) e leva à vaga.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const origem = request.nextUrl.origin;
  const paraVitrine = () => NextResponse.redirect(new URL("/vagas", origem));
  if (!TOKEN_RE.test(token)) return paraVitrine();

  const admin = createAdminClient();
  const { data: p } = await admin.from("hunter_prospects").select("id, job_id, estado, clicou_em").eq("token", token).maybeSingle();
  if (!p) return paraVitrine();

  const resposta = NextResponse.redirect(new URL(`/vagas/${p.job_id}`, origem));
  // Quem pediu para sair não é rastreado, mas a vaga continua pública para quem abrir o link.
  if (p.estado === "nao_contactar") return resposta;

  const eRobo = ROBO.test(request.headers.get("user-agent") ?? "");
  if (!eRobo) {
    if (!p.clicou_em) {
      const agora = new Date().toISOString();
      // Só avança quem ainda estava a caminho; não rebaixa quem já se candidatou ou respondeu.
      const avanca = ["mensagem_pronta", "aprovado", "enviado"].includes(p.estado);
      await admin
        .from("hunter_prospects")
        .update({ clicou_em: agora, ...(avanca ? { estado: "clicou" } : {}), updated_at: agora })
        .eq("id", p.id)
        // Se o estado mudou entre a leitura e a escrita (candidatou, respondeu), não rebaixa.
        .eq("estado", p.estado);
    }
    resposta.cookies.set("hunter_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }
  return resposta;
}
