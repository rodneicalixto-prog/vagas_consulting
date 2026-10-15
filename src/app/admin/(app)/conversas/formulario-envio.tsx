"use client";

import { useActionState, useEffect, useRef } from "react";
import { enviarMensagemComEstado, type EstadoEnvio } from "./actions";

const inicial: EstadoEnvio = { erro: null, ok: false };

/** Caixa de envio com o motivo do bloqueio visível na própria tela. */
export function FormularioEnvio({
  conversationId,
  descadastrado,
}: {
  conversationId: string;
  descadastrado: boolean;
}) {
  const [estado, acao, pendente] = useActionState(enviarMensagemComEstado, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  // Mensagem enviada: limpa a caixa.
  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={acao} className="shrink-0 border-t border-border p-2.5">
      <input type="hidden" name="conversation_id" value={conversationId} />
      {estado.erro && (
        <p role="alert" className="mb-2 rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger">
          {estado.erro}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          name="texto"
          required
          minLength={1}
          maxLength={2000}
          rows={2}
          disabled={descadastrado}
          placeholder={descadastrado ? "Envio bloqueado por descadastro." : "Escreva a mensagem"}
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[13px] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={descadastrado || pendente}
          className="shrink-0 rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {pendente ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
