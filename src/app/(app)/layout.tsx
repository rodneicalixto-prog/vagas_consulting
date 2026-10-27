import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Modo visitante: home e vagas ficam abertas mesmo com o cadastro
  // incompleto; o cadastro só é cobrado ao agir (candidatar, mensagens...).
  const rota = (await headers()).get("x-pathname") ?? "";
  // As vagas públicas (/vagas e /vagas/<id>) moram no grupo (publico).
  const visitante = rota === "/inicio";
  const continuar = (etapa: string) =>
    `/api/cadastro/continuar?etapa=${etapa}&to=${encodeURIComponent(rota)}`;

  if (user && !visitante) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("experiencias_profissionais, nunca_trabalhou")
      .eq("id", user.id)
      .maybeSingle();

    // Conta sem registro de perfil (ex.: criada por convite/admin): só o
    // onboarding cria o perfil, então é para lá que ela precisa ir.
    if (!profile) redirect(continuar("onboarding"));

    const experiencias = Array.isArray(profile?.experiencias_profissionais)
      ? profile.experiencias_profissionais
      : [];
    const precisaCompletar = !!profile && !profile.nunca_trabalhou && experiencias.length === 0;

    if (precisaCompletar) redirect(continuar("experiencias"));
  }

  return <AppShell visitante={!user}>{children}</AppShell>;
}
