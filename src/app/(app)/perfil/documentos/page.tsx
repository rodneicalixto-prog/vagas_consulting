import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/ui";
import { IconDoc } from "@/components/icons";
import { VerDocumentoButton, SubstituirDocumentoButton } from "./documento-actions";

function nomeArquivo(path: string) {
  const ultimoSegmento = path.split("/").pop() ?? path;
  const indice = ultimoSegmento.lastIndexOf("-");
  return indice === -1 ? ultimoSegmento : ultimoSegmento.slice(indice + 1);
}

export default async function DocumentosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("curriculo_url")
    .eq("id", user.id)
    .maybeSingle();

  const curriculoUrl = profile?.curriculo_url ?? null;

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      <BackHeader title="Documentos" backHref="/perfil" />

      <div className="flex flex-col gap-5 px-5 pb-6 md:px-8">
        {curriculoUrl ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-navy-bg text-navy">
                <IconDoc size={16} />
              </span>
              <span className="truncate text-[13px] font-bold">{nomeArquivo(curriculoUrl)}</span>
            </div>
            <VerDocumentoButton />
            <SubstituirDocumentoButton />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-white px-4 py-8 text-center">
            <IconDoc size={22} />
            <p className="text-[12.5px] font-bold text-text">
              Nenhum documento anexado ainda
            </p>
            <Link
              href="/experiencias"
              className="mt-1 rounded-xl bg-gold px-4 py-3 text-[13px] font-extrabold text-[#1c1508]"
            >
              Anexar currículo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
