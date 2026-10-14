"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { adminSignOut } from "@/app/admin/actions";
import type { InternalRole } from "@/lib/auth/internal";

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  roles?: string[];
  children?: { href: string; label: string; exact?: boolean; roles?: string[] }[];
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/empresas", label: "Empresas" },
  { href: "/admin/vagas", label: "Cadastro de vagas" },
  { href: "/admin/candidatos", label: "Candidatos" },
  { href: "/admin/contatos", label: "Contatos" },
  { href: "/admin/talentos", label: "Talentos" },
  { href: "/admin/convites", label: "Convites" },
  {
    href: "/admin/agenda",
    label: "Agenda",
    children: [
      { href: "/admin/agenda", label: "Minha agenda", exact: true },
      { href: "/admin/agenda/entrevistas", label: "Entrevistas" },
      { href: "/admin/agenda/etapas", label: "Por etapa" },
      { href: "/admin/agenda/entregas", label: "Entregas" },
      { href: "/admin/agenda/equipe", label: "Agenda da equipe", roles: ["superadmin", "admin"] },
    ],
  },
  { href: "/admin/ranking", label: "Ranking", roles: ["superadmin", "admin"] },
  { href: "/admin/leads", label: "Leads", roles: ["superadmin", "admin"] },
  { href: "/admin/prestacoes", label: "Prestações", roles: ["superadmin", "admin"] },
  { href: "/admin/blacklist", label: "Black list", roles: ["superadmin", "admin"] },
  { href: "/admin/denuncias", label: "Denúncias", roles: ["superadmin", "admin"] },
  { href: "/admin/lgpd", label: "LGPD", roles: ["superadmin", "admin"] },
  { href: "/admin/auditoria", label: "Auditoria", roles: ["superadmin", "admin"] },
  { href: "/admin/carteira", label: "Carteira", roles: ["superadmin"] },
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const todos = NAV.flatMap((item) => [item, ...(item.children ?? [])]);
  // O item mais específico (maior href) que casa com a rota atual.
  const current = todos
    .filter((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setDrawerOpen(false);
  }

  const visibleNav = NAV.filter((item) => !item.roles || item.roles.includes(role));

  const navList = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-0.5">
      {visibleNav.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        if (item.children) {
          // Cascata: abre sozinha dentro da seção; o clique no título só recolhe/expande.
          const filhos = item.children.filter((c) => !c.roles || c.roles.includes(role));
          const aberto = pathname.startsWith(item.href) || abertos[item.href] === true;
          return (
            <div key={item.href} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setAbertos((a) => ({ ...a, [item.href]: !aberto }))}
                aria-expanded={aberto}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] font-bold ${
                  active ? "text-white" : "text-white/60 hover:text-white/85"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px]">{aberto ? "▾" : "▸"}</span>
              </button>
              {aberto &&
                filhos.map((c) => {
                  const ativoFilho = c.exact ? pathname === c.href : pathname.startsWith(c.href);
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={onNavigate}
                      className={`ml-3 rounded-lg border-l border-white/10 px-3 py-2 text-[12.5px] font-bold ${
                        ativoFilho ? "bg-white/10 text-white" : "text-white/55 hover:text-white/85"
                      }`}
                    >
                      {c.label}
                    </Link>
                  );
                })}
            </div>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`rounded-lg px-3 py-2.5 text-[13px] font-bold ${
              active ? "bg-white/10 text-white" : "text-white/60 hover:text-white/85"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarFooter = (
    <>
      <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 pt-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-gold-2" />
        <div className="min-w-0">
          <b className="block truncate text-xs text-white">{adminName}</b>
          <span className="block truncate text-[10.5px] text-white/50">{PERFIL_LABEL[role]}</span>
        </div>
      </div>
      <form action={adminSignOut} className="mt-3">
        <button className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white">
          Sair
        </button>
      </form>
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-bg md:flex-row">
      {/* Sidebar — desktop/tablet */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col bg-[#0c1526] p-4.5 text-white">
        <div className="flex items-center gap-2.5 px-2 pb-1">
          <BrandMark size={24} />
          <Wordmark light />
        </div>
        <div className="px-2 pb-5 text-[9.5px] font-extrabold uppercase tracking-wide text-white/40">Admin</div>
        {navList()}
        {sidebarFooter}
      </aside>

      {/* Drawer — mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="relative z-10 flex w-72 max-w-[80%] flex-col bg-[#0c1526] p-4.5 text-white">
            <div className="flex items-center justify-between px-2 pb-1">
              <div className="flex items-center gap-2.5">
                <BrandMark size={24} />
                <Wordmark light />
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="px-2 pb-5 text-[9.5px] font-extrabold uppercase tracking-wide text-white/40">Admin</div>
            {navList(() => setDrawerOpen(false))}
            {sidebarFooter}
          </aside>
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-hidden min-w-0">
        <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-4 md:px-9">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-2 hover:bg-navy-bg hover:text-navy md:hidden"
            >
              ☰
            </button>
            <div className="flex items-center gap-1.5 truncate text-[11.5px] font-bold text-text-3">
              <span>Admin</span>
              {current && current.href !== "/admin" && (
                <>
                  <span className="text-text-3/60">/</span>
                  <span className="truncate text-text-2">{current.label}</span>
                </>
              )}
            </div>
          </div>
          <a
            href="/vagas"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-text-2 hover:border-navy hover:text-navy"
          >
            Ver vitrine ↗
          </a>
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
