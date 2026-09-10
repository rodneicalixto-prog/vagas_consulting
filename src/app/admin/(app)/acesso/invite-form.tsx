"use client";

import { useActionState } from "react";
import { convidarAdmin, type ConvidarState } from "./actions";

const initialState: ConvidarState = { error: null };

export function InviteAdminForm() {
  const [state, formAction, pending] = useActionState(convidarAdmin, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2.5 rounded-2xl border border-border bg-surface p-4">
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Nome</span>
        <input name="nome" className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">E-mail</span>
        <input name="email" type="email" required className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Telefone</span>
        <input name="telefone" placeholder="(11) 90000-0000" className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Perfil</span>
        <select name="perfil" required defaultValue="" className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]">
          <option value="" disabled>Selecionar...</option>
          <option value="admin">Administrador</option>
          <option value="operador">Operador</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-gold px-4 py-2.5 text-[12px] font-extrabold text-[#1c1508] disabled:opacity-60"
      >
        {pending ? "Enviando..." : "+ Convidar usuário"}
      </button>

      {state.error && <p className="w-full text-[11.5px] font-semibold text-danger">{state.error}</p>}
      {state.info && <p className="w-full text-[11.5px] font-semibold text-success">{state.info}</p>}
    </form>
  );
}
