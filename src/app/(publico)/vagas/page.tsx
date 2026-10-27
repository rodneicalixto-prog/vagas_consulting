import type { Metadata } from "next";
import Link from "next/link";
import { exibirRemuneracao } from "@/lib/money";
import { modalidadeLabel, modalidadeTagClass, timeAgo, companyInitial } from "@/lib/format";
import { nomeParaExibir } from "@/lib/vaga-publica";
import { listarVagasPublicas } from "@/lib/vagas-publicas";
import { Tag } from "@/components/ui";

export const metadata: Metadata = {
  title: "Vagas abertas | Vagas Consulting",
  description:
    "Vagas efetivas, PJ e temporárias publicadas pela Vagas Consulting. Veja os detalhes e candidate-se.",
  alternates: { canonical: "/vagas" },
};

export default async function VagasPage() {
  // Vitrine pública: leitura no servidor, só vaga publicada e dentro do prazo.
  // O nome da empresa é mascarado (vaga confidencial) antes de ir ao HTML.
  const vagas = await listarVagasPublicas();

  return (
    <div className="flex flex-col gap-4 pb-8 pt-6 md:pt-8">
      <div className="flex flex-col gap-1 px-5 md:px-8">
        <h1 className="text-[22px] font-extrabold text-navy">Vagas abertas</h1>
        <p className="text-[13px] text-text-2">
          {vagas.length > 0
            ? `${vagas.length} ${vagas.length === 1 ? "vaga publicada" : "vagas publicadas"}`
            : "Nenhuma vaga publicada no momento."}
        </p>
      </div>

      <div className="flex flex-col gap-3 px-5 md:grid md:grid-cols-2 md:gap-4 md:px-8">
        {vagas.map((v) => {
          const empresa = nomeParaExibir(v);
          const remoto = v.modelo_trabalho === "remoto";
          return (
            <Link
              href={`/vagas/${v.id}`}
              key={v.id}
              className="group flex flex-col gap-3 rounded-[15px] border border-border bg-surface p-[15px] transition-colors hover:border-navy/30"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-bg text-[14px] font-extrabold text-navy">
                  {companyInitial(empresa)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-text-2">{empresa}</div>
                  {v.publicada_em && <div className="text-[10.5px] text-text-3">{timeAgo(v.publicada_em)}</div>}
                </div>
              </div>

              <h2 className="text-[14.5px] font-extrabold leading-snug">{v.titulo}</h2>

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
                  <div className="text-[13px] font-extrabold text-navy">{exibirRemuneracao(v.remuneracao_texto)}</div>
                ) : (
                  <div className="text-[12.5px] font-semibold text-text-3">A combinar</div>
                )}
                <span className="rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-bold text-navy transition-colors group-hover:border-navy group-hover:bg-navy group-hover:text-white">
                  Ver vaga
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
