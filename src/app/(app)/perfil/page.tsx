"use client";

import { useState } from "react";
import { perfilAtual } from "@/lib/mock-data";
import {
  IconEdit,
  IconUser,
  IconResume,
  IconPreferences,
  IconDoc,
} from "@/components/icons";

const menu = [
  { label: "Dados pessoais", icon: IconUser },
  { label: "Currículo e experiências", icon: IconResume },
  { label: "Preferências de vaga", icon: IconPreferences },
  { label: "Documentos", icon: IconDoc },
];

const canaisAlerta = [
  { label: "Alertas de vagas — WhatsApp", ligado: true },
  { label: "Alertas de vagas — E-mail", ligado: true },
  { label: "Alertas de vagas — SMS", ligado: false },
];

export default function PerfilPage() {
  const [toggles, setToggles] = useState(
    Object.fromEntries(canaisAlerta.map((c) => [c.label, c.ligado])),
  );
  const [marketing, setMarketing] = useState(false);

  return (
    <div className="flex flex-col gap-5 px-5 pb-8 pt-6 md:px-8 md:pt-8">
      <div className="flex items-center gap-3.5">
        <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl bg-navy text-[19px] font-extrabold text-white">
          {perfilAtual.iniciais}
        </div>
        <div>
          <h2 className="text-[17px] font-extrabold">{perfilAtual.nome}</h2>
          <p className="text-xs font-semibold text-text-2">{perfilAtual.titulo}</p>
        </div>
        <button className="ml-auto flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
          <IconEdit />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {menu.map(({ label, icon: Icon }, i) => (
          <button
            key={label}
            className={`flex w-full items-center gap-3 px-3.5 py-3.5 text-left ${
              i !== menu.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-navy-bg text-navy">
              <Icon size={16} />
            </span>
            <span className="text-[13px] font-bold">{label}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="mb-2.5 text-xs font-extrabold uppercase tracking-wide text-text-2">
          Privacidade e comunicações
        </div>
        <div className="rounded-2xl border border-border bg-surface px-3.5">
          {canaisAlerta.map((c, i) => (
            <button
              key={c.label}
              onClick={() => setToggles((t) => ({ ...t, [c.label]: !t[c.label] }))}
              className={`flex w-full items-center justify-between py-[11px] text-left ${
                i !== 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="text-[13px] font-bold">{c.label}</span>
              <span
                className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
                  toggles[c.label] ? "bg-gold" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
                    toggles[c.label] ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          ))}
          <button
            onClick={() => setMarketing((m) => !m)}
            className="flex w-full items-center justify-between border-t border-border py-[11px] text-left"
          >
            <span>
              <span className="block text-[13px] font-bold">Marketing e novidades</span>
              <span className="block text-[11px] text-text-3">Desmarcado por padrão</span>
            </span>
            <span
              className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
                marketing ? "bg-gold" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
                  marketing ? "left-[18px]" : "left-0.5"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-[12.5px] font-bold">
          Ver aviso de privacidade <span>›</span>
        </button>
        <button className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-[12.5px] font-bold">
          Exportar meus dados <span>›</span>
        </button>
        <button className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left text-[12.5px] font-bold text-danger">
          Solicitar exclusão da conta <span>›</span>
        </button>
      </div>

      <button className="pb-2 pt-1 text-center text-[12.5px] font-extrabold text-text-3">
        Sair da conta
      </button>
    </div>
  );
}
