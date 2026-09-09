import Link from "next/link";
import { vagas, processos, statusLabel, statusPillClass, perfilAtual } from "@/lib/mock-data";
import { Tag, Pill, Card } from "@/components/ui";
import { IconBell, IconBriefcase } from "@/components/icons";
import { modalidadeLabel, modalidadeTagClass } from "@/lib/mock-data";

export default function InicioPage() {
  const recomendadas = vagas.slice(0, 3);
  const ativos = processos.filter((p) => p.grupo === "andamento");

  return (
    <div className="flex flex-col gap-6 px-5 pb-8 pt-6 md:px-8 md:pt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-text-2">Olá,</div>
          <div className="text-[19px] font-extrabold text-navy">
            {perfilAtual.nome.split(" ")[0]}
          </div>
        </div>
        <div className="relative flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-border bg-surface">
          <IconBell />
          <span className="absolute right-[9px] top-2 h-1.5 w-1.5 rounded-full bg-gold" />
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-navy-3 to-navy-2 p-[18px] text-white">
        <div className="text-[12.5px] font-bold opacity-85">
          Seu perfil está {perfilAtual.progresso}% completo
        </div>
        <div className="my-2.5 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-gold-2"
            style={{ width: `${perfilAtual.progresso}%` }}
          />
        </div>
        <Link href="/perfil" className="text-[12.5px] font-extrabold text-gold-2">
          Completar perfil →
        </Link>
      </div>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14.5px] font-extrabold text-navy">Recomendadas para você</h3>
          <Link href="/vagas" className="text-xs font-bold text-gold-3">
            Ver todas
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto md:grid md:grid-cols-3 md:overflow-visible">
          {recomendadas.map((v) => (
            <Link
              href={`/vagas/${v.id}`}
              key={v.id}
              className="flex min-w-[172px] shrink-0 flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5 md:min-w-0"
            >
              <Tag className={modalidadeTagClass[v.modalidade]}>
                {modalidadeLabel[v.modalidade]}
              </Tag>
              <h4 className="text-[13.5px] font-extrabold leading-snug">{v.titulo}</h4>
              <div className="text-[11.5px] font-semibold text-text-2">{v.empresa}</div>
              <div className="text-[11px] text-text-3">{v.local}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14.5px] font-extrabold text-navy">Suas candidaturas ativas</h3>
          <Link href="/processos" className="text-xs font-bold text-gold-3">
            Ver todas
          </Link>
        </div>
        <div className="flex flex-col gap-2.5">
          {ativos.map((p) => (
            <Card key={p.vaga} className="flex items-center gap-3 p-3.5">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-navy-bg text-navy">
                <IconBriefcase size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-[13px] font-extrabold">{p.vaga}</h4>
                <p className="truncate text-[11.5px] text-text-2">{p.empresa}</p>
              </div>
              <Pill className={statusPillClass[p.status]}>{statusLabel[p.status]}</Pill>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h3 className="text-[14.5px] font-extrabold text-navy">Próximo compromisso</h3>
        <Card className="flex items-center gap-3">
          <div className="flex h-[46px] w-[46px] shrink-0 flex-col items-center justify-center rounded-[11px] bg-gold-bg">
            <div className="text-[15px] font-extrabold leading-none text-gold-3">14</div>
            <div className="text-[9px] font-bold uppercase text-gold-3">Set</div>
          </div>
          <div>
            <h4 className="text-[13px] font-extrabold">Entrevista — Comercial Vitória</h4>
            <p className="text-[11.5px] text-text-2">Videochamada às 15h00</p>
          </div>
        </Card>
      </section>
    </div>
  );
}
