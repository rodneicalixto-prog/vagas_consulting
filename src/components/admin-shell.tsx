"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { adminSignOut } from "@/app/admin/actions";
import type { InternalRole } from "@/lib/auth/internal";

const NAV = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/vagas", label: "Cadastro de vagas" },
  { href: "/admin/candidatos", label: "Candidatos" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/prestacoes", label: "Prestações" },
  { href: "/admin/denuncias", label: "Denúncias", roles: ["superadmin", "admin"] },
  { href: "/admin/lgpd", label: "LGPD", roles: ["superadmin", "admin"] },
  { href: "/admin/auditoria", label: "Auditoria", roles: ["superadmin", "admin"] },
  { href: "/admin/acesso", label: "Acesso", roles: ["superadmin"] },
  { href: "/admin/estrategico", label: "Estratégico", roles: ["superadmin"] },
];

const PERFIL_LABEL: Record<string, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  operador: "Operador",
};

export function AdminShell({
  adminName,
  role,
  children,
}: {
  adminName: string;
  role: InternalRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = NAV.find((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href),
  );

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="flex w-60 shrink-0 flex-col bg-[#0c1526] p-4.5 text-white">
        <div className="flex items-center gap-2.5 px-2 pb-1">
          <BrandMark size={24} />
          <Wordmark light />
        </div>
        <div className="px-2 pb-5 text-[9.5px] font-extrabold uppercase tracking-wide text-white/40">Admin</div>
        <nav className="flex flex-col gap-0.5">
          {NAV.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
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
              {PERFIL_LABEL[role]}
            </span>
          </div>
        </div>
        <form action={adminSignOut} className="mt-3">
          <button className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white">
            Sair
          </button>
        </form>
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-9">
          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-text-3">
            <span>Admin</span>
            {current && current.href !== "/admin" && (
              <>
                <span className="text-text-3/60">/</span>
                <span className="text-text-2">{current.label}</span>
              </>
            )}
          </div>
          <a
            href="/vagas"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-text-2 hover:border-navy hover:text-navy"
          >
            Ver vitrine pública ↗
          </a>
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
