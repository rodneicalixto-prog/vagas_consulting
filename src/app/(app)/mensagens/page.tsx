import { conversas } from "@/lib/mock-data";

function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default function MensagensPage() {
  return (
    <div className="flex flex-col gap-3 pb-8 pt-6 md:pt-8">
      <h1 className="px-5 text-[19px] font-extrabold text-navy md:px-8">Mensagens</h1>

      <div className="flex flex-col px-5 md:px-8">
        {conversas.map((c, i) => (
          <div
            key={c.empresa}
            className={`flex items-center gap-3 py-3 ${
              i !== conversas.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div
              className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                i % 2 === 0 ? "bg-navy-bg text-navy" : "bg-gold-bg text-gold-3"
              }`}
            >
              {iniciais(c.empresa)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="truncate text-[13.5px] font-extrabold">{c.empresa}</h4>
                <span className="shrink-0 text-[10.5px] text-text-3">{c.hora}</span>
              </div>
              <div className="mt-0.5 truncate text-[11px] font-bold text-gold-3">{c.vaga}</div>
              <div
                className={`mt-0.5 truncate text-xs ${
                  c.naoLida ? "font-bold text-text" : "text-text-2"
                }`}
              >
                {c.souEu && "Você: "}
                {c.preview}
              </div>
            </div>
            {c.naoLida && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />}
          </div>
        ))}
      </div>
    </div>
  );
}
