import {
  processos,
  statusLabel,
  statusPillClass,
  statusProgress,
} from "@/lib/mock-data";
import { Card, Pill } from "@/components/ui";

export default function ProcessosPage() {
  const andamento = processos.filter((p) => p.grupo === "andamento");
  const encerrados = processos.filter((p) => p.grupo === "encerrado");

  return (
    <div className="flex flex-col gap-4 pb-8 pt-6 md:pt-8">
      <h1 className="px-5 text-[19px] font-extrabold text-navy md:px-8">
        Meus processos
      </h1>

      <div className="flex flex-col gap-3 px-5 md:px-8">
        <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
          Em andamento
        </div>
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3.5">
          {andamento.map((p) => (
            <Card key={p.vaga} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <h4 className="text-[13.5px] font-extrabold">{p.vaga}</h4>
                  <div className="text-[11.5px] text-text-2">{p.empresa}</div>
                </div>
                <Pill className={statusPillClass[p.status]}>{statusLabel[p.status]}</Pill>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      i < statusProgress[p.status] ? "bg-gold" : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <div className="text-[11px] text-text-3">{p.detalhe}</div>
            </Card>
          ))}
        </div>

        <div className="mt-2 text-[11.5px] font-extrabold uppercase tracking-wide text-text-3">
          Encerrados
        </div>
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3.5">
          {encerrados.map((p) => (
            <Card key={p.vaga} className="flex flex-col gap-2 opacity-70">
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <h4 className="text-[13.5px] font-extrabold">{p.vaga}</h4>
                  <div className="text-[11.5px] text-text-2">{p.empresa}</div>
                </div>
                <Pill className={statusPillClass[p.status]}>{statusLabel[p.status]}</Pill>
              </div>
              <div className="text-[11px] text-text-3">{p.detalhe}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
