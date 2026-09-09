"use client";

import { useState } from "react";
import { PrimaryLinkButton } from "@/components/ui";
import { IconUpload } from "@/components/icons";

const modelos = ["Presencial", "Híbrido", "Remoto"];
const modalidades = ["Efetiva CLT", "PJ", "Temporária"];
const disponibilidades = ["Imediata", "A combinar"];

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-full border px-3.5 py-2 text-[12.5px] font-bold ${
              active
                ? "border-navy bg-navy text-white"
                : "border-border bg-white text-text-2"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const [modelo, setModelo] = useState<string[]>(["Presencial", "Híbrido"]);
  const [modalidade, setModalidade] = useState<string[]>(["Efetiva CLT"]);
  const [disponibilidade, setDisponibilidade] = useState<string[]>(["Imediata"]);

  const toggle = (list: string[], set: (v: string[]) => void, opt: string) =>
    set(list.includes(opt) ? list.filter((o) => o !== opt) : [...list, opt]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <div className="flex flex-col gap-3.5 px-5 pt-6 md:px-8 md:pt-8">
        <div className="flex gap-1.5">
          <div className="h-1 flex-1 rounded-full bg-gold" />
          <div className="h-1 flex-1 rounded-full bg-gold" />
          <div className="h-1 flex-1 rounded-full bg-border" />
        </div>
        <div>
          <h1 className="text-[19px] font-extrabold text-navy">Complete seu perfil</h1>
          <p className="mt-0.5 text-[12.5px] text-text-2">
            Passo 2 de 3 — preferências de trabalho
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 pb-4 pt-4 md:px-8">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-2">Nome completo</span>
          <input
            className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
            defaultValue="Mariana Ferreira Souza"
          />
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-2">Cidade</span>
            <input
              className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
              defaultValue="São Paulo, SP"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-2">Telefone</span>
            <input
              className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
              defaultValue="(11) 9****-0000"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-text-2">Modelo de trabalho</span>
          <ChipGroup
            options={modelos}
            selected={modelo}
            onToggle={(v) => toggle(modelo, setModelo, v)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-text-2">Modalidades desejadas</span>
          <ChipGroup
            options={modalidades}
            selected={modalidade}
            onToggle={(v) => toggle(modalidade, setModalidade, v)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-text-2">Disponibilidade</span>
          <ChipGroup
            options={disponibilidades}
            selected={disponibilidade}
            onToggle={(v) => toggle(disponibilidade, setDisponibilidade, v)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-text-2">Currículo</span>
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-white px-4 py-6 text-center text-navy">
            <IconUpload />
            <span className="text-[12.5px] font-bold text-text">
              Arraste seu currículo ou toque para selecionar
            </span>
            <span className="text-[11px] text-text-3">PDF, até 5 MB</span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-bg px-5 pb-6 pt-3 md:px-8">
        <PrimaryLinkButton href="/inicio">Concluir perfil</PrimaryLinkButton>
      </div>
    </div>
  );
}
