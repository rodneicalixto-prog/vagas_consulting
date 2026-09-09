"use client";

import { useActionState } from "react";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { portalLogin, type PortalAuthState } from "./actions";

const initialState: PortalAuthState = { error: null };

export default function PortalLoginPage() {
  const [state, formAction, pending] = useActionState(portalLogin, initialState);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-3xl border border-border shadow-sm md:flex">
        <div className="hidden w-[380px] shrink-0 flex-col justify-between bg-gradient-to-br from-navy-3 to-navy p-11 text-white md:flex">
          <div className="flex items-center gap-2.5">
            <BrandMark size={34} />
            <Wordmark light />
          </div>
          <div>
            <h2 className="mb-3.5 text-2xl font-extrabold leading-tight">Portal da Empresa</h2>
            <p className="text-[13.5px] leading-relaxed text-white/70">
              Solicite vagas, acompanhe o pipeline de candidatos e gerencie
              temporários em um só lugar.
            </p>
          </div>
          <div className="text-[11.5px] text-white/50">© Vagas Consulting — Ambiente da Empresa</div>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-4 bg-surface p-10">
          <div className="md:hidden mb-2 flex items-center gap-2">
            <BrandMark size={28} />
            <Wordmark />
          </div>
          <h1 className="text-xl font-extrabold text-text">Entrar no Portal da Empresa</h1>
          <p className="-mt-2 text-[13px] text-text-2">
            Acesse sua conta para gerenciar vagas e candidatos.
          </p>

          <form action={formAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-text-2">E-mail corporativo</span>
              <input
                name="email"
                type="email"
                required
                className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
                placeholder="nome@empresa.com.br"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-text-2">Senha</span>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
                placeholder="••••••••"
              />
            </label>

            {state.error && <p className="text-[12.5px] font-semibold text-danger">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-gold px-0 py-3.5 text-[14.5px] font-extrabold text-[#1c1508] disabled:opacity-60"
            >
              {pending ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-[12px] text-text-2">
            Ainda não solicitou acesso? Fale com o suporte de empresas da Vagas Consulting.
          </p>
        </div>
      </div>
    </div>
  );
}
