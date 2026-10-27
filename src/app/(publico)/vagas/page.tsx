import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exibirRemuneracao } from "@/lib/money";
import { modalidadeLabel, modalidadeTagClass, timeAgo, companyInitial } from "@/lib/format";
import { nomeParaExibir } from "@/lib/vaga-publica";
import { buscarVagasPublicas } from "@/lib/vagas-publicas";
import { lerBusca, queryDaBusca, temFiltro, totalDePaginas } from "@/lib/busca-vagas";
import { Tag } from "@/components/ui";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const busca = lerBusca(await searchParams);
  const variacao = temFiltro(busca) || busca.pagina > 1;
  return {
    title: "Vagas abertas | Vagas Consulting",
    description:
      "Vagas efetivas, PJ e temporárias publicadas pela Vagas Consulting. Veja os detalhes e candidate-se.",
    // Resultado de busca não é indexado (as vagas entram pelo sitemap); canonical só na lista principal.
    ...(variacao ? { robots: { index: false, follow: true } } : { alternates: { canonical: "/vagas" } }),
  };
}

export default async function VagasPage({ searchParams }: Props) {
  // Vitrine pública: leitura no servidor, só vaga publicada e dentro do prazo.
  // O nome da empresa é mascarado (vaga confidencial) antes de ir ao HTML.
  const busca = lerBusca(await searchParams);
  const { vagas, total } = await buscarVagasPublicas(busca);
  const paginas = totalDePaginas(total);
  if (vagas.length === 0 && total > 0) redirect(`/vagas${queryDaBusca(busca, paginas)}`);
  const filtrando = temFiltro(busca);

  return (
    <div className="flex flex-col gap-4 pb-8 pt-6 md:pt-8">
      <div className="flex flex-col gap-1 px-5 md:px-8">
        <h1 className="text-[22px] font-extrabold text-navy">Vagas abertas</h1>
        <p className="text-[13px] text-text-2">
          {total > 0
            ? `${total} ${total === 1 ? "vaga" : "vagas"}${filtrando ? (total === 1 ? " encontrada" : " encontradas") : (total === 1 ? " publicada" : " publicadas")}${paginas > 1 ? ` · página ${busca.pagina} de ${paginas}` : ""}`
            : filtrando
              ? "Nenhuma vaga encontrada para essa busca."
              : "Nenhuma vaga publicada no momento."}
        </p>
      </div>

      <form method="get" action="/vagas" className="flex flex-col gap-2 px-5 md:flex-row md:items-end md:px-8">
        <label className="flex flex-1 flex-col gap-1 text-[11px] font-bold text-text-3">
          Cargo ou palavra
          <input
            name="q"
            type="search"
            defaultValue={busca.q}
            maxLength={60}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-normal text-text"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold text-text-3">
          Modalidade
          <select
            name="modalidade"
            defaultValue={busca.modalidade ?? ""}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-normal text-text"
          >
            <option value="">Todas</option>
            <option value="efetiva">{modalidadeLabel.efetiva}</option>
            <option value="pj">{modalidadeLabel.pj}</option>
            <option value="temporaria">{modalidadeLabel.temporaria}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold text-text-3">
          Cidade
          <input
            name="cidade"
            type="text"
            defaultValue={busca.cidade}
            maxLength={40}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-normal text-text"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white"
        >
          Buscar
        </button>
        {filtrando && (
          <Link href="/vagas" className="px-2 py-2 text-[12.5px] font-semibold text-navy underline">
            Limpar
          </Link>
        )}
      </form>

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

      {paginas > 1 && (
        <nav aria-label="Páginas de vagas" className="flex items-center justify-between gap-3 px-5 md:px-8">
          {busca.pagina > 1 ? (
            <Link
              href={`/vagas${queryDaBusca(busca, busca.pagina - 1)}`}
              rel="prev"
              className="rounded-lg border border-border px-3 py-2 text-[12.5px] font-bold text-navy"
            >
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          {busca.pagina < paginas && (
            <Link
              href={`/vagas${queryDaBusca(busca, busca.pagina + 1)}`}
              rel="next"
              className="rounded-lg border border-border px-3 py-2 text-[12.5px] font-bold text-navy"
            >
              Próximas →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
