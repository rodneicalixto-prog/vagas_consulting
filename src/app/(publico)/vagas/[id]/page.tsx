import { nomeEmpresa } from "@/lib/sigilo";
import Link from "next/link";
import { canalValido } from "@/lib/divulgacao";
import { CONVITES_ABERTOS } from "@/lib/convites";
import { exibirRemuneracao } from "@/lib/money";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { modalidadeLabel, modalidadeTagClass } from "@/lib/format";
import { Tag } from "@/components/ui";
import { IconChevronLeft, IconHeart, IconShare } from "@/components/icons";
import { VagaTabs, type Regras } from "./vaga-tabs";

export default async function VagaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ o?: string }>;
}) {
  const { id } = await params;
  const { o } = await searchParams;
  // Marcador de origem da divulgação (3N): só canais conhecidos.
  const origemQs = o && canalValido(o) ? `?o=${o}` : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  // Leitura pública no servidor: só vaga publicada e dentro do prazo.
  const { data: vaga } = await createAdminClient()
    .from("jobs")
    .select(
      "id, titulo, local, modalidade, remuneracao_texto, descricao, regras, confidencial, companies(nome_fantasia, razao_social)",
    )
    .eq("id", id)
    .eq("status", "publicada")
    .or(`expira_em.is.null,expira_em.gt.${new Date().toISOString()}`)
    .maybeSingle();

  if (!vaga) notFound();

  // Só existe "convite" de verdade se houver um registro em `invites` para
  // este candidato e esta vaga, ainda sem resposta.
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
          {nomeEmpresa(vaga.companies, vaga.confidencial)} · {vaga.local}
        </div>
      </div>

      <div className="mt-3.5">
        <VagaTabs
          descricao={vaga.descricao}
          regras={(vaga.regras ?? {}) as Regras}
        />
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
          className="flex-1 rounded-xl bg-gold py-3.5 text-center text-[14px] font-extrabold text-[#1c1508]"
        >
          {convite ? "Responder convite" : user ? "Candidatar-se" : "Entrar para se candidatar"}
        </Link>
      </div>
    </div>
  );
}
