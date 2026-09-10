"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ExperienciaProfissional = {
  empresa: string;
  cargo: string;
  inicio: string;
  fim: string;
  motivoSaida: string;
};

export async function salvarExperiencias(
  nuncaTrabalhou: boolean,
  experiencias: ExperienciaProfissional[],
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

  await supabase
    .from("profiles")
    .update({
      nunca_trabalhou: nuncaTrabalhou,
      experiencias_profissionais: nuncaTrabalhou ? [] : experiencias,
    })
    .eq("id", user.id);

  redirect("/inicio");
}
