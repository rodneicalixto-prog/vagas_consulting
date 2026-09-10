import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { modalidadeLabel, modalidadeTagClass, timeAgo, companyInitial } from "@/lib/format";
import { Tag } from "@/components/ui";
import { IconSearch, IconFilter, IconHeart } from "@/components/icons";

export default async function VagasPage() {
  const supabase = await createClient();
  const { data: vagas } = await supabase
    .from("jobs")
    .select(
      "id, titulo, local, modelo_trabalho, modalidade, remuneracao_texto, publicada_em, companies(nome_fantasia, razao_social)",
    )
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
          vagas.map((v) => {
            const empresa = v.companies?.nome_fantasia ?? v.companies?.razao_social ?? "Empresa";
            const remoto = v.modelo_trabalho === "remoto";
            return (
              <Link
                href={`/vagas/${v.id}`}
                key={v.id}
                className="group flex flex-col gap-3 rounded-[15px] border border-border bg-surface p-[15px] transition-colors hover:border-navy/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-bg text-[14px] font-extrabold text-navy">
                      {companyInitial(empresa)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-bold text-text-2">{empresa}</div>
                      {v.publicada_em && (
                        <div className="text-[10.5px] text-text-3">{timeAgo(v.publicada_em)}</div>
                      )}
                    </div>
                  </div>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-bg">
                    <IconHeart className="text-text-2" />
                  </span>
                </div>

                <h4 className="text-[14.5px] font-extrabold leading-snug">{v.titulo}</h4>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Tag className={modalidadeTagClass[v.modalidade]}>{modalidadeLabel[v.modalidade]}</Tag>
                  {remoto ? (
                    <Tag className="bg-success-bg text-success">Remoto</Tag>
                  ) : (
                    v.local && <span className="text-[11.5px] text-text-2">📍 {v.local}</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  {v.remuneracao_texto ? (
                    <div className="text-[13px] font-extrabold text-navy">{v.remuneracao_texto}</div>
                  ) : (
                    <div className="text-[12.5px] font-semibold text-text-3">A combinar</div>
                  )}
                  <span className="rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-bold text-navy transition-colors group-hover:border-navy group-hover:bg-navy group-hover:text-white">
                    Ver vaga
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <p className="px-1 text-[12.5px] text-text-3">Nenhuma vaga publicada no momento.</p>
        )}
      </div>
    </div>
  );
}
