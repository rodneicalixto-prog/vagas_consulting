"use client";

import { useActionState, useState } from "react";
import { atualizarOferta, salvarOferta, type EstadoOferta } from "./actions";
import { REGIMES, ROTULO_MODELO, type DadosOferta } from "@/lib/oferta";

const ini: EstadoOferta = { erro: null, ok: false };
const campo = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";

function Linha({ nome, rotulo, def, tipo = "text", dica }: { nome: string; rotulo: string; def: string; tipo?: string; dica?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-bold text-text-2">{rotulo}</span>
      <input name={nome} type={tipo} defaultValue={def} className={campo} />
      {dica && <span className="text-[10.5px] text-text-3">{dica}</span>}
    </label>
  );
}

export function FormOferta({
  jobId,
  applicationId,
  offerId,
  dados,
  referenciaFaixa,
}: {
  jobId: string;
  applicationId: string;
  offerId: string | null;
  dados: DadosOferta;
  referenciaFaixa: string | null;
}) {
  const [e, acao, env] = useActionState(salvarOferta, ini);
  return (
    <form action={acao} className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="application_id" value={applicationId} />
      {offerId && <input type="hidden" name="offer_id" value={offerId} />}
      <input type="hidden" name="candidato" value={dados.candidato} />

      <Linha nome="empresa" rotulo="Empresa" def={dados.empresa} />
      <Linha nome="cidade_carta" rotulo="Cidade da carta" def={dados.cidade_carta} />
      <Linha nome="assinante_nome" rotulo="Quem assina (nome)" def={dados.assinante_nome} />
      <Linha nome="assinante_cargo" rotulo="Cargo de quem assina" def={dados.assinante_cargo} />
      <Linha nome="contato" rotulo="Contato (e-mail ou telefone)" def={dados.contato} />
      <Linha nome="cargo" rotulo="Cargo" def={dados.cargo} />
      <Linha nome="reporta_a" rotulo="Reporta a" def={dados.reporta_a} />

      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Regime de contratação</span>
        <select name="regime" defaultValue={dados.regime} className={campo}>
          <option value="">Escolha</option>
          {REGIMES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      <Linha
        nome="salario"
        rotulo="Salário bruto mensal (só o valor)"
        def={dados.salario}
        dica={referenciaFaixa ? `Faixa da vaga, só como referência: ${referenciaFaixa}` : undefined}
      />
      <Linha nome="forma_pagamento" rotulo="Forma e data de pagamento" def={dados.forma_pagamento} />

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[10.5px] font-bold text-text-2">Remuneração variável e regras (se houver)</span>
        <textarea name="variavel" rows={2} defaultValue={dados.variavel} className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Benefícios (um por linha, com condições)</span>
        <textarea name="beneficios" rows={4} defaultValue={dados.beneficios.join("\n")} className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Outros itens (um por linha: ajuda de custo, equity...)</span>
        <textarea name="extras" rows={4} defaultValue={dados.extras.join("\n")} className={campo} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Modelo de trabalho</span>
        <select name="modelo" defaultValue={dados.modelo} className={campo}>
          <option value="">Escolha</option>
          {Object.values(ROTULO_MODELO).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      <Linha nome="local" rotulo="Cidade/UF" def={dados.local} />
      <Linha nome="jornada" rotulo="Jornada e horário" def={dados.jornada} />
      <Linha nome="data_inicio" rotulo="Data de início prevista" def={dados.data_inicio} tipo="date" />
      <Linha nome="experiencia" rotulo="Período de experiência (se aplicável)" def={dados.experiencia} />
      <Linha nome="validade" rotulo="Validade da proposta (obrigatória)" def={dados.validade} tipo="date" />

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[10.5px] font-bold text-text-2">Condições (documentos, exame admissional etc. — obrigatório)</span>
        <textarea name="condicoes" rows={2} defaultValue={dados.condicoes} className={campo} />
      </label>
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[10.5px] font-bold text-text-2">Próximos passos (o que fazer para aceitar e a quem responder)</span>
        <textarea name="proximos_passos" rows={3} defaultValue={dados.proximos_passos} className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Tom</span>
        <select name="tom" defaultValue={dados.tom} className={campo}>
          <option value="formal">Formal</option>
          <option value="descontraido">Descontraído</option>
        </select>
      </label>

      {e.erro && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger md:col-span-2">{e.erro}</p>
      )}
      <div className="md:col-span-2">
        <button type="submit" disabled={env} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {env ? "Montando..." : "Montar a carta"}
        </button>
        <span className="ml-3 text-[11px] text-text-3">
          Nada é inventado: o que faltar aparece como {"{campo}"} na carta.
        </span>
      </div>
    </form>
  );
}

export function Copiar({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [feito, setFeito] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setFeito(true);
          setTimeout(() => setFeito(false), 1500);
        } catch {
          /* sem permissão */
        }
      }}
      className="rounded-lg border border-border bg-surface px-3 py-1 text-[11.5px] font-bold text-navy print:hidden"
    >
      {feito ? "Copiado" : rotulo}
    </button>
  );
}

export function Imprimir() {
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

export function AcoesOferta({ jobId, offerId, status }: { jobId: string; offerId: string; status: string }) {
  const [e, acao, env] = useActionState(atualizarOferta, ini);
  const b = (valor: string, rotulo: string, destaque = false) => (
    <button
      type="submit"
      name="acao"
      value={valor}
      disabled={env}
      className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60 ${
        destaque ? "bg-navy text-white" : "border border-border bg-surface text-navy"
      }`}
    >
      {rotulo}
    </button>
  );
  return (
    <form action={acao} className="grid gap-3 print:hidden">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="offer_id" value={offerId} />
      <div className="flex flex-wrap gap-2">
        {status === "rascunho" && b("enviada", "Já enviei a carta", true)}
        {status === "enviada" && b("aceita", "Candidato aceitou", true)}
        {status === "enviada" && b("recusada", "Candidato recusou")}
      </div>
      {e.erro && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger">{e.erro}</p>}
      {e.ok && <p className="text-[12px] font-semibold text-success">Registrado.</p>}
      <p className="text-[11px] text-text-3">
        Marcar como enviada move a candidatura para Proposta e a carta deixa de mudar. A plataforma não envia a carta.
      </p>
    </form>
  );
}
