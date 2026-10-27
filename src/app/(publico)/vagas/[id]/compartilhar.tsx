"use client";

import { useEffect, useRef, useState } from "react";
import { IconShare } from "@/components/icons";

/** Copiar link e abrir o WhatsApp com texto e link prontos. */
export function Compartilhar({ linkCopiar, linkWhatsapp }: { linkCopiar: string; linkWhatsapp: string }) {
  const [estado, setEstado] = useState<"" | "copiado" | "falhou">("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copiar() {
    try {
      await navigator.clipboard.writeText(linkCopiar);
      setEstado("copiado");
    } catch {
      setEstado("falhou");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setEstado(""), 2500);
  }

  const botao =
    "flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] font-bold text-navy transition-colors hover:border-navy";

  return (
    <div role="group" className="flex flex-wrap items-center gap-2" aria-label="Compartilhar esta vaga">
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
