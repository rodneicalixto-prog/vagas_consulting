import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/ui";
import { SubmitButton } from "@/components/form-buttons";
import { atualizarDadosPessoais } from "./actions";

export default async function DadosPessoaisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome_completo, cidade, telefone, endereco")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      <BackHeader title="Dados pessoais" backHref="/perfil" />

      <form action={atualizarDadosPessoais} className="flex flex-col gap-4 px-5 pb-6 md:px-8">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-2">Nome completo *</span>
          <input
            name="nome_completo"
            required
            defaultValue={profile?.nome_completo ?? ""}
            className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
          />
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-2">Cidade *</span>
            <input
              name="cidade"
              required
              defaultValue={profile?.cidade ?? ""}
              className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-2">Telefone *</span>
            <input
              name="telefone"
              required
              defaultValue={profile?.telefone ?? ""}
              placeholder="(11) 90000-0000"
              className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-2">Endereço completo *</span>
          <input
            name="endereco"
            required
            defaultValue={profile?.endereco ?? ""}
            placeholder="Rua, número, bairro, cidade"
            className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
          />
        </label>

        <SubmitButton
          pendingLabel="Salvando..."
          className="mt-2 w-full rounded-xl bg-gold px-0 py-3.5 text-[14.5px] font-extrabold text-[#1c1508]"
        >
          Salvar
        </SubmitButton>
      </form>
    </div>
  );
}
