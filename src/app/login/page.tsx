"use client";

import { useActionState, useState } from "react";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { login, signup, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [tab, setTab] = useState<"entrar" | "criar">("entrar");
  const [loginState, loginAction, loginPending] = useActionState(login, initialState);
  const [signupState, signupAction, signupPending] = useActionState(signup, initialState);

  const state = tab === "entrar" ? loginState : signupState;
  const pending = tab === "entrar" ? loginPending : signupPending;

  return (
    <div className="flex min-h-dvh flex-col md:items-center md:justify-center md:bg-bg">
      <div className="flex w-full flex-col md:max-w-4xl md:flex-row md:overflow-hidden md:rounded-3xl md:border md:border-border md:shadow-sm">
        {/* Hero */}
        <div className="flex flex-col items-center gap-3.5 bg-gradient-to-br from-navy-3 to-navy px-7 py-14 text-center md:w-1/2 md:justify-center md:px-10">
          <BrandMark size={56} />
          <Wordmark light />
          <p className="max-w-[280px] text-[13px] font-medium leading-relaxed text-white/70">
            Vagas efetivas, PJ e temporárias em um só lugar.
          </p>
        </div>

        {/* Form */}
        <div className="-mt-5 flex flex-1 flex-col gap-4 rounded-t-3xl bg-surface px-6 py-7 md:mt-0 md:rounded-none md:justify-center md:px-10">
          <div className="flex gap-1 rounded-lg bg-bg p-1">
            <button
              type="button"
              onClick={() => setTab("entrar")}
              className={`flex-1 rounded-md py-2 text-center text-[13px] font-bold ${
                tab === "entrar" ? "bg-surface text-navy shadow-sm" : "text-text-2"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setTab("criar")}
              className={`flex-1 rounded-md py-2 text-center text-[13px] font-bold ${
                tab === "criar" ? "bg-surface text-navy shadow-sm" : "text-text-2"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form action={tab === "entrar" ? loginAction : signupAction} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-text-2">E-mail</span>
              <input
                name="email"
                type="email"
                required
                className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
                placeholder="voce@email.com"
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

            {state.error && (
              <p className="text-[12.5px] font-semibold text-danger">{state.error}</p>
            )}
            {state.info && (
              <p className="text-[12.5px] font-semibold text-success">{state.info}</p>
            )}

            {tab === "entrar" && (
              <div className="flex justify-end -mt-2">
                <a href="#" className="text-[12.5px] font-semibold text-gold-3">
                  Esqueci minha senha
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-gold px-0 py-3.5 text-center text-[14.5px] font-extrabold text-[#1c1508] disabled:opacity-60"
            >
              {pending ? "Aguarde..." : tab === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <p className="mt-1 text-center text-[12.5px] text-text-2">
            {tab === "entrar" ? (
              <>
                Ainda não tem conta?{" "}
                <button onClick={() => setTab("criar")} className="font-extrabold text-gold-3">
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button onClick={() => setTab("entrar")} className="font-extrabold text-gold-3">
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
