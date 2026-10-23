import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { decifrar } from "@/lib/crypto-segredos";

const experienciaSchema = z.object({
  empresa: z.string(),
  cargo: z.string(),
  inicio: z.string().describe("Mês/ano de início, formato livre igual ao currículo"),
  fim: z.string().describe("Mês/ano de fim, ou 'Atual' se for o emprego atual"),
  motivoSaida: z.string().describe("Motivo de saída, vazio se não mencionado ou se for o emprego atual"),
});

export const curriculoExtraidoSchema = z.object({
  nomeCompleto: z.string().nullable().describe("Nome completo do candidato, se identificável"),
  telefone: z.string().nullable().describe("Telefone, se presente no currículo"),
  cidade: z.string().nullable().describe("Cidade/UF, se presente"),
  tituloProfissional: z.string().nullable().describe("Cargo/título profissional principal do candidato"),
  experiencias: z
    .array(experienciaSchema)
    .describe("Experiências profissionais em ordem cronológica decrescente (mais recente primeiro)"),
});

export type CurriculoExtraido = z.infer<typeof curriculoExtraidoSchema>;

/**
 * Extrai dados estruturados de um currículo anexado (PDF ou imagem) via IA.
 * Nunca é gravado direto no perfil — o resultado só serve de sugestão pra
 * pré-preencher o formulário de /experiencias, que o candidato revisa e
 * confirma antes de salvar.
 */
const INSTRUCAO =
  "Extraia os dados deste currículo e responda somente com JSON nas chaves: nomeCompleto, telefone, cidade, tituloProfissional (texto ou null) e experiencias (lista de objetos com empresa, cargo, inicio, fim, motivoSaida). Experiências em ordem cronológica decrescente. Se um campo não estiver presente, use null ou texto vazio; nunca invente dado.";

/** Chave OpenAI da plataforma, lida do cofre (a mesma usada na transcrição de áudio). */
async function chaveOpenAI(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("integration_credentials")
    .select("segredo_cifrado")
    .eq("escopo", "plataforma")
    .eq("provedor", "openai")
    .maybeSingle();
  if (!data?.segredo_cifrado) throw new Error("Chave OpenAI não cadastrada no cofre.");
  return decifrar(data.segredo_cifrado);
}

/**
 * Lê o currículo com a OpenAI direto (chave do cofre), sem AI Gateway, que
 * exige cartão de crédito na conta da Vercel.
 */
export async function extrairDadosCurriculo(
  fileBuffer: Buffer,
  mediaType: string,
): Promise<CurriculoExtraido> {
  const chave = await chaveOpenAI();
  const base64 = fileBuffer.toString("base64");
  const anexo =
    mediaType === "application/pdf"
      ? { type: "file", file: { filename: "curriculo.pdf", file_data: `data:application/pdf;base64,${base64}` } }
      : { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [{ type: "text", text: INSTRUCAO }, anexo] }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`OpenAI recusou a leitura do currículo (HTTP ${r.status}).`);

  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const bruto = JSON.parse(j.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const parsed = curriculoExtraidoSchema.safeParse({
    nomeCompleto: bruto.nomeCompleto ?? null,
    telefone: bruto.telefone ?? null,
    cidade: bruto.cidade ?? null,
    tituloProfissional: bruto.tituloProfissional ?? null,
    experiencias: Array.isArray(bruto.experiencias) ? bruto.experiencias : [],
  });
  if (!parsed.success) throw new Error("Resposta da IA fora do formato esperado.");
  return parsed.data;
}
