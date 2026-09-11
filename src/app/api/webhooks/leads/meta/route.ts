import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Meta (Instagram + Facebook) Lead Ads webhook.
 *
 * Requires a Meta App with `leads_retrieval` permission and a webhook
 * subscription on the `leadgen` field, configured by Rodnei in Meta
 * Business Suite — this endpoint alone cannot create that App.
 *
 * Env vars (not set yet — endpoint is inert until they are):
 * - META_LEADS_VERIFY_TOKEN: arbitrary string chosen when configuring the
 *   webhook subscription, echoed back during the GET handshake.
 * - META_APP_SECRET: used to validate the X-Hub-Signature-256 header on
 *   every POST — never accept a payload that fails this check.
 * - META_PAGE_ACCESS_TOKEN: required to fetch the actual field answers
 *   (name/email/phone) via a follow-up Graph API call — Meta's webhook
 *   payload only carries `leadgen_id` and campaign/ad IDs, never the
 *   candidate's answers directly (privacy design on Meta's side).
 */

function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export async function GET(request: NextRequest) {
  const verifyToken = process.env.META_LEADS_VERIFY_TOKEN;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (!verifyToken) {
    return NextResponse.json({ error: "META_LEADS_VERIFY_TOKEN não configurado" }, { status: 503 });
  }
  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verificação inválida" }, { status: 403 });
}

type MetaLeadgenChange = {
  field: string;
  value?: {
    leadgen_id?: string;
    page_id?: string;
    form_id?: string;
    ad_id?: string;
    adgroup_id?: string;
  };
};

type MetaField = { name: string; values: string[] };

function extractContact(fields: MetaField[]) {
  const get = (...keys: string[]) =>
    fields.find((f) => keys.includes(f.name.toLowerCase()))?.values?.[0];
  return {
    nome: get("full_name", "nome_completo", "name"),
    email: get("email"),
    telefone: get("phone_number", "telefone"),
  };
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  const rawBody = await request.text();

  if (!appSecret) {
    // Ack fast (Meta expects 200) but do not process without a way to verify origin.
    return NextResponse.json({ warning: "META_APP_SECRET não configurado — evento ignorado" }, { status: 200 });
  }
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const body = JSON.parse(rawBody) as {
    entry?: { changes?: MetaLeadgenChange[] }[];
  };

  const admin = createAdminClient();

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen" || !change.value?.leadgen_id) continue;
      const { leadgen_id, form_id, ad_id, page_id } = change.value;

      if (!pageAccessToken) {
        // Sem token de página não dá pra buscar os dados do lead (nome/e-mail/telefone) —
        // leads.email/telefone são NOT NULL, então não insere um registro incompleto.
        continue;
      }

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${leadgen_id}?access_token=${pageAccessToken}`,
      );
      if (!res.ok) continue;
      const data = (await res.json()) as { field_data?: MetaField[]; campaign_id?: string };
      const contato = extractContact(data.field_data ?? []);
      if (!contato.email || !contato.telefone) continue;

      await admin.from("leads").insert({
        nome_completo: contato.nome ?? "Sem nome",
        email: contato.email,
        telefone: contato.telefone,
        origem: "meta_ads",
        plataforma_origem: "meta",
        campanha_id: data.campaign_id ?? null,
        anuncio_id: ad_id ?? page_id ?? null,
        formulario_id: form_id ?? null,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
