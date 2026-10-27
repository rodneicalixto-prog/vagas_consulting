import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { siteUrl } from "@/lib/hunter-servidor";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
};

/** Layout público das vagas: marca, entrar e rodapé; sem o menu do app do candidato. */
export default async function PublicoLayout({ children }: { children: React.ReactNode }) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-3 md:px-8">
          <Link href="/vagas" className="flex items-center gap-2.5 text-[16px]">
            <BrandMark size={28} />
            <Wordmark />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/vagas" className="rounded-lg px-3 py-2 text-[13px] font-bold text-navy">
              Vagas
            </Link>
            <Link
              href={user ? "/inicio" : "/login?next=%2Fvagas"}
              className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-bold text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
            >
              {user ? "Meu painel" : "Entrar"}
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-[12px] text-text-3 md:px-8">
          <span>© Vagas Consulting</span>
          <Link href="/termos" className="font-semibold text-text-2 underline-offset-2 hover:underline">
            Termos e privacidade
          </Link>
        </div>
      </footer>
    </div>
  );
}
