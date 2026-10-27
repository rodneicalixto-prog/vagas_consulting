import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canalValido } from "@/lib/divulgacao";
import { CONVITES_ABERTOS } from "@/lib/convites";
import { exibirRemuneracao } from "@/lib/money";
import { siteUrl } from "@/lib/hunter-servidor";
import { createClient } from "@/lib/supabase/server";
import { modalidadeLabel, modalidadeTagClass } from "@/lib/format";
import {
  MARCA,
  jsonLdSeguro,
  linksCompartilhar,
  montarJobPosting,
  nomeParaExibir,
  resumoDescricao,
  tituloDaVaga,
} from "@/lib/vaga-publica";
import { buscarVagaPublica } from "@/lib/vagas-publicas";
import { Tag } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";
import { Compartilhar } from "./compartilhar";
import { VagaTabs, type Regras } from "./vaga-tabs";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ o?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { id } = await params;
  const vaga = await buscarVagaPublica(id);
  if (!vaga) return { title: `Vaga não encontrada | ${MARCA}`, robots: { index: false } };

  const titulo = vaga.menciona_empresa ? `Vaga confidencial | ${MARCA}` : tituloDaVaga(vaga);
  const descricao = (vaga.menciona_empresa ? "" : resumoDescricao(vaga.descricao)) || `Vaga de ${vaga.titulo} na ${MARCA}.`;
  // Canonical sem o marcador de origem (?o=).
  const canonical = `${siteUrl()}/vagas/${vaga.id}`;
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: MARCA,
      locale: "pt_BR",
      title: titulo,
      description: descricao,
      url: canonical,
      images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: MARCA }],
    },
    twitter: { card: "summary", title: titulo, description: descricao, images: ["/icons/icon-512.png"] },
  };
}

export default async function VagaDetalhePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { o } = await searchParams;
  // Marcador de origem da divulgação (3N): só canais conhecidos.
  const origemQs = o && canalValido(o) ? `?o=${o}` : "";

  const vaga = await buscarVagaPublica(id);
  if (!vaga) notFound();

  // Só existe "convite" de verdade se houver um registro em `invites` para
  // este candidato e esta vaga, ainda sem resposta.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: convite } = user
    ? await supabase
        .from("invites")
        .select("id")
        .eq("job_id", vaga.id)
        .eq("candidate_id", user.id)
        .in("status", CONVITES_ABERTOS)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const jobPosting = montarJobPosting(vaga, siteUrl());
  const links = linksCompartilhar(siteUrl(), vaga.id, vaga.titulo);

  return (
    <div className="flex flex-col pb-6">
      {jobPosting && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSeguro(jobPosting) }}
        />
      )}

      <div className="px-5 pt-6 md:px-8 md:pt-8">
        <Link
          href="/vagas"
          aria-label="Voltar para as vagas"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border bg-surface"
        >
          <IconChevronLeft />
        </Link>
      </div>

      <div className="px-5 pt-3.5 md:px-8">
        <Tag className={modalidadeTagClass[vaga.modalidade]}>{modalidadeLabel[vaga.modalidade]}</Tag>
        <h1 className="mt-2 text-[20px] font-extrabold">{vaga.titulo}</h1>
        <div className="text-[12.5px] font-semibold text-text-2">
          {nomeParaExibir(vaga)} · {vaga.local}
        </div>
      </div>

      <div className="px-5 pt-3 md:px-8">
        <Compartilhar linkCopiar={links.copiar} linkWhatsapp={links.whatsapp} />
      </div>

      <div className="mt-3.5">
        <VagaTabs descricao={vaga.descricao} regras={(vaga.regras ?? {}) as Regras} />
      </div>

      <div className="flex items-center gap-3 border-t border-border px-5 pt-4 md:px-8">
        {vaga.remuneracao_texto && (
          <div>
            <div className="text-[10px] font-bold text-text-3">Remuneração</div>
            <div className="text-[15px] font-extrabold text-navy">{exibirRemuneracao(vaga.remuneracao_texto)}</div>
          </div>
        )}
        <Link
          href={
            convite
              ? `/convites/${convite.id}`
              : user
                ? `/vagas/${vaga.id}/candidatura${origemQs}`
                : `/login?next=${encodeURIComponent(`/vagas/${vaga.id}/candidatura${origemQs}`)}`
          }
          className="flex-1 rounded-xl bg-gold py-3.5 text-center text-[14px] font-extrabold text-[#1c1508] md:max-w-sm"
        >
          {convite ? "Responder convite" : user ? "Candidatar-se" : "Entrar para se candidatar"}
        </Link>
      </div>
    </div>
  );
}
