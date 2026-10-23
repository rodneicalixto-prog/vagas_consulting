"use server";

import { redirect } from "next/navigation";
import { criarConvite } from "../convites/actions";

/** Convida do banco de talentos e leva para a tela de convites (feedback). */
export async function convidarDoBanco(formData: FormData) {
  try {
    await criarConvite(formData);
  } catch (e) {
    // Convite já existente: o objetivo (candidato convidado) já foi atingido.
    // Leva para a tela de convites em vez de quebrar a página.
    const jaConvidado = e instanceof Error && e.message.includes("já tem um convite ativo");
    if (!jaConvidado) throw e;
  }
  redirect("/admin/convites");
}
