"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Recarrega os dados do servidor a cada 15 s (sem remontar a página). */
export function AtualizarSozinho({ segundos = 15 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos]);
  return null;
}
