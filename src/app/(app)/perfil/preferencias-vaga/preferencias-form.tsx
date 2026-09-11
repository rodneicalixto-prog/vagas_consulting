"use client";

import { useState, useTransition } from "react";
import { salvarPreferencias } from "./actions";
import type { Enums } from "@/lib/supabase/types";

const modelos: { value: Enums<"modelo_trabalho">; label: string }[] = [
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
  { value: "remoto", label: "Remoto" },
];
const modalidadesOpts: { value: Enums<"modalidade_vaga">; label: string }[] = [
  { value: "efetiva", label: "Efetiva CLT" },
  { value: "pj", label: "PJ" },
  { value: "temporaria", label: "Temporária" },
];
const disponibilidades = ["Imediata", "A combinar"];

function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={`rounded-full border px-3.5 py-2 text-[12.5px] font-bold ${
              active
                ? "border-navy bg-navy text-white"
                : "border-border bg-white text-text-2"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function PreferenciasForm({
  modeloTrabalhoInicial,
  modalidadesInicial,
  disponibilidadeInicial,
}: {
  modeloTrabalhoInicial: Enums<"modelo_trabalho">[];
  modalidadesInicial: Enums<"modalidade_vaga">[];
  disponibilidadeInicial: string;
}) {
  const [modeloTrabalho, setModeloTrabalho] =
    useState<Enums<"modelo_trabalho">[]>(modeloTrabalhoInicial);
  const [modalidades, setModalidades] =
    useState<Enums<"modalidade_vaga">[]>(modalidadesInicial);
  const [disponibilidade, setDisponibilidade] = useState(disponibilidadeInicial);
  const [pending, startTransition] = useTransition();

  const toggle = <T,>(list: T[], set: (v: T[]) => void, v: T) =>
    set(list.includes(v) ? list.filter((o) => o !== v) : [...list, v]);

  const onSubmit = () => {
    startTransition(() => {
      salvarPreferencias(modeloTrabalho, modalidades, disponibilidade);
    });
  };

  return (
    <div className="flex flex-col gap-5 px-5 pb-6 md:px-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-text-2">Modelo de trabalho</span>
        <ChipGroup
          options={modelos}
          selected={modeloTrabalho}
          onToggle={(v) => toggle(modeloTrabalho, setModeloTrabalho, v)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-text-2">Modalidades desejadas</span>
        <ChipGroup
          options={modalidadesOpts}
          selected={modalidades}
          onToggle={(v) => toggle(modalidades, setModalidades, v)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-text-2">Disponibilidade</span>
        <div className="flex flex-wrap gap-2">
          {disponibilidades.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDisponibilidade(d)}
              className={`rounded-full border px-3.5 py-2 text-[12.5px] font-bold ${
                disponibilidade === d
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-white text-text-2"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={pending}
        className="mt-2 w-full rounded-xl bg-gold px-0 py-3.5 text-[14.5px] font-extrabold text-[#1c1508] disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}
