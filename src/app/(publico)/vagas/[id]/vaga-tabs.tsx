"use client";

import { useState } from "react";
import { IconShield } from "@/components/icons";

export type Regras = {
  resumo?: string;
  dados?: { label: string; valor: string }[];
  atividades?: string[];
  etapas?: string;
  aceite?: string;
};

export function VagaTabs({
  descricao,
  regras,
}: {
  descricao: string | null;
  regras: Regras;
}) {
  const [tab, setTab] = useState<"detalhes" | "regras">("regras");

  return (
    <>
      <div className="flex gap-6 border-b border-border px-5 md:px-8">
        <button
          onClick={() => setTab("detalhes")}
          className={`border-b-[2.5px] pb-2.5 text-[13px] font-bold ${
            tab === "detalhes" ? "border-gold text-navy" : "border-transparent text-text-3"
          }`}
        >
          Detalhes
        </button>
        <button
          onClick={() => setTab("regras")}
          className={`border-b-[2.5px] pb-2.5 text-[13px] font-bold ${
            tab === "regras" ? "border-gold text-navy" : "border-transparent text-text-3"
          }`}
        >
          Regras da vaga
        </button>
      </div>

      <div className="flex flex-col gap-3.5 px-5 py-4 md:px-8">
        {tab === "detalhes" ? (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <h4 className="mb-1.5 text-[12.5px] font-extrabold text-navy">Sobre a vaga</h4>
            <p className="text-[12.5px] leading-relaxed text-text-2">
              {descricao || regras.resumo || "Sem descrição adicional."}
            </p>
          </div>
        ) : (
          <>
            {regras.resumo && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <h4 className="mb-1.5 text-[12.5px] font-extrabold text-navy">Resumo</h4>
                <p className="text-[12.5px] leading-relaxed text-text-2">{regras.resumo}</p>
              </div>
            )}

            {regras.dados && regras.dados.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {regras.dados.map((d) => (
                  <div key={d.label} className="rounded-[10px] bg-bg px-2.5 py-2">
                    <div className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">
                      {d.label}
                    </div>
                    <div className="mt-0.5 text-[12.5px] font-extrabold">{d.valor}</div>
                  </div>
                ))}
              </div>
            )}

            {regras.atividades && regras.atividades.length > 0 && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <h4 className="mb-1.5 text-[12.5px] font-extrabold text-navy">
                  Atividades e requisitos
                </h4>
                <ul className="flex list-disc flex-col gap-1.5 pl-4 text-[12.5px] leading-relaxed text-text-2">
                  {regras.atividades.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {regras.etapas && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <h4 className="mb-1.5 text-[12.5px] font-extrabold text-navy">
                  Etapas e prazos
                </h4>
                <p className="text-[12.5px] leading-relaxed text-text-2">{regras.etapas}</p>
              </div>
            )}

            {regras.aceite && (
              <div className="rounded-2xl border border-border bg-surface p-4">
                <h4 className="mb-1.5 text-[12.5px] font-extrabold text-navy">
                  Aceite, cancelamento e substituição
                </h4>
                <p className="text-[12.5px] leading-relaxed text-text-2">{regras.aceite}</p>
              </div>
            )}

            <div className="flex gap-2.5 rounded-2xl border border-[#ecd3ca] bg-danger-bg p-4">
              <IconShield size={18} className="mt-0.5 shrink-0 text-danger" />
              <p className="text-[12px] leading-relaxed text-[#8a3a26]">
                <b className="mb-0.5 block text-[12.5px] text-danger">
                  Nunca pague para concorrer a esta vaga.
                </b>
                Denuncie cobranças, assédio, discriminação ou pedidos de dados
                excessivos pelo canal de denúncia em Ajuda e regras.
              </p>
            </div>

            <p className="px-0.5 text-[11px] leading-relaxed text-text-3">
              A classificação apresentada no aplicativo não define, por si
              só, a natureza da relação de trabalho. Confira as condições
              reais antes de aceitar.
            </p>
          </>
        )}
      </div>
    </>
  );
}
