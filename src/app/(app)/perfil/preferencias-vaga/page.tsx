import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/ui";
import { PreferenciasForm } from "./preferencias-form";

export default async function PreferenciasVagaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("modelo_trabalho, modalidades_desejadas, disponibilidade")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      <BackHeader title="Preferências de vaga" backHref="/perfil" />
      <PreferenciasForm
        modeloTrabalhoInicial={profile?.modelo_trabalho ?? []}
        modalidadesInicial={profile?.modalidades_desejadas ?? []}
        disponibilidadeInicial={profile?.disponibilidade ?? "Imediata"}
      />
    </div>
  );
}
