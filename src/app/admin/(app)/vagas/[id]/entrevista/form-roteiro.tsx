"use client";

import { useActionState } from "react";
import { gerarRoteiro, type EstadoRoteiro } from "./actions";

const inicial: EstadoRoteiro = { erro: null, ok: false };

export function ImprimirBotao() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-border bg-surface px-3 py-1 text-[11.5px] font-bold text-navy print:hidden"
    >
      Imprimir ou salvar em PDF
    </button>
  );
}

export function FormRoteiro({
  jobId,
  competenciasIniciais,
  temRoteiro,
}: {
  jobId: string;
  competenciasIniciais: string;
  temRoteiro: boolean;
}) {
  const [estado, acao, enviando] = useActionState(gerarRoteiro, inicial);
  return (
    <form action={acao} className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2 print:hidden">
      <input type="hidden" name="job_id" value={jobId} />
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Duração da entrevista</span>
        <select name="duracao" defaultValue="45" className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
          <option value="30">30 minutos</option>
          <option value="45">45 minutos</option>
          <option value="60">60 minutos</option>
        </select>
      </label>
      <div />
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Competências (uma por linha, de 4 a 6)</span>
        <textarea name="competencias" rows={6} defaultValue={competenciasIniciais} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Valores da empresa (um por linha, opcional)</span>
        <textarea name="valores" rows={6} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger md:col-span-2">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p className="rounded-lg bg-success-bg px-3 py-2 text-[12px] font-semibold text-success md:col-span-2">
          Roteiro gerado.
        </p>
      )}
      <div className="md:col-span-2">
        <button type="submit" disabled={enviando} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {enviando ? "Gerando..." : temRoteiro ? "Gerar nova versão do roteiro" : "Gerar roteiro"}
        </button>
        <span className="ml-3 text-[11px] text-text-3">
          O mesmo roteiro vale para todos os candidatos da vaga; mudanças viram nova versão.
        </span>
      </div>
    </form>
  );
}
