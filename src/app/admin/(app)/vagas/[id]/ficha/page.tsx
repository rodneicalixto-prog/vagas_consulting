import Link from "next/link";
import { notFound } from "next/navigation";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { createAdminClient } from "@/lib/supabase/admin";
import { BotaoPdf, CabecalhoImpressao } from "@/components/botao-pdf";
import { siteUrl } from "@/lib/hunter-servidor";
import {
  ROTULO_PERFIL_VAGA,
  fraseDoPerfil,
  normalizarCriterios,
  temBloqueio,
  verificarVaga,
} from "@/lib/vaga-estruturada";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Lista = ({ titulo, itens }: { titulo: string; itens: string[] }) =>
  itens.length === 0 ? null : (
    <section className="mt-5">
      <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-text-3">{titulo}</h2>
      <ul className="mt-1.5 list-disc pl-5 text-[13.5px] leading-relaxed text-text">
        {itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  );

/** Ficha da vaga para imprimir ou salvar em PDF e compartilhar. Vaga sigilosa nunca mostra a empresa. */
export default async function FichaDaVagaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ faixa?: string; empresa?: string }>;
}) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await exigirVaga(await obterEscopo(user.id, role), id);
  const { faixa, empresa: mostrarEmpresaQs } = await searchParams;

  const { data: vaga } = await createAdminClient()
    .from("jobs")
    .select("id, titulo, status, local, modelo_trabalho, modalidade, remuneracao_texto, descricao, requisitos, criterios, confidencial, companies(nome_fantasia, razao_social)")
    .eq("id", id)
    .maybeSingle();
  if (!vaga) notFound();

  const c = normalizarCriterios(vaga.criterios);
  const emp = Array.isArray(vaga.companies) ? vaga.companies[0] : vaga.companies;
  const nomeEmpresa = emp?.nome_fantasia || emp?.razao_social || "";
  // Vaga sigilosa: a empresa nunca aparece na ficha, mesmo que peçam.
  const mostrarEmpresa = !vaga.confidencial && mostrarEmpresaQs === "1" && !!nomeEmpresa;
  const mostrarFaixa = faixa === "1" && !!vaga.remuneracao_texto;
  const verificacoes = verificarVaga({
    titulo: vaga.titulo,
    descricao: vaga.descricao,
    requisitos: vaga.requisitos,
    local: vaga.local,
    modelo_trabalho: vaga.modelo_trabalho,
    remuneracao_texto: vaga.remuneracao_texto,
    criterios: c,
  });
  const bloqueada = temBloqueio(verificacoes);
  const pendencias = verificacoes.filter((v) => v.nivel !== "ok");
  const base = `/admin/vagas/${id}/ficha`;
  const frase = fraseDoPerfil(c.perfil);

  return (
    <div className="h-full overflow-y-auto px-4 md:px-9 py-6">
      <div className="mb-5 rounded-2xl border border-border bg-surface p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-base font-extrabold text-text">Ficha da vaga (PDF)</h1>
          <span className="ml-auto">
            <BotaoPdf nomeDoArquivo={`Vaga - ${vaga.titulo}`} />
          </span>
        </div>
        <p className="mt-1 text-[12px] text-text-2">
          Pronta para compartilhar. Confira abaixo, escolha o que mostrar e use &quot;Exportar PDF&quot; (na janela, escolha &quot;Salvar como PDF&quot;).
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11.5px] font-bold">
          {vaga.remuneracao_texto && (
            <Link href={`${base}?${new URLSearchParams({ ...(mostrarFaixa ? {} : { faixa: "1" }), ...(mostrarEmpresaQs === "1" ? { empresa: "1" } : {}) })}`} className="rounded-full border border-border px-3 py-1 text-navy">
              {mostrarFaixa ? "Ocultar faixa de remuneração" : "Mostrar faixa de remuneração"}
            </Link>
          )}
          {!vaga.confidencial && nomeEmpresa && (
            <Link href={`${base}?${new URLSearchParams({ ...(mostrarFaixa ? { faixa: "1" } : {}), ...(mostrarEmpresa ? {} : { empresa: "1" }) })}`} className="rounded-full border border-border px-3 py-1 text-navy">
              {mostrarEmpresa ? "Ocultar nome da empresa" : "Mostrar nome da empresa"}
            </Link>
          )}
          {vaga.confidencial && <span className="rounded-full bg-navy-bg px-3 py-1 text-navy">Vaga sigilosa: a empresa não aparece</span>}
          <Link href={`/admin/vagas/${id}/criterios`} className="rounded-full border border-border px-3 py-1 text-navy">
            Editar critérios
          </Link>
        </div>
        {bloqueada && (
          <p role="alert" className="mt-3 rounded-xl bg-danger-bg px-4 py-2.5 text-[12px] font-bold text-danger">
            Esta vaga tem item que bloqueia a divulgação. Corrija em Critérios antes de compartilhar:{" "}
            {pendencias.filter((p) => p.nivel === "bloqueio").map((p) => p.mensagem).join(" ")}
          </p>
        )}
        {!bloqueada && pendencias.length > 0 && (
          <ul className="mt-3 grid gap-1 text-[11.5px] text-text-2">
            {pendencias.map((p) => (
              <li key={p.id}>
                <b className="text-gold-3">Aviso:</b> {p.mensagem}
              </li>
            ))}
          </ul>
        )}
      </div>

      <article className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-6 print:border-0 print:p-0">
        <CabecalhoImpressao titulo={vaga.titulo} subtitulo={mostrarEmpresa ? nomeEmpresa : undefined} />
        <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-text-3">
          {c.perfil ? ROTULO_PERFIL_VAGA[c.perfil] : "Vaga"}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-text print:hidden">{vaga.titulo}</h1>
        {mostrarEmpresa && <p className="mt-0.5 text-sm font-bold text-text-2 print:hidden">{nomeEmpresa}</p>}
        <p className="mt-2 text-[13px] text-text-2">
          {[vaga.local, vaga.modelo_trabalho, vaga.modalidade, mostrarFaixa ? vaga.remuneracao_texto : null].filter(Boolean).join(" · ")}
        </p>

        {frase && <p className="mt-4 rounded-xl bg-navy-bg px-4 py-3 text-[13px] font-bold text-text print:border print:border-border">{frase}</p>}

        {vaga.descricao && <p className="mt-5 whitespace-pre-line text-[13.5px] leading-relaxed text-text">{vaga.descricao}</p>}
        {c.rotina && (
          <section className="mt-5">
            <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-text-3">No dia a dia</h2>
            <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-text">{c.rotina}</p>
          </section>
        )}
        <Lista titulo="O que pedimos" itens={c.obrigatorios} />
        <Lista titulo="Será um diferencial" itens={c.desejaveis} />
        <Lista titulo="Como trabalhamos" itens={c.comportamentais} />
        {c.diferencial && (
          <section className="mt-5">
            <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-text-3">Por que esta vaga</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-text">{c.diferencial}</p>
          </section>
        )}

        <section className="mt-6 border-t border-border pt-4">
          <h2 className="text-[11px] font-extrabold uppercase tracking-wide text-text-3">Como se candidatar</h2>
          <p className="mt-1.5 text-[13.5px] text-text">
            Acesse <b>{siteUrl()}/vagas/{id}</b> e envie sua candidatura.
          </p>
        </section>
      </article>
    </div>
  );
}
