import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/brand-mark";

export default function LoginPage() {
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
            <div className="flex-1 rounded-md bg-surface py-2 text-center text-[13px] font-bold text-navy shadow-sm">
              Entrar
            </div>
            <Link
              href="/onboarding"
              className="flex-1 rounded-md py-2 text-center text-[13px] font-bold text-text-2"
            >
              Criar conta
            </Link>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-2">E-mail ou telefone</span>
            <input
              className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
              placeholder="voce@email.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-text-2">Senha</span>
            <input
              type="password"
              className="rounded-lg border border-border bg-white px-3.5 py-3 text-sm outline-none focus:border-navy"
              placeholder="••••••••"
            />
          </label>

          <div className="flex justify-end">
            <a href="#" className="text-[12.5px] font-semibold text-gold-3">
              Esqueci minha senha
            </a>
          </div>

          <Link
            href="/termos"
            className="w-full rounded-xl bg-gold px-0 py-3.5 text-center text-[14.5px] font-extrabold text-[#1c1508]"
          >
            Entrar
          </Link>

          <div className="flex items-center gap-2.5 text-[11.5px] font-semibold text-text-3">
            <div className="h-px flex-1 bg-border" />
            ou continue com
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1 rounded-lg border border-border py-2.5 text-center text-[13px] font-bold">
              Google
            </div>
            <div className="flex-1 rounded-lg border border-border py-2.5 text-center text-[13px] font-bold">
              Apple
            </div>
          </div>

          <p className="mt-1 text-center text-[12.5px] text-text-2">
            Ainda não tem conta?{" "}
            <Link href="/onboarding" className="font-extrabold text-gold-3">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
