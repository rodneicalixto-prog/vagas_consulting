"use client";

import { useActionState } from "react";
import { criarLinha, definirLimiteLinhas, type EstadoLinha } from "./actions";
import type { OpcaoOperador } from "./painel-linha";

const ini: EstadoLinha = { erro: null, ok: false, id: null };
const campo = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";

export function FormNovaLinha({
  companyId,
  operadores,
  podeCriar,
  motivo,
}: {
  companyId: string;
  operadores: OpcaoOperador[];
  podeCriar: boolean;
  motivo: string | null;
}) {
  const [e, acao, env] = useActionState(criarLinha, ini);
  return (
    <form action={acao} className="grid gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-3">
      <input type="hidden" name="company_id" value={companyId} />
      <h2 className="text-sm font-extrabold text-text md:col-span-3">Novo número de WhatsApp</h2>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Apelido</span>
        <input name="apelido" required placeholder="Ex.: RH Ana" className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Operador dono do número</span>
        <select name="operador_id" defaultValue="" className={campo}>
          <option value="">Compartilhado (fila da empresa)</option>
          {operadores.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Agente de IA</span>
        <select name="agente" defaultValue="" className={campo}>
          <option value="">Padrão (sugestão se dedicado, atende se compartilhado)</option>
          <option value="desligado">Desligado</option>
          <option value="sugestao">Só sugestão (a pessoa envia)</option>
          <option value="automatico">Atende sozinho (se o agente permitir)</option>
        </select>
      </label>
      {motivo && <p className="rounded-lg bg-gold-bg px-3 py-2 text-[12px] font-semibold text-gold-3 md:col-span-3">{motivo}</p>}
      {e.erro && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger md:col-span-3">{e.erro}</p>}
      {e.ok && (
        <p className="rounded-lg bg-success-bg px-3 py-2 text-[12px] font-semibold text-success md:col-span-3">
          Número criado e recebimento ligado. Role a página e use <b>Mostrar QR code</b> no novo número.
        </p>
      )}
      <div className="md:col-span-3">
        <button type="submit" disabled={env || !podeCriar} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {env ? "Criando..." : "Criar número"}
        </button>
        <span className="ml-3 text-[11px] text-text-3">
          Cria a instância na Evolution e liga o recebimento sozinho; depois é só ler o QR code.
        </span>
      </div>
    </form>
  );
}

export function FormLimite({ companyId, max }: { companyId: string; max: number }) {
  const [e, acao, env] = useActionState(definirLimiteLinhas, ini);
  return (
    <form action={acao} className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
      <input type="hidden" name="company_id" value={companyId} />
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Limite de números da empresa (plano)</span>
        <input name="max" type="number" min={1} max={50} defaultValue={max} className={campo + " w-28"} />
      </label>
      <button type="submit" disabled={env} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-navy disabled:opacity-60">
        Salvar limite
      </button>
      {e.erro && <span role="alert" className="text-[12px] font-semibold text-danger">{e.erro}</span>}
      {e.ok && <span className="text-[12px] font-semibold text-success">Limite salvo.</span>}
    </form>
  );
}
