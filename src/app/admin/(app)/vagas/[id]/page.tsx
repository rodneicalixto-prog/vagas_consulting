import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { calcularEtapas, caminhoEtapa, proximoPasso, type EstadoEtapa } from "@/lib/ciclo-vaga";
import { carregarCicloDaVaga } from "@/lib/ciclo-vaga-servidor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROTULO_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  revisao: "Em revisão",
  publicada: "Publicada",
  pausada: "Pausada",
  preenchida: "Preenchida",
  encerrada: "Encerrada",
  rejeitada: "Rejeitada",
  suspensa: "Suspensa",
};

const SELO: Record<EstadoEtapa, { texto: string; classe: string }> = {
  concluida: { texto: "Concluída", classe: "bg-success-bg text-success" },
  andamento: { texto: "Em andamento", classe: "bg-gold-bg text-gold-3" },
  pendente: { texto: "Pode começar", classe: "bg-navy-bg text-navy" },
  bloqueada: { texto: "Bloqueada", classe: "bg-danger-bg text-danger" },
  opcional: { texto: "Opcional", classe: "bg-black/5 text-text-3" },
};

/** Central da vaga: onde a vaga está no ciclo e o que fazer agora. */
export default async function CentralDaVagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const vaga = await carregarCicloDaVaga(id);
  if (!vaga) redirect("/admin/vagas");

  const etapas = calcularEtapas(vaga.contagens);
  const passo = proximoPasso(etapas, vaga.contagens);
  const c = vaga.contagens;

  return (
    <div className="h-full overflow-y-auto px-4 md:px-9 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold text-text">{vaga.titulo}</h1>
        <span className="rounded-full bg-navy-bg px-3 py-1 text-[11px] font-extrabold text-navy">
          {ROTULO_STATUS[vaga.status] ?? vaga.status}
        </span>
      </div>
      <p className="mt-1 text-xs text-text-2">
        {vaga.empresa}
        {vaga.local ? ` · ${vaga.local}` : ""} · {c.candidaturas} {c.candidaturas === 1 ? "candidato" : "candidatos"}
      </p>

      {passo ? (
        <section className="mt-5 rounded-2xl border border-navy/30 bg-navy-bg p-5" aria-labelledby="proximo-passo">
          <h2 id="proximo-passo" className="text-[10.5px] font-extrabold uppercase tracking-wide text-navy">
            Próximo passo
          </h2>
          <p className="mt-1 text-base font-extrabold text-text">{passo.rotulo}</p>
          <p className="mt-0.5 text-[12.5px] text-text-2">{passo.resumo}</p>
          <Link href={caminhoEtapa(id, passo.chave)} className="mt-3 inline-block rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">
            {passo.acao} →
          </Link>
        </section>
      ) : (
        <section className="mt-5 rounded-2xl border border-success/30 bg-success-bg p-5">
          <p className="text-base font-extrabold text-success">Ciclo completo</p>
          <p className="mt-0.5 text-[12.5px] text-text-2">
            Todas as etapas principais foram cumpridas. Confira a carta-oferta e os indicadores, se ainda for o caso.
          </p>
          <Link href="/admin/indicadores" className="mt-3 inline-block text-[12.5px] font-bold text-navy underline">
            Ver indicadores de R&amp;S →
          </Link>
        </section>
      )}

      <h2 className="mb-3 mt-8 text-sm font-extrabold text-text">Etapas do ciclo</h2>
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {etapas.map((e, i) => {
          const selo = SELO[e.estado];
          const destino = e.estado === "bloqueada" && e.resolverEm ? caminhoEtapa(id, e.resolverEm) : caminhoEtapa(id, e.chave);
          return (
            <li key={e.chave} className="flex flex-col rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold text-text-3">Etapa {i + 1}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold ${selo.classe}`}>{selo.texto}</span>
              </div>
              <h3 className="mt-1 text-sm font-extrabold text-text">{e.rotulo}</h3>
              <p className="mt-0.5 text-[12px] text-text-2">{e.descricao}</p>
              <p className="mt-2 text-[12px] font-bold text-text">{e.estado === "bloqueada" ? e.motivo : e.resumo}</p>
              <Link
                href={destino}
                className={`mt-3 self-start rounded-lg px-3 py-1.5 text-[11.5px] font-bold ${
                  e.estado === "bloqueada" ? "border border-border text-navy" : "bg-navy text-white"
                }`}
              >
                {e.acao} →
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-wrap gap-4 text-[12px]">
        <Link href="/admin/vagas" className="font-bold text-navy underline">
          ← Todas as vagas
        </Link>
        <Link href={`/vagas/${id}`} className="font-bold text-navy underline" target="_blank">
          Ver como o candidato vê ↗
        </Link>
      </div>
    </div>
  );
}
