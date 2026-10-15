"use client";

import { useActionState } from "react";
import Link from "next/link";
import { gerarInstrumento, type EstadoTeste } from "./actions";

const inicial: EstadoTeste = { erro: null, ok: false, id: null };

export function FormTeste({ jobId }: { jobId: string }) {
  const [estado, acao, enviando] = useActionState(gerarInstrumento, inicial);
  return (
    <form action={acao} className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
      <input type="hidden" name="job_id" value={jobId} />
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Tipo</span>
        <select name="tipo" defaultValue="tecnica" className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
          <option value="tecnica">Prova técnica</option>
          <option value="portugues">Prova de português</option>
          <option value="raciocinio">Raciocínio lógico</option>
          <option value="case">Case prático (até 2 h)</option>
          <option value="dinamica">Dinâmica</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Competência-alvo (obrigatória)</span>
        <input name="competencia" required className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" placeholder="Ex.: atendimento ao cliente" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Tempo em minutos (vazio = padrão do tipo)</span>
        <input name="tempo" type="number" min={10} max={120} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Nº de candidatos (dinâmica de grupo)</span>
        <input name="candidatos" type="number" min={1} max={20} defaultValue={1} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger md:col-span-2">
          {estado.erro}
        </p>
      )}
      {estado.ok && estado.id && (
        <p className="rounded-lg bg-success-bg px-3 py-2 text-[12px] font-semibold text-success md:col-span-2">
          Instrumento gerado.{" "}
          <Link href={`/admin/vagas/${jobId}/testes/${estado.id}`} className="underline">
            Abrir e revisar
          </Link>
        </p>
      )}
      <div className="md:col-span-2">
        <button type="submit" disabled={enviando} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {enviando ? "Gerando..." : "Gerar instrumento"}
        </button>
        <span className="ml-3 text-[11px] text-text-3">
          Não geramos teste psicológico nem de personalidade (privativo de psicólogo).
        </span>
      </div>
    </form>
  );
}
