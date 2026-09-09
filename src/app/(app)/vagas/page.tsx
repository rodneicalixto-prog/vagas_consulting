import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { modalidadeLabel, modalidadeTagClass } from "@/lib/format";
import { Tag } from "@/components/ui";
import { IconSearch, IconFilter, IconHeart } from "@/components/icons";

export default async function VagasPage() {
  const supabase = await createClient();
  const { data: vagas } = await supabase
    .from("jobs")
    .select("id, titulo, local, modalidade, remuneracao_texto, companies(nome_fantasia, razao_social)")
    .eq("status", "publicada")
    .order("publicada_em", { ascending: false });

  return (
    <div className="flex flex-col gap-4 pb-8 pt-6 md:pt-8">
      <div className="flex flex-col gap-3 px-5 md:px-8">
        <h1 className="text-[19px] font-extrabold text-navy">Vagas</h1>
        <div className="flex gap-2.5">
          <div className="flex flex-1 items-center gap-2 rounded-[11px] border border-border bg-surface px-3 py-2.5">
            <IconSearch className="text-text-3" />
            <input
              placeholder="Cargo, empresa ou palavra-chave"
              className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-text-3"
            />
          </div>
          <button className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[11px] bg-navy">
            <IconFilter className="text-white" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 md:grid md:grid-cols-2 md:px-8 md:gap-4">
        {vagas && vagas.length > 0 ? (
          vagas.map((v) => (
            <Link
              href={`/vagas/${v.id}`}
              key={v.id}
              className="flex flex-col gap-2 rounded-[15px] border border-border bg-surface p-[15px]"
            >
              <div className="flex items-start justify-between">
                <Tag className={modalidadeTagClass[v.modalidade]}>
                  {modalidadeLabel[v.modalidade]}
                </Tag>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg">
                  <IconHeart className="text-text-2" />
                </span>
              </div>
              <h4 className="text-[14.5px] font-extrabold">{v.titulo}</h4>
              <div className="text-xs font-semibold text-text-2">
                {v.companies?.nome_fantasia ?? v.companies?.razao_social}
              </div>
              <div className="text-[11.5px] text-text-2">📍 {v.local}</div>
              {v.remuneracao_texto && (
                <div className="text-[12.5px] font-extrabold text-navy">{v.remuneracao_texto}</div>
              )}
            </Link>
          ))
        ) : (
          <p className="px-1 text-[12.5px] text-text-3">Nenhuma vaga publicada no momento.</p>
        )}
      </div>
    </div>
  );
}
