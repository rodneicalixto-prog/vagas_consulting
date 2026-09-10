import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("experiencias_profissionais, nunca_trabalhou")
      .eq("id", user.id)
      .maybeSingle();

    const experiencias = Array.isArray(profile?.experiencias_profissionais)
      ? profile.experiencias_profissionais
      : [];
    const precisaCompletar = !!profile && !profile.nunca_trabalhou && experiencias.length === 0;

    if (precisaCompletar) redirect("/experiencias");
  }

  return <AppShell>{children}</AppShell>;
}
