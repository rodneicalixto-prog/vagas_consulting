"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { caminhoEtapa, etapaDaRota, vizinhas, type ChaveEtapa, type EstadoEtapa } from "@/lib/ciclo-vaga";

export type EtapaTrilha = { chave: ChaveEtapa; rotulo: string; estado: EstadoEtapa; resumo: string };

const PONTO: Record<EstadoEtapa, string> = {
  concluida: "bg-success text-white",
  andamento: "bg-gold-2 text-white",
  pendente: "bg-navy text-white",
  bloqueada: "bg-border text-text-3",
  opcional: "border border-border bg-surface text-text-3",
};
const ROTULO_ESTADO: Record<EstadoEtapa, string> = {
  concluida: "Concluída",
  andamento: "Em andamento",
  pendente: "Pode começar",
  bloqueada: "Bloqueada",
  opcional: "Opcional",
};

/** Barra do ciclo, no topo de toda página da vaga: onde estou, o que já foi feito e como voltar à Central. */
export function TrilhaCiclo({ jobId, titulo, empresa, etapas }: { jobId: string; titulo: string; empresa: string; etapas: EtapaTrilha[] }) {
  const pathname = usePathname();
  const atual = etapaDaRota(jobId, pathname);

  return (
    <div className="shrink-0 border-b border-border bg-surface px-4 md:px-9 pt-3 pb-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link href="/admin/vagas" className="text-[11px] font-bold text-text-3 hover:text-navy">
          Vagas
        </Link>
        <span className="text-[11px] text-text-3/60">/</span>
        <Link
          href={`/admin/vagas/${jobId}`}
          className={`min-w-0 truncate text-[11.5px] font-extrabold ${atual === null ? "text-text" : "text-navy underline"}`}
          title="Central da vaga"
        >
          {titulo} · {empresa}
        </Link>
      </div>
      <nav aria-label="Etapas do ciclo de R&S" className="mt-2 flex gap-1 overflow-x-auto pb-1">
        {etapas.map((e, i) => {
          const ativa = atual === e.chave;
          return (
            <Link
              key={e.chave}
              href={caminhoEtapa(jobId, e.chave)}
              aria-current={ativa ? "step" : undefined}
              title={`${e.rotulo}: ${ROTULO_ESTADO[e.estado]}. ${e.resumo}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold ${
                ativa ? "bg-navy-bg text-navy ring-1 ring-navy/30" : "text-text-2 hover:bg-navy-bg"
              }`}
            >
              <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-extrabold ${PONTO[e.estado]}`}>
                {e.estado === "concluida" ? "✓" : i + 1}
              </span>
              {e.rotulo}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Rodapé fixo: sempre há para onde ir (etapa anterior, Central, próxima etapa). */
export function RodapeCiclo({ jobId, etapas }: { jobId: string; etapas: EtapaTrilha[] }) {
  const pathname = usePathname();
  const atual = etapaDaRota(jobId, pathname);
  if (atual === null) return null;
  const { anterior, proxima } = vizinhas(atual);
  const rotulo = (c: ChaveEtapa | null) => etapas.find((e) => e.chave === c)?.rotulo ?? "";

  return (
    <div className="shrink-0 flex items-center justify-between gap-3 border-t border-border bg-surface px-4 md:px-9 py-2.5 print:hidden">
      {anterior ? (
        <Link href={caminhoEtapa(jobId, anterior)} className="rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-bold text-text-2 hover:border-navy hover:text-navy">
          ← {rotulo(anterior)}
        </Link>
      ) : (
        <span />
      )}
      <Link href={`/admin/vagas/${jobId}`} className="text-[11.5px] font-bold text-navy underline">
        Central da vaga
      </Link>
      {proxima ? (
        <Link href={caminhoEtapa(jobId, proxima)} className="rounded-lg bg-navy px-3 py-1.5 text-[11.5px] font-bold text-white">
          {rotulo(proxima)} →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
