import "server-only";
import { generateObject } from "ai";
import { z } from "zod";

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
export async function extrairDadosCurriculo(
  fileBuffer: Buffer,
  mediaType: string,
): Promise<CurriculoExtraido> {
  const { object } = await generateObject({
    model: "anthropic/claude-sonnet-5",
    schema: curriculoExtraidoSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extraia os dados estruturados deste currículo (nome, telefone, cidade, título profissional e experiências profissionais em ordem cronológica decrescente). Se algum campo não estiver presente, retorne null ou string vazia, nunca invente dado.",
          },
          {
            type: "file",
            data: fileBuffer,
            mediaType,
          },
        ],
      },
    ],
  });

  return object;
}
