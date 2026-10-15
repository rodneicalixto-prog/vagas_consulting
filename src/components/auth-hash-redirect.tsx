"use client";

import { useEffect } from "react";

/**
 * Links de convite e de recuperação de senha do Supabase chegam na página
 * inicial com os tokens no fragmento (#access_token=...&type=invite).
 * Aqui eles são levados à tela de definir senha, preservando o fragmento.
 */
export function AuthHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token=")) return;
    const tipo = new URLSearchParams(hash.slice(1)).get("type");
    if (tipo !== "invite" && tipo !== "recovery") return;
    if (window.location.pathname === "/admin/definir-senha") return;
    window.location.replace(`/admin/definir-senha${hash}`);
  }, []);
  return null;
}
