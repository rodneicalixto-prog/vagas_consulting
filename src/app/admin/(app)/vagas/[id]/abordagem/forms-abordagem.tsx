"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { atualizarAbordagem, gerarAbordagem, type EstadoGerar, type EstadoMover } from "./actions";

const inicial: EstadoGerar = { erro: null, ok: false, id: null, removidos: 0 };
const inicialMover: EstadoMover = { erro: null, ok: false };
const campo = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";

export function FormAbordagem({ jobId, temFaixa }: { jobId: string; temFaixa: boolean }) {
  const [e, acao, env] = useActionState(gerarAbordagem, inicial);
  return (
    <form action={acao} className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
      <input type="hidden" name="job_id" value={jobId} />
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Nome da pessoa</span>
        <input name="nome" required className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Canal</span>
        <select name="canal" defaultValue="linkedin_inmail" className={campo}>
          <option value="linkedin_nota">LinkedIn: nota de conexão (até 300 caracteres)</option>
          <option value="linkedin_inmail">LinkedIn: InMail</option>
          <option value="email">E-mail</option>
          <option value="ligacao">Ligação (roteiro)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[10.5px] font-bold text-text-2">Perfil profissional público (cole aqui; não é gravado)</span>
        <textarea name="perfil" rows={8} required className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Tom</span>
        <select name="tom" defaultValue="formal" className={campo}>
          <option value="formal">Formal</option>
          <option value="descontraido">Descontraído</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Público</span>
        <select name="publico" defaultValue="menos" className={campo}>
          <option value="menos">Menos técnico</option>
          <option value="tecnico">Técnico</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Assinatura</span>
        <input name="recrutador" placeholder="Seu nome" className={campo} />
      </label>
      <label className="flex items-center gap-2 text-[12.5px] font-bold text-text">
        <input type="checkbox" name="mostrar_faixa" value="sim" defaultChecked={temFaixa} disabled={!temFaixa} />
        Citar a faixa de remuneração
      </label>
      {e.erro && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger md:col-span-2">{e.erro}</p>
      )}
      {e.ok && e.id && (
        <p className="rounded-lg bg-success-bg px-3 py-2 text-[12px] font-semibold text-success md:col-span-2">
          Rascunho gerado{e.removidos > 0 ? ` (${e.removidos} trecho(s) pessoal(is) do perfil foram descartados)` : ""}.{" "}
          <Link href={`/admin/vagas/${jobId}/abordagem/${e.id}`} className="underline">Revisar</Link>
        </p>
      )}
      <div className="md:col-span-2">
        <button type="submit" disabled={env} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {env ? "Gerando..." : "Gerar abordagem"}
        </button>
        <span className="ml-3 text-[11px] text-text-3">
          Só rascunho: você envia fora da plataforma. Perfil não é guardado; WhatsApp frio fica de fora.
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
      className="rounded-lg border border-border bg-surface px-3 py-1 text-[11.5px] font-bold text-navy"
    >
      {feito ? "Copiado" : rotulo}
    </button>
  );
}

export function AcoesAbordagem({
  jobId,
  draftId,
  estado,
  followupsFeitos,
}: {
  jobId: string;
  draftId: string;
  estado: string;
  followupsFeitos: number;
}) {
  const [e, acao, env] = useActionState(atualizarAbordagem, inicialMover);
  const botao = (valor: string, rotulo: string, destaque = false) => (
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
    <form action={acao} className="grid gap-3">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="draft_id" value={draftId} />
      <div className="flex flex-wrap gap-2">
        {estado === "rascunho" && botao("enviada", "Já enviei", true)}
        {estado === "enviada" && followupsFeitos < 2 && botao("followup_feito", `Já enviei o follow-up ${followupsFeitos + 1}`, true)}
        {(estado === "enviada" || estado === "rascunho") && botao("respondeu", "A pessoa respondeu")}
        {estado !== "respondeu" && botao("nao_contactar", "Pediu para não contatar")}
        {botao("encerrar", "Encerrar abordagem")}
      </div>
      {e.erro && <p role="alert" className="text-[12px] font-semibold text-danger">{e.erro}</p>}
      {e.ok && <p className="text-[12px] font-semibold text-success">Atualizado.</p>}
      <p className="text-[11px] text-text-3">
        Encerrar ou &quot;não contatar&quot; apaga o texto e o trecho do perfil e fecha este contato para a vaga.
      </p>
    </form>
  );
}
