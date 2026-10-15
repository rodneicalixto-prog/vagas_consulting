import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { obterEscopo, podeVerEmpresa } from "@/lib/auth/escopo";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Entrega o anexo de uma mensagem: confere o escopo da empresa e redireciona
 * para um link temporário do bucket privado. O endereço desta rota é estável,
 * então o player de áudio não reinicia quando a tela atualiza sozinha.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const { id } = await params;
  const naoEncontrado = () => new NextResponse("Não encontrado", { status: 404 });
  if (!UUID.test(id)) return naoEncontrado();

  const admin = createAdminClient();
  const { data: msg } = await admin
    .from("conversation_messages")
    .select("anexo_path, anexo_nome, tipo, conversation_id")
    .eq("id", id)
    .maybeSingle();
  if (!msg?.anexo_path) return naoEncontrado();

  const { data: conversa } = await admin
    .from("conversations")
    .select("company_id")
    .eq("id", msg.conversation_id)
    .maybeSingle();
  const escopo = await obterEscopo(user.id, role);
  // Fora do escopo responde igual a "não existe": não revela que o arquivo existe.
  if (!conversa || !podeVerEmpresa(escopo, conversa.company_id)) return naoEncontrado();

  const { data: link } = await admin.storage
    .from("conversas-anexos")
    .createSignedUrl(msg.anexo_path, 120, msg.tipo === "documento" ? { download: msg.anexo_nome ?? true } : undefined);
  if (!link?.signedUrl) return naoEncontrado();

  const resposta = NextResponse.redirect(link.signedUrl, 302);
  resposta.headers.set("Cache-Control", "private, no-store");
  return resposta;
}
