import Link from "next/link";

export type EventoCalendario = {
  id: string;
  titulo: string;
  tipo: string;
  inicio: string;
  status: string;
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function chave(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Calendário mensal (servidor, sem JS no cliente). Os dias usam UTC para
 * ficar coerentes com o horário digitado no formulário da agenda.
 * Clicar em um dia leva ao formulário com a data preenchida.
 */
export function CalendarioMes({
  ano,
  mes,
  eventos,
  hojeChave,
  hrefDia,
  hrefMes,
}: {
  ano: number;
  mes: number;
  eventos: EventoCalendario[];
  hojeChave: string;
  hrefDia: (dia: string) => string;
  hrefMes: (alvo: "anterior" | "proximo" | "hoje") => string;
}) {
  const porDia = new Map<string, EventoCalendario[]>();
  for (const e of eventos) {
    const d = new Date(e.inicio);
    const k = chave(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    porDia.set(k, [...(porDia.get(k) ?? []), e]);
  }

  const primeiro = new Date(Date.UTC(ano, mes, 1)).getUTCDay();
  const totalDias = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiro }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-text">
          {MESES[mes]} de {ano}
        </h3>
        <div className="flex items-center gap-1.5">
          <Link href={hrefMes("anterior")} className="rounded-lg border border-border px-2.5 py-1 text-[12px] font-bold text-text-2 hover:border-navy">
            ‹
          </Link>
          <Link href={hrefMes("hoje")} className="rounded-lg border border-border px-2.5 py-1 text-[11.5px] font-bold text-text-2 hover:border-navy">
            Hoje
          </Link>
          <Link href={hrefMes("proximo")} className="rounded-lg border border-border px-2.5 py-1 text-[12px] font-bold text-text-2 hover:border-navy">
            ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase text-text-3">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`v${i}`} className="min-h-[74px] rounded-lg bg-bg/50" />;
          const k = chave(ano, mes, dia);
          const lista = porDia.get(k) ?? [];
          const ehHoje = k === hojeChave;
          return (
            <Link
              key={k}
              href={hrefDia(k)}
              className={`flex min-h-[74px] flex-col gap-1 rounded-lg border p-1.5 transition-colors hover:border-navy/50 ${
                ehHoje ? "border-navy bg-navy-bg" : "border-border bg-bg"
              }`}
            >
              <span className={`text-[11px] font-extrabold ${ehHoje ? "text-navy" : "text-text-2"}`}>{dia}</span>
              {lista.slice(0, 2).map((e) => (
                <span
                  key={e.id}
                  title={e.titulo}
                  className={`truncate rounded px-1 py-0.5 text-[9.5px] font-bold ${
                    e.status === "cancelado"
                      ? "bg-black/5 text-text-3 line-through"
                      : e.status === "concluido"
                        ? "bg-success-bg text-success"
                        : e.tipo === "entrevista"
                          ? "bg-gold-bg text-gold-3"
                          : "bg-navy-bg text-navy"
                  }`}
                >
                  {new Date(e.inicio).toISOString().slice(11, 16)} {e.titulo}
                </span>
              ))}
              {lista.length > 2 && <span className="text-[9.5px] font-bold text-text-3">+{lista.length - 2}</span>}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10.5px] text-text-2">
        <span><b className="text-gold-3">■</b> Entrevista</span>
        <span><b className="text-navy">■</b> Interno</span>
        <span><b className="text-success">■</b> Concluído</span>
        <span className="text-text-3">Clique em um dia para criar um compromisso nele.</span>
      </div>
    </div>
  );
}
