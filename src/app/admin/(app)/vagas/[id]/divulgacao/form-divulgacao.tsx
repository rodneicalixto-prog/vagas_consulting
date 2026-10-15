"use client";

import { useActionState, useState } from "react";
import { gerarDivulgacao, type EstadoDivulgacao } from "../../actions";

const inicial: EstadoDivulgacao = { erro: null, resultados: [], suposicoes: [], link: "" };

const CANAIS: { id: string; rotulo: string }[] = [
  { id: "linkedin", rotulo: "LinkedIn (post)" },
  { id: "instagram", rotulo: "Instagram (legenda e arte)" },
  { id: "whatsapp", rotulo: "WhatsApp e grupos" },
  { id: "portal", rotulo: "Portal de vagas (Gupy, Catho, Indeed)" },
  { id: "comunidade", rotulo: "Comunidade tech (Discord, Slack)" },
  { id: "interna", rotulo: "Vaga interna" },
  { id: "indicacao", rotulo: "E-mail ou programa de indicação" },
];

const COR: Record<string, string> = {
  ok: "bg-success-bg text-success",
  aviso: "bg-gold-bg text-gold-3",
  bloqueio: "bg-danger-bg text-danger",
};
const ROTULO: Record<string, string> = { ok: "OK", aviso: "Aviso", bloqueio: "Bloqueia" };

function Copiar({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
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
          /* sem permissão de área de transferência */
        }
      }}
      className="rounded-lg border border-border bg-surface px-3 py-1 text-[11.5px] font-bold text-navy"
    >
      {feito ? "Copiado" : rotulo}
    </button>
  );
}

export function FormDivulgacao({
  jobId,
  temFaixa,
  publicada,
}: {
  jobId: string;
  temFaixa: boolean;
  publicada: boolean;
}) {
  const [estado, acao, pendente] = useActionState(gerarDivulgacao, inicial);

  return (
    <div className="grid gap-6">
      <form action={acao} className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
        <input type="hidden" name="job_id" value={jobId} />

        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-[10.5px] font-bold text-text-2">Onde vai publicar (pode marcar vários)</legend>
          <div className="flex flex-wrap gap-2">
            {CANAIS.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-[12.5px]">
                <input type="checkbox" name="canais" value={c.id} defaultChecked={c.id === "linkedin"} />
                {c.rotulo}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-bold text-text-2">Perfil do público</span>
          <select name="perfil" defaultValue="menos" className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
            <option value="menos">Menos técnico (operacional, comercial, administrativo)</option>
            <option value="tecnico">Técnico (TI, dados, engenharia, produto)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10.5px] font-bold text-text-2">Tom da empresa</span>
          <select name="tom" defaultValue="tradicional" className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
            <option value="descontraido">Descontraído</option>
            <option value="tradicional">Tradicional</option>
            <option value="proposito">Propósito e impacto</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-[12.5px] font-bold text-text">
          <input type="checkbox" name="mostrar_faixa" value="sim" defaultChecked={temFaixa} disabled={!temFaixa} />
          Mostrar a faixa de remuneração {temFaixa ? "" : "(a vaga não tem faixa informada)"}
        </label>

        {!publicada && (
          <p className="rounded-lg bg-gold-bg px-3 py-2 text-[11.5px] font-semibold text-gold-3 md:col-span-2">
            A vaga ainda não está publicada: o link da vitrine só funciona depois de publicar.
          </p>
        )}

        {estado.erro && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger md:col-span-2">
            {estado.erro}
          </p>
        )}

        <div className="md:col-span-2">
          <button type="submit" disabled={pendente} className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            {pendente ? "Gerando..." : "Gerar divulgação"}
          </button>
          <span className="ml-3 text-[11px] text-text-3">
            A IA redige; você confere, copia e publica fora da plataforma.
          </span>
        </div>
      </form>

      {estado.suposicoes.length > 0 && (
        <div className="rounded-xl bg-navy-bg px-4 py-3 text-[12.5px] text-text-2">
          <b className="text-text">A IA assumiu:</b>
          <ul className="mt-1 list-disc pl-5">
            {estado.suposicoes.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {estado.resultados.map((r) => (
        <section key={r.canal} className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-text">{r.rotulo}</h2>
            <Copiar texto={r.copia} rotulo="Copiar texto" />
          </div>

          {r.ganchos.length > 0 && (
            <div className="mb-3">
              <div className="text-[10.5px] font-bold uppercase text-text-3">Opções de gancho</div>
              <ul className="mt-1 grid gap-1">
                {r.ganchos.map((g) => (
                  <li key={g} className="flex items-start justify-between gap-2 rounded-lg bg-bg px-3 py-2 text-[12.5px]">
                    <span>{g}</span>
                    <Copiar texto={g} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.titulo && (
            <p className="mb-2 text-[12.5px]">
              <b className="text-text">Título / assunto:</b> {r.titulo}
            </p>
          )}
          <pre className="whitespace-pre-wrap break-words rounded-xl bg-bg p-4 font-sans text-[13px] leading-relaxed text-text">
            {r.texto}
          </pre>
          {r.briefing_arte && (
            <p className="mt-2 text-[12.5px] text-text-2">
              <b className="text-text">Briefing da arte:</b> {r.briefing_arte}
            </p>
          )}

          <ul className="mt-3 grid gap-1.5 md:grid-cols-2">
            {r.verificacoes.map((v) => (
              <li key={v.id} className="flex items-start gap-2 text-[11.5px] text-text-2">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${COR[v.nivel]}`}>
                  {ROTULO[v.nivel]}
                </span>
                <span>{v.mensagem}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
