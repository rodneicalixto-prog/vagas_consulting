"use client";

import { useState, useTransition } from "react";
import { IconUpload, IconCheck } from "@/components/icons";
import { saveProfile } from "./actions";
import type { Enums } from "@/lib/supabase/types";

const EMPRESAS_TERCEIRIZADORAS = [
  "Eros Terceirização",
  "Nyx Terceirização",
  "FG Terceirização",
  "Athenas Terceirização",
] as const;

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

export default function OnboardingPage() {
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cidade, setCidade] = useState("");
  const [telefone, setTelefone] = useState("");
  const [modeloTrabalho, setModeloTrabalho] = useState<Enums<"modelo_trabalho">[]>([]);
  const [modalidades, setModalidades] = useState<Enums<"modalidade_vaga">[]>([]);
  const [disponibilidade, setDisponibilidade] = useState("Imediata");
  const [jaTrabalhou, setJaTrabalhou] = useState<"sim" | "nao" | null>(null);
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([]);
  const [detalhesEmpresas, setDetalhesEmpresas] = useState<
    Record<string, { periodo: string; liderDireto: string }>
  >({});
  const [pending, startTransition] = useTransition();

  const toggle = <T,>(list: T[], set: (v: T[]) => void, v: T) =>
    set(list.includes(v) ? list.filter((o) => o !== v) : [...list, v]);

  const toggleEmpresa = (empresa: string) => {
    setEmpresasSelecionadas((list) =>
      list.includes(empresa) ? list.filter((e) => e !== empresa) : [...list, empresa],
    );
  };

  const respostaTerceirizadorasCompleta =
    jaTrabalhou === "nao" ||
    (jaTrabalhou === "sim" &&
      empresasSelecionadas.length > 0 &&
      empresasSelecionadas.every((e) => detalhesEmpresas[e]?.periodo?.trim()));

  const onSubmit = () => {
    startTransition(() => {
      const historicoTerceirizadoras =
        jaTrabalhou === "sim"
          ? empresasSelecionadas.map((empresa) => ({
              empresa,
              periodo: detalhesEmpresas[empresa]?.periodo ?? "",
              liderDireto: detalhesEmpresas[empresa]?.liderDireto ?? "",
            }))
          : [];
      saveProfile({
        nomeCompleto,
        cidade,
        telefone,
        modeloTrabalho,
        modalidades,
        disponibilidade,
        historicoTerceirizadoras,
      });
    });
  };

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
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            placeholder="Seu nome completo"
          />
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-2">Cidade</span>
            <input
              className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="São Paulo, SP"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-2">Telefone</span>
            <input
              className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 90000-0000"
            />
          </label>
        </div>

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

        <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-white p-4">
          <span className="text-[13px] font-bold text-text">
            Você já trabalhou em alguma dessas empresas?
          </span>
          <span className="text-[11px] text-text-3">
            Pergunta obrigatória, mas não elimina sua candidatura.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setJaTrabalhou("sim")}
              className={`flex-1 rounded-[10px] border py-2.5 text-center text-[13px] font-bold ${
                jaTrabalhou === "sim"
                  ? "border-navy bg-navy text-white"
                  : "border-border text-text-2"
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => {
                setJaTrabalhou("nao");
                setEmpresasSelecionadas([]);
              }}
              className={`flex-1 rounded-[10px] border py-2.5 text-center text-[13px] font-bold ${
                jaTrabalhou === "nao"
                  ? "border-navy bg-navy text-white"
                  : "border-border text-text-2"
              }`}
            >
              Não
            </button>
          </div>

          {jaTrabalhou === "sim" && (
            <div className="flex flex-col gap-3 pt-1">
              {EMPRESAS_TERCEIRIZADORAS.map((empresa) => {
                const selecionada = empresasSelecionadas.includes(empresa);
                return (
                  <div key={empresa} className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => toggleEmpresa(empresa)}
                      className="flex items-center gap-2.5 text-left"
                    >
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${
                          selecionada ? "border-navy bg-navy" : "border-border bg-white"
                        }`}
                      >
                        {selecionada && <IconCheck size={11} className="text-white" />}
                      </span>
                      <span className="text-[13px] font-semibold">{empresa}</span>
                    </button>
                    {selecionada && (
                      <div className="grid grid-cols-2 gap-2 pl-[26px]">
                        <input
                          className="rounded-lg border border-border bg-white px-3 py-2.5 text-[12.5px] outline-none focus:border-navy"
                          placeholder="Ano/período (ex.: 2021–2022)"
                          value={detalhesEmpresas[empresa]?.periodo ?? ""}
                          onChange={(e) =>
                            setDetalhesEmpresas((d) => ({
                              ...d,
                              [empresa]: { ...d[empresa], periodo: e.target.value },
                            }))
                          }
                        />
                        <input
                          className="rounded-lg border border-border bg-white px-3 py-2.5 text-[12.5px] outline-none focus:border-navy"
                          placeholder="Líder direto (opcional)"
                          value={detalhesEmpresas[empresa]?.liderDireto ?? ""}
                          onChange={(e) =>
                            setDetalhesEmpresas((d) => ({
                              ...d,
                              [empresa]: { ...d[empresa], liderDireto: e.target.value },
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-text-2">Currículo</span>
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-white px-4 py-6 text-center text-navy">
            <IconUpload />
            <span className="text-[12.5px] font-bold text-text">
              Arraste seu currículo ou toque para selecionar
            </span>
            <span className="text-[11px] text-text-3">
              PDF, até 5 MB — upload ainda não conectado nesta fase
            </span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-bg px-5 pb-6 pt-3 md:px-8">
        <button
          onClick={onSubmit}
          disabled={pending || !nomeCompleto || !respostaTerceirizadorasCompleta}
          className="w-full rounded-xl bg-gold px-0 py-3.5 text-[14.5px] font-extrabold text-[#1c1508] disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Concluir perfil"}
        </button>
      </div>
    </div>
  );
}
