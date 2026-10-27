"use client";

import { useState } from "react";
import { IconShare } from "@/components/icons";

/** Copiar link e abrir o WhatsApp com texto e link prontos. */
export function Compartilhar({ linkCopiar, linkWhatsapp }: { linkCopiar: string; linkWhatsapp: string }) {
  const [estado, setEstado] = useState<"" | "copiado" | "falhou">("");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(linkCopiar);
      setEstado("copiado");
    } catch {
      setEstado("falhou");
    }
    setTimeout(() => setEstado(""), 2500);
  }

  const botao =
    "flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] font-bold text-navy transition-colors hover:border-navy";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Compartilhar esta vaga">
      <button type="button" onClick={copiar} className={botao}>
        <IconShare />
        {estado === "copiado" ? "Link copiado" : estado === "falhou" ? "Copie pela barra de endereço" : "Copiar link"}
      </button>
      <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className={botao}>
        Enviar no WhatsApp
      </a>
    </div>
  );
}
