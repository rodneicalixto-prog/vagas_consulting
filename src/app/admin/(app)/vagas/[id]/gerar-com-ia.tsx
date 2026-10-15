"use client";

import { useActionState, useState } from "react";
import { gerarCriteriosComIA, transcreverRecado, type EstadoGeracao, type EstadoTranscricao } from "../actions";

const inicial: EstadoGeracao = { erro: null, ok: false };
const inicialTranscricao: EstadoTranscricao = { erro: null, texto: "", segundos: 0 };

const MODOS: { valor: string; rotulo: string; dica: string }[] = [
  { valor: "criar", rotulo: "Criar a partir do recado do gestor", dica: "Cole a mensagem, o e-mail ou o áudio transcrito." },
  { valor: "reescrever", rotulo: "Reescrever uma JD", dica: "Cole a JD atual: a IA corta exigência inflada e clichê." },
  { valor: "junior", rotulo: "Vaga júnior, sem experiência", dica: "Foco em potencial; sem exigir experiência prévia." },
  { valor: "lideranca", rotulo: "Vaga de liderança", dica: "Inclui escopo de gestão e competências de liderança." },
];

/** Proposta da IA: preenche os critérios para a pessoa conferir e salvar. Nada é publicado. */
export function GerarComIA({ jobId }: { jobId: string }) {
  const [estado, acao, pendente] = useActionState(gerarCriteriosComIA, inicial);
  const [modo, setModo] = useState("criar");
  const [texto, setTexto] = useState("");
  const [transcricao, transcrever, transcrevendo] = useActionState(
    async (anterior: EstadoTranscricao, fd: FormData) => {
      const r = await transcreverRecado(anterior, fd);
      if (r.texto) setTexto((atual) => (atual.trim() ? `${atual.trim()}\n\n${r.texto}` : r.texto));
      return r;
    },
    inicialTranscricao,
  );
  const dica = MODOS.find((m) => m.valor === modo)?.dica;

  return (
    <details className="mb-6 rounded-2xl border border-border bg-surface">
      <summary className="cursor-pointer list-none px-5 py-3 text-[13px] font-extrabold text-navy">
        Gerar critérios com IA
      </summary>
      <form action={transcrever} className="grid gap-2 border-t border-border p-5">
        <input type="hidden" name="job_id" value={jobId} />
        <span className="text-[10.5px] font-bold text-text-2">Áudio do gestor (opcional)</span>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" name="audio" accept="audio/*,video/mp4,video/webm" className="text-[12px]" />
          <button
            type="submit"
            disabled={transcrevendo}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-[12px] font-bold text-navy disabled:opacity-60"
          >
            {transcrevendo ? "Transcrevendo..." : "Transcrever áudio"}
          </button>
        </div>
        {transcricao.erro && <p role="alert" className="text-[12px] font-semibold text-danger">{transcricao.erro}</p>}
        {transcricao.texto && (
          <p className="text-[12px] font-semibold text-success">
            Áudio transcrito ({Math.round(transcricao.segundos)} s). Confira e corrija o texto abaixo antes de gerar.
          </p>
        )}
        <p className="text-[11px] text-text-3">
          Até 4 MB. O arquivo não é guardado; o áudio é enviado à OpenAI para transcrever e conta no teto mensal.
        </p>
      </form>
      <form action={acao} className="grid gap-3 border-t border-border p-5 md:grid-cols-2">
        <input type="hidden" name="job_id" value={jobId} />
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-bold text-text-2">O que fazer</span>
          <select
            name="modo"
            value={modo}
            onChange={(e) => setModo(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
          >
            {MODOS.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </label>
        {modo === "lideranca" ? (
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">Tamanho do time (ex.: 8 pessoas)</span>
            <input name="tamanho_time" maxLength={60} className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
          </label>
        ) : (
          <p className="self-end text-[11.5px] text-text-2">{dica}</p>
        )}
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-[10.5px] font-bold text-text-2">Texto de origem</span>
          <textarea
            name="texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            required
            minLength={20}
            maxLength={6000}
            rows={7}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
            placeholder="Cole aqui o recado do gestor ou a job description."
          />
        </label>
        {estado.erro && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger md:col-span-2">
            {estado.erro}
          </p>
        )}
        {estado.ok && (
          <p className="rounded-lg bg-success-bg px-3 py-2 text-[12px] font-semibold text-success md:col-span-2">
            Proposta gerada. Os campos abaixo foram preenchidos: confira, ajuste e clique em Salvar critérios.
          </p>
        )}
        <div className="flex items-center gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={pendente}
            className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {pendente ? "Gerando..." : "Gerar proposta"}
          </button>
          <span className="text-[11px] text-text-3">
            A IA propõe; só vale depois que você confere e salva. Não inventa o que o texto não traz.
          </span>
        </div>
      </form>
    </details>
  );
}
