"use client";

import { useActionState } from "react";
import { salvarLaudo, type EstadoSalvar } from "../actions";
import { ROTULO_RECOMENDACAO, type LinhaMatching, type Recomendacao } from "@/lib/laudo";

const inicial: EstadoSalvar = { erro: null, ok: false, pendencias: [], assinado: false };

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

export function FormAssinatura({
  jobId,
  laudoId,
  modo,
  linhas,
  inicialRec,
}: {
  jobId: string;
  laudoId: string;
  modo: "fatos" | "recomendacao";
  linhas: LinhaMatching[];
  inicialRec: Recomendacao | null;
}) {
  const [estado, acao, enviando] = useActionState(salvarLaudo, inicial);
  return (
    <form action={acao} className="grid gap-4 print:hidden">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="laudo_id" value={laudoId} />

      {modo === "recomendacao" ? (
        <fieldset className="grid gap-3 rounded-2xl border border-border bg-surface p-4">
          <legend className="px-1 text-[10.5px] font-bold uppercase text-text-3">Recomendação (decisão da pessoa)</legend>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">Recomendação</span>
            <select name="tipo" defaultValue={inicialRec?.tipo ?? ""} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
              <option value="">Escolha</option>
              {(Object.keys(ROTULO_RECOMENDACAO) as (keyof typeof ROTULO_RECOMENDACAO)[]).map((k) => (
                <option key={k} value={k}>{ROTULO_RECOMENDACAO[k]}</option>
              ))}
            </select>
          </label>
          <fieldset className="grid gap-1">
            <legend className="text-[10.5px] font-bold text-text-2">Linhas do quadro que sustentam (obrigatório)</legend>
            {linhas.map((l) => (
              <label key={l.id} className="flex items-center gap-2 text-[12.5px]">
                <input
                  type="checkbox"
                  name="linhas"
                  value={l.id}
                  defaultChecked={inicialRec?.linhas.includes(l.id)}
                  disabled={l.estado !== "avaliado"}
                />
                {l.id} · {l.competencia}{l.estado !== "avaliado" ? " (não avaliado)" : ""}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">Por quê (ligado a competência, nunca a característica pessoal)</span>
            <textarea name="porque" rows={3} defaultValue={inicialRec?.porque ?? ""} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">Condições (obrigatório em &quot;com ressalva&quot;)</span>
            <textarea name="condicoes" rows={2} defaultValue={inicialRec?.condicoes ?? ""} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
          </label>
        </fieldset>
      ) : (
        <p className="rounded-xl bg-navy-bg px-4 py-3 text-[12px] text-text-2">
          Laudo só com fatos: não há recomendação neste documento.
        </p>
      )}

      {estado.erro && (
        <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[12.5px] font-semibold text-danger">
          {estado.erro}
          {estado.pendencias.length > 0 && (
            <ul className="mt-1 list-disc pl-5 font-normal">
              {estado.pendencias.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
        </div>
      )}
      {estado.ok && (
        <p className="rounded-xl bg-success-bg px-4 py-3 text-[12.5px] font-semibold text-success">
          {estado.assinado ? "Laudo assinado. Não muda mais: para alterar, gere uma nova versão." : "Rascunho salvo."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-navy disabled:opacity-60">
          Salvar rascunho
        </button>
        <button type="submit" name="assinar" value="sim" disabled={enviando} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          Assinar laudo
        </button>
        <span className="text-[11px] text-text-3">Assinado, o laudo é imutável e o candidato nunca o recebe.</span>
      </div>
    </form>
  );
}
