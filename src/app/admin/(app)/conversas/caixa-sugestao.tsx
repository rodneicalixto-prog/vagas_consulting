"use client";

import { useState } from "react";
import { descartarSugestao } from "./actions";

const MOTIVOS: Record<string, string> = {
  risco_juridico: "Assunto jurídico: responda você.",
  risco_saude: "Assunto de saúde: responda você.",
  risco_ameaca: "Mensagem com ameaça: responda você.",
  risco_dados_pessoais: "Pedido sobre dados pessoais: responda você e, se for o caso, aciona o responsável pela LGPD.",
  risco_reclamacao: "Reclamação: responda você.",
  sem_fonte: "O assistente não tem fonte aprovada para responder isto. Responda você.",
  teto_mensal: "O teto de custo de IA do mês foi atingido. As sugestões voltam no próximo mês ou com ajuste do teto.",
};

/** Sugestão do assistente: Usar, Editar ou Descartar. Quem envia é sempre a pessoa. */
export function CaixaSugestao({
  id,
  rascunho,
  motivo,
  fonte,
  conversationId,
}: {
  id: string;
  rascunho: string;
  motivo: string | null;
  fonte: string[];
  conversationId: string;
}) {
  const [aberta, setAberta] = useState(true);
  if (!aberta) return null;

  const aplicar = (editar: boolean) => {
    window.dispatchEvent(
      new CustomEvent("sugestao:aplicar", { detail: { id, texto: rascunho, editar } }),
    );
  };

  if (motivo || !rascunho) {
    return (
      <div className="shrink-0 border-t border-border bg-gold-bg px-4 py-2 text-[12px] font-semibold text-gold-3">
        {MOTIVOS[motivo ?? ""] ?? "O assistente não gerou sugestão para esta mensagem."}
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-border bg-navy-bg px-4 py-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
          Sugestão do assistente
        </span>
        {fonte.length > 0 && (
          <span className="truncate text-[10.5px] text-text-2" title={fonte.join(" · ")}>
            Fonte: {fonte.slice(0, 3).join(" · ")}
            {fonte.length > 3 ? ` +${fonte.length - 3}` : ""}
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words text-[12.5px] text-text">{rascunho}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] font-bold">
        <button type="button" onClick={() => aplicar(false)} className="rounded-lg bg-navy px-3 py-1.5 text-white">
          Usar
        </button>
        <button type="button" onClick={() => aplicar(true)} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-navy">
          Editar
        </button>
        <form action={descartarSugestao} onSubmit={() => setAberta(false)}>
          <input type="hidden" name="sugestao_id" value={id} />
          <input type="hidden" name="conversation_id" value={conversationId} />
          <button type="submit" className="px-1 text-text-2 underline">
            Descartar
          </button>
        </form>
      </div>
      <p className="mt-1 text-[10.5px] text-text-3">
        Rascunho gerado por IA a partir da vaga e da base aprovada. Confira antes de enviar.
      </p>
    </div>
  );
}
