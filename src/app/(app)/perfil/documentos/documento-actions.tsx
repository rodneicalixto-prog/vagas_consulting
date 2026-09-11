"use client";

import { useRef, useState, useTransition } from "react";
import { IconUpload } from "@/components/icons";
import { obterUrlAssinadaCurriculo, substituirDocumento } from "./actions";

export function VerDocumentoButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const resultado = await obterUrlAssinadaCurriculo();
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      window.open(resultado.url, "_blank");
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={onClick}
        disabled={pending}
        className="w-full rounded-xl bg-gold px-0 py-3.5 text-[14.5px] font-extrabold text-[#1c1508] disabled:opacity-50"
      >
        {pending ? "Abrindo..." : "Ver documento"}
      </button>
      {error && <p className="text-[11.5px] font-semibold text-danger">{error}</p>}
    </div>
  );
}

export function SubstituirDocumentoButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    startTransition(async () => {
      const resultado = await substituirDocumento(file);
      if (resultado.error) {
        setError(resultado.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-0 py-3.5 text-[13px] font-bold text-navy disabled:opacity-50"
      >
        <IconUpload size={16} />
        {pending ? "Enviando..." : "Substituir documento"}
      </button>
      {error && <p className="text-[11.5px] font-semibold text-danger">{error}</p>}
    </div>
  );
}
