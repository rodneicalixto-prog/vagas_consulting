"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/brand-mark";

const NAV = [
  { href: "/portal/dashboard", label: "Dashboard" },
  { href: "/portal/vagas", label: "Solicitações de vaga" },
  { href: "/portal/candidatos", label: "Candidatos" },
  { href: "/portal/temporarios", label: "Temporários" },
];

export function PortalShell({
  companyName,
  memberName,
  children,
}: {
  companyName: string;
  memberName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="flex w-60 shrink-0 flex-col bg-navy p-4.5 text-white">
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <BrandMark size={26} />
          <Wordmark light />
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-[13px] font-bold ${
                pathname.startsWith(item.href)
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white/85"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 pt-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-gold-2" />
          <div className="min-w-0">
            <b className="block truncate text-xs text-white">{memberName}</b>
            <span className="block truncate text-[10.5px] text-white/50">{companyName}</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
