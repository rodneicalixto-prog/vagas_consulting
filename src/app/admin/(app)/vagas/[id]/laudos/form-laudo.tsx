"use client";

import { useActionState } from "react";
import Link from "next/link";
import { gerarLaudo, type EstadoLaudo } from "./actions";

const inicial: EstadoLaudo = { erro: null, ok: false, id: null, pendencias: [] };

export function GerarLaudoForm({ jobId, applicationId }: { jobId: string; applicationId: string }) {
  const [estado, acao, enviando] = useActionState(gerarLaudo, inicial);
  return (
    <form action={acao} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="application_id" value={applicationId} />
      <select name="modo" defaultValue="" required className="rounded-lg border border-border bg-bg px-2 py-1 text-[12px]">
        <option value="" disabled>Tipo de laudo</option>
        <option value="fatos">Só fatos (sem recomendação)</option>
        <option value="recomendacao">Com recomendação</option>
      </select>
      <button type="submit" disabled={enviando} className="rounded-lg bg-navy px-3 py-1 text-[12px] font-bold text-white disabled:opacity-60">
        {enviando ? "Gerando..." : "Gerar laudo"}
      </button>
      {estado.erro && <span role="alert" className="text-[11.5px] font-semibold text-danger">{estado.erro}</span>}
      {estado.ok && estado.id && (
        <Link href={`/admin/vagas/${jobId}/laudos/${estado.id}`} className="text-[11.5px] font-bold text-navy underline">
          Abrir laudo
        </Link>
      )}
    </form>
  );
}
