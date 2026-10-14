import { NextResponse, type NextRequest } from "next/server";
import { sanitizarDestino } from "@/lib/destino";
import { guardarDestino } from "@/lib/destino-cookie";

/**
 * Ponte do layout do candidato: guarda a página que a pessoa queria abrir
 * (cookies não podem ser gravados em layouts) e a leva à etapa do cadastro
 * que falta. Ao concluir, o cadastro devolve para essa página.
 */
export async function GET(request: NextRequest) {
  const etapa = request.nextUrl.searchParams.get("etapa");
  const destino = sanitizarDestino(request.nextUrl.searchParams.get("to"));
  if (destino) await guardarDestino(destino);

  const alvo = etapa === "experiencias" ? "/experiencias" : "/onboarding";
  return NextResponse.redirect(new URL(alvo, request.url));
}
