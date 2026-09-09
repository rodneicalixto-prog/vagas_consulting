"use client";

import { useActionState } from "react";
import { solicitarVaga, type NovaVagaState } from "./actions";

const initialState: NovaVagaState = { error: null };

export default function NovaSolicitacaoVagaPage() {
  const [state, formAction, pending] = useActionState(solicitarVaga, initialState);

  return (
    <div className="mx-auto max-w-2xl p-9">
      <p className="text-[11.5px] font-bold text-text-3">
        Vagas / <b className="text-navy">Nova solicitação</b>
      </p>
      <h1 className="mt-1 text-xl font-extrabold text-text">Solicitar vaga</h1>

      <div className="mt-4 rounded-xl bg-gold-bg p-3 text-[11.5px] font-semibold leading-relaxed text-gold-3">
        A empresa não publica a vaga diretamente. Esta solicitação é enviada
        à equipe da Vagas Consulting, que cadastra e publica a vaga após
        conferência.
      </div>

      <form action={formAction} className="mt-5 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-2">Título da vaga</span>
          <input name="titulo" required className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-2">Modalidade</span>
          <select name="modalidade" required defaultValue="" className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm">
            <option value="" disabled>Selecionar...</option>
            <option value="efetiva">Efetiva</option>
            <option value="pj">PJ</option>
            <option value="temporaria">Temporária</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-2">Local</span>
            <input name="local" className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm" placeholder="São Paulo — Matriz" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-2">Modelo de trabalho</span>
            <select name="modelo_trabalho" defaultValue="" className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm">
              <option value="">Não especificado</option>
              <option value="presencial">Presencial</option>
              <option value="hibrido">Híbrido</option>
              <option value="remoto">Remoto</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-2">Faixa salarial / remuneração</span>
          <input name="remuneracao_texto" className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm" placeholder="A combinar conforme política interna" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-2">Descrição das atividades</span>
          <textarea name="descricao" rows={3} className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-2">Requisitos essenciais</span>
          <textarea name="requisitos" rows={2} className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-text-2">Etapas do processo</span>
          <input name="etapas" className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm" placeholder="Triagem → Entrevista → Proposta" />
        </label>

        {state.error && <p className="text-[12.5px] font-semibold text-danger">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-xl bg-gold px-0 py-3 text-[13.5px] font-extrabold text-[#1c1508] disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar solicitação à Vagas Consulting"}
        </button>
      </form>
    </div>
  );
}
