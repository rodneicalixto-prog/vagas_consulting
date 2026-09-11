"use client";

import { useRef, useState, useTransition } from "react";
import { processarCurriculo, salvarExperiencias, type ExperienciaProfissional } from "./actions";

const EXPERIENCIA_VAZIA: ExperienciaProfissional = {
  empresa: "",
  cargo: "",
  inicio: "",
  fim: "",
  motivoSaida: "",
};

export default function ExperienciasPage() {
  const [nuncaTrabalhou, setNuncaTrabalhou] = useState(false);
  const [experiencias, setExperiencias] = useState<ExperienciaProfissional[]>([
    { ...EXPERIENCIA_VAZIA },
    { ...EXPERIENCIA_VAZIA },
  ]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [analisandoCurriculo, setAnalisandoCurriculo] = useState(false);
  const [curriculoPath, setCurriculoPath] = useState<string | undefined>(undefined);
  const [curriculoPreenchido, setCurriculoPreenchido] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const atualizar = (i: number, campo: keyof ExperienciaProfissional, valor: string) => {
    setExperiencias((list) => list.map((e, idx) => (idx === i ? { ...e, [campo]: valor } : e)));
  };

  const adicionarMais = () => setExperiencias((list) => [...list, { ...EXPERIENCIA_VAZIA }]);

  const onAnexarCurriculo = async (file: File) => {
    setErro(null);
    setAnalisandoCurriculo(true);
    try {
      const resultado = await processarCurriculo(file);
      if (resultado.error) setErro(resultado.error);
      if (resultado.curriculoUrl) setCurriculoPath(resultado.curriculoUrl);

      const experienciasExtraidas = resultado.sugestao?.experiencias ?? [];
      if (experienciasExtraidas.length > 0) {
        setExperiencias(
          experienciasExtraidas.map((e) => ({
            empresa: e.empresa,
            cargo: e.cargo,
            inicio: e.inicio,
            fim: e.fim,
            motivoSaida: e.motivoSaida,
          })),
        );
      }
      // Reflete o resultado desta tentativa, não acumula de anexos anteriores.
      setCurriculoPreenchido(experienciasExtraidas.length > 0);
    } finally {
      setAnalisandoCurriculo(false);
    }
  };

  const onSubmit = () => {
    setErro(null);
    startTransition(async () => {
      try {
        await salvarExperiencias(nuncaTrabalhou, experiencias, curriculoPath);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível salvar. Tente de novo.");
      }
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <div className="flex flex-col gap-3.5 px-5 pt-6 md:px-8 md:pt-8">
        <div className="flex gap-1.5">
          <div className="h-1 flex-1 rounded-full bg-gold" />
          <div className="h-1 flex-1 rounded-full bg-gold" />
          <div className="h-1 flex-1 rounded-full bg-gold" />
        </div>
        <div>
          <h1 className="text-[19px] font-extrabold text-navy">Currículo e experiências</h1>
          <p className="mt-0.5 text-[12.5px] text-text-2">
            Passo 3 de 3 — obrigatório para continuar usando o app
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-4 md:px-8">
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-navy/30 bg-navy-bg/40 p-3.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAnexarCurriculo(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={analisandoCurriculo}
            className="text-[13px] font-bold text-navy underline disabled:opacity-60"
          >
            {analisandoCurriculo
              ? "Analisando currículo..."
              : curriculoPath
                ? "Currículo anexado — trocar arquivo"
                : "Anexar currículo (opcional) — preenche os campos abaixo automaticamente"}
          </button>
          {curriculoPreenchido && !analisandoCurriculo && (
            <p className="text-[11px] font-semibold text-navy">
              Campos preenchidos com base no currículo — revise antes de continuar.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setNuncaTrabalhou((v) => !v)}
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left ${
            nuncaTrabalhou ? "border-navy bg-navy-bg" : "border-border bg-white"
          }`}
        >
          <span
            className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${
              nuncaTrabalhou ? "border-navy bg-navy" : "border-border bg-white"
            }`}
          >
            {nuncaTrabalhou && <span className="h-2 w-2 rounded-sm bg-white" />}
          </span>
          <span className="text-[13px] font-bold">Nunca trabalhei antes (primeiro emprego)</span>
        </button>

        {!nuncaTrabalhou && (
          <div className="flex flex-col gap-4">
            <p className="text-[12px] text-text-2">
              Conte suas duas últimas experiências (ou mais, se quiser). Isso é o que a empresa vê
              da sua trajetória enquanto o upload de currículo não está disponível.
            </p>
            {experiencias.map((exp, i) => (
              <div key={i} className="flex flex-col gap-2.5 rounded-2xl border border-border bg-white p-4">
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-text-3">
                  {i === 0 ? "Experiência mais recente" : `Experiência ${i + 1}`}
                </span>
                <input
                  placeholder="Empresa"
                  value={exp.empresa}
                  onChange={(e) => atualizar(i, "empresa", e.target.value)}
                  className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-navy"
                />
                <input
                  placeholder="Cargo"
                  value={exp.cargo}
                  onChange={(e) => atualizar(i, "cargo", e.target.value)}
                  className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-navy"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Início (mês/ano)"
                    value={exp.inicio}
                    onChange={(e) => atualizar(i, "inicio", e.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-navy"
                  />
                  <input
                    placeholder="Fim (ou 'Atual')"
                    value={exp.fim}
                    onChange={(e) => atualizar(i, "fim", e.target.value)}
                    className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-navy"
                  />
                </div>
                <input
                  placeholder="Motivo de saída (opcional)"
                  value={exp.motivoSaida}
                  onChange={(e) => atualizar(i, "motivoSaida", e.target.value)}
                  className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-navy"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={adicionarMais}
              className="rounded-xl border border-dashed border-border py-3 text-[12.5px] font-bold text-navy"
            >
              + Adicionar mais uma experiência
            </button>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-bg px-5 pb-6 pt-3 md:px-8">
        {erro && <p className="mb-2 text-[11.5px] font-semibold text-danger">{erro}</p>}
        <button
          onClick={onSubmit}
          disabled={pending}
          className="w-full rounded-xl bg-gold px-0 py-3.5 text-[14.5px] font-extrabold text-[#1c1508] disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Concluir e continuar"}
        </button>
      </div>
    </div>
  );
}
