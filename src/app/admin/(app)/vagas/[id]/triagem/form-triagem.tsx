"use client";

import { useActionState } from "react";
import { rodarTriagem, type EstadoTriagem } from "./actions";

const inicial: EstadoTriagem = { erro: null, avaliados: 0, falhas: 0, restantes: 0 };

export function FormTriagem({ jobId, pendentes }: { jobId: string; pendentes: number }) {
  const [estado, acao, enviando] = useActionState(rodarTriagem, inicial);
  return (
    <form action={acao} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <input type="hidden" name="job_id" value={jobId} />
      <button type="submit" disabled={enviando} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
        {enviando ? "Triando..." : pendentes > 0 ? `Triar candidatos (${pendentes} pendentes)` : "Triar candidatos"}
      </button>
      <label className="flex items-center gap-2 text-[12px] text-text-2">
        <input type="checkbox" name="refazer" value="sim" /> Refazer também os já avaliados
      </label>
      {estado.erro && (
        <p role="alert" className="w-full rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger">
          {estado.erro}
        </p>
      )}
      {!estado.erro && (estado.avaliados > 0 || estado.falhas > 0) && (
        <p className="w-full text-[12px] text-text-2">
          {estado.avaliados} avaliados{estado.falhas ? `, ${estado.falhas} com falha (tente de novo)` : ""}
          {estado.restantes > 0 ? `, ${estado.restantes} ainda pendentes: rode de novo.` : "."}
        </p>
      )}
    </form>
  );
}
