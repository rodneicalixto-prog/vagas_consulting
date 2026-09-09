import Link from "next/link";
import { notFound } from "next/navigation";
import { vagas, vagaRegras, modalidadeLabel, modalidadeTagClass } from "@/lib/mock-data";
import { Tag } from "@/components/ui";
import { IconChevronLeft, IconHeart, IconShare } from "@/components/icons";
import { VagaTabs } from "./vaga-tabs";

export default async function VagaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vaga = vagas.find((v) => v.id === id);
  const regras = vagaRegras[id];
  if (!vaga || !regras) notFound();

  return (
    <div className="flex flex-col pb-6">
      <div className="flex items-center justify-between px-5 pt-6 md:px-8 md:pt-8">
        <Link
          href="/vagas"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border bg-surface"
        >
          <IconChevronLeft />
        </Link>
        <div className="flex gap-2">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border bg-surface">
            <IconHeart />
          </span>
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border bg-surface">
            <IconShare />
          </span>
        </div>
      </div>

      <div className="px-5 pt-3.5 md:px-8">
        <Tag className={modalidadeTagClass[vaga.modalidade]}>
          {modalidadeLabel[vaga.modalidade]}
        </Tag>
        <h2 className="mt-2 text-[18px] font-extrabold">{vaga.titulo}</h2>
        <div className="text-[12.5px] font-semibold text-text-2">
          {vaga.empresa} · {vaga.local}
        </div>
      </div>

      <div className="mt-3.5">
        <VagaTabs regras={regras} />
      </div>

      <div className="flex items-center gap-3 border-t border-border px-5 pt-4 md:px-8">
        <div>
          <div className="text-[10px] font-bold text-text-3">Remuneração</div>
          <div className="text-[15px] font-extrabold text-navy">{vaga.remuneracao}</div>
        </div>
        <Link
          href={`/vagas/${vaga.id}/candidatura`}
          className="flex-1 rounded-xl bg-gold py-3.5 text-center text-[14px] font-extrabold text-[#1c1508]"
        >
          {vaga.modalidade === "temporaria" ? "Aceitar convite" : "Candidatar-se"}
        </Link>
      </div>
    </div>
  );
}
