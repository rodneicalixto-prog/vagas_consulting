"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/brand-mark";

const NAV = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/vagas", label: "Cadastro de vagas" },
  { href: "/admin/lgpd", label: "LGPD" },
  { href: "/admin/auditoria", label: "Auditoria" },
  { href: "/admin/acesso", label: "Acesso" },
];

const PERFIL_LABEL: Record<string, string> = {
  superadmin: "Superadministrador",
  operacoes: "Operações",
  compliance: "Compliance e privacidade",
  suporte: "Suporte",
  financeiro: "Financeiro",
};

export function AdminShell({
  adminName,
  perfil,
  children,
}: {
  adminName: string;
  perfil: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="flex w-60 shrink-0 flex-col bg-[#0c1526] p-4.5 text-white">
        <div className="flex items-center gap-2.5 px-2 pb-1">
          <BrandMark size={24} />
          <Wordmark light />
        </div>
        <div className="px-2 pb-5 text-[9.5px] font-extrabold uppercase tracking-wide text-white/40">Admin</div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2.5 text-[13px] font-bold ${
                  active ? "bg-white/10 text-white" : "text-white/60 hover:text-white/85"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 pt-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-gold-2" />
          <div className="min-w-0">
            <b className="block truncate text-xs text-white">{adminName}</b>
            <span className="block truncate text-[10.5px] text-white/50">
              {PERFIL_LABEL[perfil] ?? perfil}
            </span>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
