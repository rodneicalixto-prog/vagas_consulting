"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import {
  IconHome,
  IconBriefcase,
  IconChecklist,
  IconMessage,
  IconUser,
} from "@/components/icons";
import { signOut } from "@/app/(app)/perfil/actions";

const navItems = [
  { href: "/inicio", label: "Início", icon: IconHome },
  { href: "/vagas", label: "Vagas", icon: IconBriefcase },
  { href: "/processos", label: "Processos", icon: IconChecklist },
  { href: "/mensagens", label: "Mensagens", icon: IconMessage },
  { href: "/perfil", label: "Perfil", icon: IconUser },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Sidebar — tablet/desktop */}
      <aside className="hidden md:flex md:w-60 lg:w-64 md:flex-col md:border-r md:border-border md:bg-surface md:shrink-0">
        <div className="flex items-center gap-2.5 px-6 py-6">
          <BrandMark size={30} />
          <Wordmark />
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                isActive(href)
                  ? "bg-navy text-white"
                  : "text-text-2 hover:bg-navy-bg hover:text-navy"
              }`}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="mt-auto px-3 pb-5">
          <button className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm font-semibold text-text-2 hover:bg-navy-bg hover:text-navy">
            Sair
          </button>
        </form>
      </aside>

      {/* Content */}
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 min-h-0 pb-20 md:pb-0">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>

        {/* Bottom nav — mobile only */}
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 md:hidden">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-bold ${
                isActive(href) ? "text-navy" : "text-text-3"
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
