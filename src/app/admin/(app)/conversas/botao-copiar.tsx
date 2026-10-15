"use client";

import { useState } from "react";

/** Copia o texto da mensagem para a área de transferência. */
export function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // sem permissão de área de transferência: não faz nada
    }
  };

  return (
    <button type="button" onClick={copiar} className="font-bold underline-offset-2 hover:underline">
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}
