"use client";

import { useActionState } from "react";
import { aprovarInstrumento, registrarNota, type EstadoAcao } from "../actions";

const inicial: EstadoAcao = { erro: null, ok: false, bloqueios: [] };

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

export function BotaoAprovar({ jobId, assessmentId }: { jobId: string; assessmentId: string }) {
  const [estado, acao, enviando] = useActionState(aprovarInstrumento, inicial);
  return (
    <form action={acao} className="grid gap-2">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="assessment_id" value={assessmentId} />
      <div>
        <button type="submit" disabled={enviando} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          Aprovar para aplicação
        </button>
      </div>
      {estado.erro && (
        <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[12.5px] font-semibold text-danger">
          {estado.erro}
          {estado.bloqueios.length > 0 && (
            <ul className="mt-1 list-disc pl-5 font-normal">
              {estado.bloqueios.map((b) => <li key={b}>{b}</li>)}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

export function FormNota({
  jobId,
  assessmentId,
  candidatos,
}: {
  jobId: string;
  assessmentId: string;
  candidatos: { id: string; nome: string }[];
}) {
  const [estado, acao, enviando] = useActionState(registrarNota, inicial);
  return (
    <form action={acao} className="grid gap-3 md:grid-cols-[1fr_160px_1fr]">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="assessment_id" value={assessmentId} />
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Candidato</span>
        <select name="application_id" required className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
          <option value="">Escolha</option>
          {candidatos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Nota (rubrica)</span>
        <select name="nota" required className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
          <option value="">Escolha</option>
          <option value="1">1 Não atende</option>
          <option value="2">2 Parcial</option>
          <option value="3">3 Atende</option>
          <option value="4">4 Supera</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Evidência (obrigatória nas notas 1 e 4)</span>
        <input name="evidencia" className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
      </label>
      <div className="md:col-span-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enviando} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          Registrar nota
        </button>
        {estado.erro && <span role="alert" className="text-[12px] font-semibold text-danger">{estado.erro}</span>}
        {estado.ok && <span className="text-[12px] font-semibold text-success">Nota registrada.</span>}
      </div>
    </form>
  );
}
