"use server";

import { redirect } from "next/navigation";
import { checkBotId } from "botid/server";
import { createClient } from "@/lib/supabase/server";
import { extrairDadosCurriculo, type CurriculoExtraido } from "@/lib/ai/curriculo";

export type ExperienciaProfissional = {
  empresa: string;
  cargo: string;
  inicio: string;
  fim: string;
  motivoSaida: string;
};

const TIPOS_ACEITOS = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5MB

export type ProcessarCurriculoState = {
  error?: string;
  curriculoUrl?: string;
  sugestao?: CurriculoExtraido;
};

/**
 * Sobe o arquivo de currículo pro Storage e pede à IA os dados estruturados.
 * O retorno é só sugestão — nunca grava em profiles diretamente aqui;
 * quem grava é salvarExperiencias(), depois do candidato revisar/confirmar
 * os campos pré-preenchidos no formulário.
 */
export async function processarCurriculo(file: File): Promise<ProcessarCurriculoState> {
  const { isBot } = await checkBotId();
  if (isBot) {
    return { error: "Não foi possível processar o arquivo. Tente de novo." };
  }

  if (!TIPOS_ACEITOS.has(file.type)) {
    return { error: "Envie um PDF, PNG, JPG ou WEBP." };
  }
  if (file.size > TAMANHO_MAXIMO_BYTES) {
    return { error: "Arquivo muito grande (máximo 5MB)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const buffer = Buffer.from(await file.arrayBuffer());
  const nomeSeguro = file.name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "");
  const caminho = `${user.id}/${Date.now()}-${nomeSeguro}`;

  // Upload e extração por IA são independentes (ambos só precisam do buffer já em
  // memória) — rodam em paralelo em vez de em série pra reduzir o tempo de espera.
  const [{ error: uploadError }, extracao] = await Promise.all([
    supabase.storage.from("curriculos").upload(caminho, buffer, {
      contentType: file.type,
      upsert: false,
    }),
    extrairDadosCurriculo(buffer, file.type)
      .then((sugestao) => ({ sugestao, erro: false as const }))
      .catch(() => ({ sugestao: undefined, erro: true as const })),
  ]);

  if (uploadError) {
    return { error: "Não foi possível salvar o arquivo. Tente de novo." };
  }

  // Upload já salvo mesmo se a extração falhar — o path nunca pode se perder aqui,
  // senão o arquivo fica órfão no bucket e o candidato tem que reanexar do zero.
  if (extracao.erro) {
    return {
      curriculoUrl: caminho,
      error: "Currículo salvo, mas não deu pra ler os dados automaticamente. Preencha manualmente.",
    };
  }

  return { curriculoUrl: caminho, sugestao: extracao.sugestao };
}

export async function salvarExperiencias(
  nuncaTrabalhou: boolean,
  experiencias: ExperienciaProfissional[],
  curriculoPath?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  if (!nuncaTrabalhou) {
    const validas = experiencias.filter((e) => e.empresa.trim() && e.cargo.trim());
    if (validas.length === 0) {
      throw new Error("Informe pelo menos uma experiência ou marque 'Nunca trabalhei antes'.");
    }
  }

  // curriculoPath vem do cliente (estado do formulário) — nunca confiar sem validar
  // que aponta pra dentro da própria pasta do usuário no bucket. Sem isso, um
  // cliente malicioso poderia forjar o path de outro candidato (IDOR).
  const curriculoPathValido =
    curriculoPath && curriculoPath.startsWith(`${user.id}/`) && !curriculoPath.includes("..")
      ? curriculoPath
      : undefined;

  const { error } = await supabase
    .from("profiles")
    .update({
      nunca_trabalhou: nuncaTrabalhou,
      experiencias_profissionais: nuncaTrabalhou ? [] : experiencias,
      // curriculo_url guarda o path dentro do bucket privado "curriculos", não uma
      // URL pública — o link assinado é gerado sob demanda em quem exibe (admin).
      ...(curriculoPathValido ? { curriculo_url: curriculoPathValido } : {}),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error("Não foi possível salvar. Tente de novo.");
  }

  redirect("/inicio");
}
