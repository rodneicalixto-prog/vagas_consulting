"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  gerarDevolutiva,
  gerarLote,
  salvarDevolutiva,
  type EstadoDevolutiva,
  type EstadoEnvio,
  type EstadoLote,
} from "./actions";

const inicialGerar: EstadoDevolutiva = { erro: null, ok: false, id: null, avisos: [] };
const inicialLote: EstadoLote = { erro: null, geradas: 0, puladas: [] };
const inicialEnvio: EstadoEnvio = { erro: null, ok: false, enviada: false, bloqueios: [], avisos: [] };

const campo = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";

export function FormGerar({
  jobId,
  candidatos,
}: {
  jobId: string;
  candidatos: { id: string; nome: string; sugestao: string }[];
}) {
  const [estado, acao, enviando] = useActionState(gerarDevolutiva, inicialGerar);
  return (
    <form action={acao} className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
      <input type="hidden" name="job_id" value={jobId} />
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[10.5px] font-bold text-text-2">Candidato</span>
        <select name="application_id" required className={campo}>
          <option value="">Escolha</option>
          {candidatos.map((c) => (
            <option key={c.id} value={c.id}>{c.nome} · sugestão: {c.sugestao}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Tipo</span>
        <select name="tipo" required className={campo}>
          <option value="aprovacao">Aprovação</option>
          <option value="generica">Reprovação genérica</option>
          <option value="feedback">Reprovação com feedback</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Canal</span>
        <select name="canal" required className={campo}>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
          <option value="ligacao">Ligação (roteiro)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Tom</span>
        <select name="tom" defaultValue="formal" className={campo}>
          <option value="formal">Formal</option>
          <option value="descontraido">Descontraído</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Assinatura (quem fala)</span>
        <input name="recrutador" placeholder="Seu nome e empresa" className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Aprovação: próximo passo</span>
        <input name="proximo_passo" className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Aprovação: prazo</span>
        <input name="prazo" placeholder="Ex.: até sexta-feira" className={campo} />
      </label>
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[10.5px] font-bold text-text-2">Aprovação: documentos pedidos (um por linha, opcional)</span>
        <textarea name="documentos" rows={3} className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Feedback: pontos fortes (vazio = pega da ficha)</span>
        <textarea name="fortes" rows={2} className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Feedback: melhoria acionável (vazio = pega da ficha)</span>
        <textarea name="melhoria" rows={2} className={campo} />
      </label>
      <label className="flex items-center gap-2 text-[12.5px] font-bold text-text md:col-span-2">
        <input type="checkbox" name="banco_talentos" value="sim" />
        Vou realmente guardar o currículo no banco de talentos (só então a mensagem pode prometer isso)
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger md:col-span-2">
          {estado.erro}
        </p>
      )}
      {estado.ok && estado.id && (
        <p className="rounded-lg bg-success-bg px-3 py-2 text-[12px] font-semibold text-success md:col-span-2">
          Rascunho gerado.{" "}
          <Link href={`/admin/vagas/${jobId}/devolutivas/${estado.id}`} className="underline">Revisar e enviar</Link>
          {estado.avisos.map((a) => <span key={a} className="ml-2 font-normal">{a}</span>)}
        </p>
      )}
      <div className="md:col-span-2">
        <button type="submit" disabled={enviando} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
          {enviando ? "Gerando..." : "Gerar rascunho"}
        </button>
        <span className="ml-3 text-[11px] text-text-3">
          A plataforma só prepara. Quem envia é você, pelo canal escolhido, e depois marca como enviada.
        </span>
      </div>
    </form>
  );
}

export function FormLote({ jobId, candidatos }: { jobId: string; candidatos: { id: string; nome: string; bloqueio: string | null }[] }) {
  const [estado, acao, enviando] = useActionState(gerarLote, inicialLote);
  return (
    <form action={acao} className="grid gap-3 rounded-2xl border border-border bg-surface p-5">
      <input type="hidden" name="job_id" value={jobId} />
      <h2 className="text-sm font-extrabold text-text">Genérica em lote (quem parou na triagem)</h2>
      <ul className="grid gap-1 md:grid-cols-2">
        {candidatos.map((c) => (
          <li key={c.id}>
            <label className="flex items-center gap-2 text-[12.5px]">
              <input type="checkbox" name="ids" value={c.id} disabled={!!c.bloqueio} />
              {c.nome}
              {c.bloqueio && <span className="text-[11px] text-danger">({c.bloqueio})</span>}
            </label>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 md:grid-cols-3">
        <select name="tom" defaultValue="formal" className={campo}>
          <option value="formal">Formal</option>
          <option value="descontraido">Descontraído</option>
        </select>
        <input name="recrutador" placeholder="Assinatura" className={campo} />
        <button type="submit" disabled={enviando} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-navy disabled:opacity-60">
          {enviando ? "Gerando..." : "Gerar rascunhos para revisão"}
        </button>
      </div>
      {estado.erro && <p role="alert" className="text-[12px] font-semibold text-danger">{estado.erro}</p>}
      {!estado.erro && (estado.geradas > 0 || estado.puladas.length > 0) && (
        <div className="text-[12px] text-text-2">
          {estado.geradas} rascunho(s) gerado(s). Revise e envie um a um.
          {estado.puladas.length > 0 && (
            <ul className="mt-1 list-disc pl-5">{estado.puladas.map((p) => <li key={p}>{p}</li>)}</ul>
          )}
        </div>
      )}
    </form>
  );
}

export function FormEnviar({
  jobId,
  feedbackId,
  texto,
  bloqueada,
  motivoBloqueio,
}: {
  jobId: string;
  feedbackId: string;
  texto: string;
  bloqueada: boolean;
  motivoBloqueio: string | null;
}) {
  const [estado, acao, enviando] = useActionState(salvarDevolutiva, inicialEnvio);
  return (
    <form action={acao} className="grid gap-3">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="feedback_id" value={feedbackId} />
      <textarea name="texto" rows={12} defaultValue={texto} disabled={bloqueada} className={campo + " font-sans leading-relaxed"} />
      {motivoBloqueio && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger">{motivoBloqueio}</p>
      )}
      {estado.erro && (
        <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[12.5px] font-semibold text-danger">
          {estado.erro}
          {estado.bloqueios.length > 0 && (
            <ul className="mt-1 list-disc pl-5 font-normal">{estado.bloqueios.map((b) => <li key={b}>{b}</li>)}</ul>
          )}
        </div>
      )}
      {estado.ok && (
        <div className="rounded-xl bg-success-bg px-4 py-3 text-[12.5px] font-semibold text-success">
          {estado.enviada ? "Marcada como enviada. Não muda mais." : "Rascunho salvo."}
          {estado.avisos.length > 0 && (
            <ul className="mt-1 list-disc pl-5 font-normal text-gold-3">{estado.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          )}
        </div>
      )}
      {!bloqueada && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={enviando} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-navy disabled:opacity-60">
            Salvar rascunho
          </button>
          <button type="submit" name="enviada" value="sim" disabled={enviando} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            Já enviei (marcar como enviada)
          </button>
          <span className="text-[11px] text-text-3">Copie o texto, envie pelo canal e então marque. Só uma devolutiva por candidatura.</span>
        </div>
      )}
    </form>
  );
}
