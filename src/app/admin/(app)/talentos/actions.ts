"use server";

import { redirect } from "next/navigation";
import { criarConvite } from "../convites/actions";

/** Convida do banco de talentos e leva para a tela de convites (feedback). */
export async function convidarDoBanco(formData: FormData) {
  await criarConvite(formData);
  redirect("/admin/convites");
}
