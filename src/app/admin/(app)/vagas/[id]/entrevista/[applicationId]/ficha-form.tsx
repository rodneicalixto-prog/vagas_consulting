"use client";

import { useActionState } from "react";
import { gerarVerificacoes, salvarFicha, type EstadoFicha, type EstadoRoteiro } from "../actions";
import type { ItemFicha, ItemRoteiro, Recomendacao } from "@/lib/entrevista";

const inicial: EstadoFicha = { erro: null, pendencias: [], salvo: false, fechada: false };
const inicialVerif: EstadoRoteiro = { erro: null, ok: false };
const NOTAS: [number, string][] = [[1, "1 Não atende"], [2, "2 Parcial"], [3, "3 Atende"], [4, "4 Supera"]];

export function BotaoVerificacoes({ jobId, applicationId, temExtras }: { jobId: string; applicationId: string; temExtras: boolean }) {
  const [estado, acao, enviando] = useActionState(gerarVerificacoes, inicialVerif);
  return (
    <form action={acao} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="application_id" value={applicationId} />
      <button type="submit" disabled={enviando} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-bold text-navy disabled:opacity-60">
        {enviando ? "Gerando..." : temExtras ? "Gerar de novo as perguntas dos pontos a validar" : "Gerar perguntas dos pontos a validar da triagem"}
      </button>
      {estado.erro && <span role="alert" className="text-[12px] font-semibold text-danger">{estado.erro}</span>}
    </form>
  );
}

export function FichaForm({
  jobId,
  applicationId,
  itens,
  roteiroItens,
  inicialFicha,
  bloqueada,
}: {
  jobId: string;
  applicationId: string;
  itens: ItemFicha[];
  roteiroItens: ItemRoteiro[];
  inicialFicha: { fortes: string; atencao: string; recomendacao: Recomendacao | null; motivo: string };
  bloqueada: boolean;
}) {
  const [estado, acao, enviando] = useActionState(salvarFicha, inicial);
  const porId = new Map(roteiroItens.map((r) => [r.id, r]));
  return (
    <form action={acao} className="grid gap-4">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="application_id" value={applicationId} />

      {itens.map((i) => {
        const r = porId.get(i.item_id);
        return (
          <fieldset key={i.item_id} disabled={bloqueada} className="rounded-2xl border border-border bg-surface p-4">
            <legend className="px-1 text-[10.5px] font-bold uppercase text-text-3">
              {i.bloco === "valor" ? "Valor" : "Competência"} · {i.nome}
            </legend>
            {r && (
              <>
                <p className="text-[13px] font-semibold text-text">{r.pergunta}</p>
                <p className="mt-1 text-[12px] text-text-2"><b>O que observar:</b> {r.observar}</p>
              </>
            )}
            <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold text-text-2">Nota</span>
                <select name={`nota_${i.item_id}`} defaultValue={i.nota ?? ""} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
                  <option value="">Sem nota</option>
                  {NOTAS.map(([n, t]) => <option key={n} value={n}>{t}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold text-text-2">Evidência (obrigatória nas notas 1 e 4)</span>
                <input name={`evid_${i.item_id}`} defaultValue={i.evidencia} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="mt-2 flex flex-col gap-1">
              <span className="text-[10.5px] font-bold text-text-2">Anotações</span>
              <textarea name={`anot_${i.item_id}`} rows={2} defaultValue={i.anotacoes} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
            </label>
          </fieldset>
        );
      })}

      <fieldset disabled={bloqueada} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-2">
        <legend className="px-1 text-[10.5px] font-bold uppercase text-text-3">Parecer</legend>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-bold text-text-2">Pontos fortes (ligados a evidência)</span>
          <textarea name="fortes" rows={3} defaultValue={inicialFicha.fortes} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-bold text-text-2">Pontos de atenção</span>
          <textarea name="atencao" rows={3} defaultValue={inicialFicha.atencao} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-bold text-text-2">Recomendação</span>
          <select name="recomendacao" defaultValue={inicialFicha.recomendacao ?? ""} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
            <option value="">Escolha</option>
            <option value="avancar">Avançar</option>
            <option value="com_ressalva">Avançar com ressalva</option>
            <option value="nao_avancar">Não avançar</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-bold text-text-2">Por quê (comportamento observado, nunca característica pessoal)</span>
          <textarea name="motivo" rows={3} defaultValue={inicialFicha.motivo} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
        </label>
      </fieldset>

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
      {estado.salvo && (
        <p className="rounded-xl bg-success-bg px-4 py-3 text-[12.5px] font-semibold text-success">
          {estado.fechada ? "Ficha fechada." : "Rascunho salvo."}
        </p>
      )}

      {!bloqueada && (
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={enviando} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-navy disabled:opacity-60">
            Salvar rascunho
          </button>
          <button type="submit" name="fechar" value="sim" disabled={enviando} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            Fechar ficha
          </button>
          <span className="self-center text-[11px] text-text-3">
            Fechada, a ficha não muda mais. A recomendação é só desta etapa: a decisão final é da pessoa.
          </span>
        </div>
      )}
    </form>
  );
}
