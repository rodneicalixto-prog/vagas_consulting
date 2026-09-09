"use client";

import { useActionState } from "react";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { adminLogin, type AdminAuthState } from "./actions";

const initialState: AdminAuthState = { error: null };

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(adminLogin, initialState);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0c1526] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-navy-3 p-9">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandMark size={28} />
          <Wordmark light />
          <span className="ml-1 rounded bg-danger px-1.5 py-0.5 text-[9px] font-extrabold text-white">ADMIN</span>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-white/60">E-mail</span>
            <input
              name="email"
              type="email"
              required
              className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white outline-none focus:border-gold-2"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-white/60">Senha</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="rounded-lg border border-white/15 bg-white/5 px-3.5 py-3 text-sm text-white outline-none focus:border-gold-2"
            />
          </label>

          {state.error && <p className="text-[12.5px] font-semibold text-[#dc8290]">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-gold px-0 py-3.5 text-[14.5px] font-extrabold text-[#1c1508] disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
