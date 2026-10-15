import "server-only";

import { NextResponse } from "next/server";
import { gerarDocx, MIME_DOCX, nomeDeArquivo, type BlocoDocx } from "@/lib/docx";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidValido(v: string): boolean {
  return UUID.test(v);
}

/** Resposta de download .docx, sem cache (o conteúdo é do usuário). */
export function respostaDocx(blocos: BlocoDocx[], nome: string): NextResponse {
  const bytes = gerarDocx(blocos);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": MIME_DOCX,
      "Content-Disposition": `attachment; filename="${nomeDeArquivo(nome)}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function pode(role: string): boolean {
  return role === "superadmin" || role === "admin" || role === "admin_empresa";
}
