"use client";

import { useState, useTransition } from "react";
import { setConsent } from "./actions";

export function ConsentToggle({
  finalidade,
  canal,
  initialOn,
  label,
  caption,
}: {
  finalidade: string;
  canal: string | null;
  initialOn: boolean;
  label: string;
  caption?: string;
}) {
  const [on, setOn] = useState(initialOn);
  const [, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        const next = !on;
        setOn(next);
        startTransition(() => {
          setConsent(finalidade, canal, next);
        });
      }}
      className="flex w-full items-center justify-between py-[11px] text-left"
    >
      <span>
        <span className="block text-[13px] font-bold">{label}</span>
        {caption && <span className="block text-[11px] text-text-3">{caption}</span>}
      </span>
      <span
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
          on ? "bg-gold" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
