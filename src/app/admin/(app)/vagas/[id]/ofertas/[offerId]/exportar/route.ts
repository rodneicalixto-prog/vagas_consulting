import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { blocosDeTexto } from "@/lib/docx";
import { pode, respostaDocx, uuidValido } from "@/lib/exportar-servidor";

/** Carta-oferta em Word: o mesmo texto da tela, com os campos em branco à mostra. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; offerId: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id, offerId } = await params;
  if (!uuidValido(id) || !uuidValido(offerId)) return new NextResponse("Pedido inválido.", { status: 400 });
  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: o } = await admin
    .from("offer_letters")
    .select("id, texto, versao, criado_por, application_id")
    .eq("id", offerId)
    .eq("job_id", id)
    .maybeSingle();
  if (!o || (!pode(role) && o.criado_por !== user.id)) return new NextResponse("Não encontrada.", { status: 404 });

  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "oferta_exportada_docx",
    objeto_tipo: "application",
    objeto_id: o.application_id,
    depois: { offer_id: o.id, versao: o.versao },
  });
  return respostaDocx(blocosDeTexto(o.texto), `carta-oferta-v${o.versao}`);
}
