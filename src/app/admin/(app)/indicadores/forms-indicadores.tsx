"use client";

import { useActionState } from "react";
import { atualizarPlano, criarPlano, salvarManual, salvarMetas, type EstadoInd } from "./actions";

const ini: EstadoInd = { erro: null, ok: false, pendencias: [] };
const campo = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";

function Retorno({ e, ok }: { e: EstadoInd; ok: string }) {
  return (
    <>
      {e.erro && (
        <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[12.5px] font-semibold text-danger">
          {e.erro}
          {e.pendencias.length > 0 && (
            <ul className="mt-1 list-disc pl-5 font-normal">{e.pendencias.map((p) => <li key={p}>{p}</li>)}</ul>
          )}
        </div>
      )}
      {e.ok && <p className="text-[12px] font-semibold text-success">{ok}</p>}
    </>
  );
}

function Num({ name, rotulo, def }: { name: string; rotulo: string; def?: number | null }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-bold text-text-2">{rotulo}</span>
      <input name={name} inputMode="decimal" defaultValue={def ?? ""} className={campo} />
    </label>
  );
}

export function FormManual({
  companyId,
  mes,
  v,
}: {
  companyId: string;
  mes: string;
  v: Record<string, number | null | undefined>;
}) {
  const [e, acao, env] = useActionState(salvarManual, ini);
  return (
    <form action={acao} className="grid gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-3">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="mes" value={mes} />
      <h2 className="text-sm font-extrabold text-text md:col-span-3">Números do mês (entrada manual)</h2>
      <Num name="custo_total" rotulo="Custo total das contratações (R$)" def={v.custo_total} />
      <Num name="sla_pct" rotulo="SLA: vagas dentro do prazo (%)" def={v.sla_pct} />
      <Num name="nps" rotulo="NPS do processo (-100 a 100)" def={v.nps} />
      <Num name="turnover_precoce_pct" rotulo="Turnover precoce (%)" def={v.turnover_precoce_pct} />
      <Num name="ofertas_enviadas" rotulo="Ofertas enviadas" def={v.ofertas_enviadas} />
      <Num name="ofertas_aceitas" rotulo="Ofertas aceitas" def={v.ofertas_aceitas} />
      <div className="md:col-span-3 grid gap-2">
        <Retorno e={e} ok="Números salvos." />
        <div>
          <button type="submit" disabled={env} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            Salvar números do mês
          </button>
          <span className="ml-3 text-[11px] text-text-3">Campo vazio fica como &quot;sem dado&quot;, nunca zero.</span>
        </div>
      </div>
    </form>
  );
}

export function FormMetas({ companyId, m }: { companyId: string; m: Record<string, number | null | undefined> }) {
  const [e, acao, env] = useActionState(salvarMetas, ini);
  return (
    <form action={acao} className="grid gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-3">
      <input type="hidden" name="company_id" value={companyId} />
      <h2 className="text-sm font-extrabold text-text md:col-span-3">Metas da empresa</h2>
      <Num name="tempo_fechamento_dias" rotulo="Tempo de fechamento (dias, máx.)" def={m.tempo_fechamento_dias} />
      <Num name="sla_pct" rotulo="SLA (%, mín.)" def={m.sla_pct} />
      <Num name="custo_max" rotulo="Custo por contratação (R$, máx.)" def={m.custo_max} />
      <Num name="aceitacao_pct" rotulo="Aceitação de oferta (%, mín.)" def={m.aceitacao_pct} />
      <Num name="turnover_max_pct" rotulo="Turnover precoce (%, máx.)" def={m.turnover_max_pct} />
      <Num name="nps_min" rotulo="NPS (mín.)" def={m.nps_min} />
      <div className="md:col-span-3 grid gap-2">
        <Retorno e={e} ok="Metas salvas." />
        <div>
          <button type="submit" disabled={env} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-navy disabled:opacity-60">
            Salvar metas
          </button>
        </div>
      </div>
    </form>
  );
}

export function FormPlano({
  companyId,
  mes,
  indicadores,
}: {
  companyId: string;
  mes: string;
  indicadores: { nome: string; valor: string; meta: string }[];
}) {
  const [e, acao, env] = useActionState(criarPlano, ini);
  return (
    <form action={acao} className="grid gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="mes" value={mes} />
      <h2 className="text-sm font-extrabold text-text md:col-span-2">Nova ação (até 3 abertas por mês)</h2>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Indicador fora da meta</span>
        <select name="indicador" required className={campo}>
          <option value="">Escolha</option>
          {indicadores.map((i) => <option key={i.nome} value={i.nome}>{i.nome} ({i.valor} vs meta {i.meta})</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Causa provável</span>
        <input name="causa" className={campo} />
      </label>
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[10.5px] font-bold text-text-2">Ação (concreta e mensurável)</span>
        <textarea name="acao" rows={2} required className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Responsável</span>
        <input name="responsavel" required className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Prazo</span>
        <input name="prazo" type="date" required className={campo} />
      </label>
      <div className="md:col-span-2 grid gap-2">
        <Retorno e={e} ok="Ação criada." />
        <div>
          <button type="submit" disabled={env} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            Criar ação
          </button>
        </div>
      </div>
    </form>
  );
}

export function AtualizarPlano({ companyId, planId, estado }: { companyId: string; planId: string; estado: string }) {
  const [e, acao, env] = useActionState(atualizarPlano, ini);
  return (
    <form action={acao} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="plan_id" value={planId} />
      <select name="estado" defaultValue={estado} className="rounded-lg border border-border bg-bg px-2 py-1 text-[12px]">
        <option value="aberta">Aberta</option>
        <option value="em_andamento">Em andamento</option>
        <option value="concluida">Concluída</option>
        <option value="cancelada">Cancelada</option>
      </select>
      <input name="o_que_funcionou" placeholder="O que funcionou (ao concluir)" className="min-w-[200px] flex-1 rounded-lg border border-border bg-bg px-2 py-1 text-[12px]" />
      <button type="submit" disabled={env} className="rounded-lg border border-border bg-surface px-3 py-1 text-[12px] font-bold text-navy disabled:opacity-60">
        Atualizar
      </button>
      {e.erro && <span role="alert" className="w-full text-[11.5px] font-semibold text-danger">{e.erro}</span>}
    </form>
  );
}
