"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark, Wordmark } from "@/components/brand-mark";
import { adminSignOut } from "@/app/admin/actions";
import type { InternalRole } from "@/lib/auth/internal";

type NavLink = { href: string; label: string; exact?: boolean; roles?: string[] };
type NavGroup = { id: string; label: string; children: NavLink[] };
type NavEntry = NavLink | NavGroup;

function ehGrupo(e: NavEntry): e is NavGroup {
  return "children" in e;
}

// Poucas seções, cada uma abre em cascata: o menu cabe na tela sem rolar.
const NAV: NavEntry[] = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/conversas", label: "Conversas" },
  {
    id: "agenda",
    label: "Agenda",
    children: [
      { href: "/admin/agenda", label: "Minha agenda", exact: true },
      { href: "/admin/agenda/entrevistas", label: "Entrevistas" },
      { href: "/admin/agenda/etapas", label: "Por etapa" },
      { href: "/admin/agenda/entregas", label: "Entregas" },
      { href: "/admin/agenda/equipe", label: "Agenda da equipe", roles: ["superadmin", "admin", "admin_empresa"] },
    ],
  },
  {
    id: "pessoas",
    label: "Candidatos",
    children: [
      { href: "/admin/candidatos", label: "Candidatos" },
      { href: "/admin/contatos", label: "Contatos" },
      { href: "/admin/talentos", label: "Talentos" },
      { href: "/admin/convites", label: "Convites" },
      { href: "/admin/ranking", label: "Ranking", roles: ["superadmin", "admin"] },
    ],
  },
  {
    id: "vagas",
    label: "Empresas e vagas",
    children: [
      { href: "/admin/empresas", label: "Empresas" },
      { href: "/admin/vagas", label: "Cadastro de vagas" },
      { href: "/admin/operadores", label: "Operadores", roles: ["admin_empresa", "superadmin", "admin"] },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro e dados",
    children: [
      { href: "/admin/prestacoes", label: "Prestações", roles: ["superadmin", "admin", "admin_empresa"] },
      { href: "/admin/leads", label: "Leads", roles: ["superadmin", "admin"] },
      { href: "/admin/blacklist", label: "Black list", roles: ["superadmin", "admin", "admin_empresa"] },
    ],
  },
  {
    id: "governanca",
    label: "Governança",
    children: [
      { href: "/admin/denuncias", label: "Denúncias", roles: ["superadmin", "admin"] },
      { href: "/admin/lgpd", label: "LGPD", roles: ["superadmin", "admin"] },
      { href: "/admin/auditoria", label: "Auditoria", roles: ["superadmin", "admin"] },
    ],
  },
  {
    id: "plataforma",
    label: "Plataforma",
    children: [
      { href: "/admin/integracoes", label: "Integrações", roles: ["superadmin", "admin_empresa"] },
      { href: "/admin/linhas", label: "Números de WhatsApp", roles: ["superadmin", "admin_empresa"] },
      { href: "/admin/agente", label: "Agente de IA", roles: ["superadmin"] },
      { href: "/admin/carteira", label: "Carteira", roles: ["superadmin"] },
      { href: "/admin/acesso", label: "Acesso", roles: ["superadmin"] },
      { href: "/admin/estrategico", label: "Estratégico", roles: ["superadmin", "admin_empresa", "operador"] },
      { href: "/admin/indicadores", label: "Indicadores de R&S", roles: ["superadmin", "admin", "admin_empresa", "operador"] },
    ],
  },
];

const PERFIL_LABEL: Record<string, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  admin_empresa: "Administrador da empresa",
  operador: "Operador",
};

export function AdminShell({
  adminName,
  role,
  suporteHref,
  children,
}: {
  adminName: string;
  role: InternalRole;
  /** Link de WhatsApp da operação (só para equipes de empresas clientes). */
  suporteHref?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const todos: NavLink[] = NAV.flatMap((e) => (ehGrupo(e) ? e.children : [e]));
  // O link mais específico (maior href) que casa com a rota atual.
  const casa = (l: NavLink) => (l.exact ? pathname === l.href : pathname.startsWith(l.href));
  const current = todos.filter(casa).sort((x, y) => y.href.length - x.href.length)[0];

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setDrawerOpen(false);
  }

  const permitido = (l: { roles?: string[] }) => !l.roles || l.roles.includes(role);

  const navList = (onNavigate?: () => void) => (
    <nav className="flex min-h-0 flex-col gap-0.5">
      {NAV.map((entrada) => {
        if (!ehGrupo(entrada)) {
          if (!permitido(entrada)) return null;
          const ativo = entrada.exact ? pathname === entrada.href : pathname.startsWith(entrada.href);
          return (
            <Link
              key={entrada.href}
              href={entrada.href}
              onClick={onNavigate}
              className={`rounded-lg px-3 py-2 text-[12.5px] font-bold ${
                ativo ? "bg-white/10 text-white" : "text-white/60 hover:text-white/85"
              }`}
            >
              {entrada.label}
            </Link>
          );
        }

        const filhos = entrada.children.filter(permitido);
        if (filhos.length === 0) return null;
        const temAtivo = filhos.some(casa);
        const aberto = abertos[entrada.id] ?? temAtivo;
        return (
          <div key={entrada.id} className="flex flex-col">
            <button
              type="button"
              onClick={() => setAbertos((a) => ({ ...a, [entrada.id]: !aberto }))}
              aria-expanded={aberto}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-[12.5px] font-bold ${
                temAtivo ? "text-white" : "text-white/60 hover:text-white/85"
              }`}
            >
              <span>{entrada.label}</span>
              <span className="text-[10px] opacity-70">{aberto ? "▾" : "▸"}</span>
            </button>
            {aberto && (
              <div className="mb-1 ml-3 flex flex-col border-l border-white/10">
                {filhos.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={onNavigate}
                    className={`rounded-r-lg px-3 py-1.5 text-[12px] font-semibold ${
                      casa(c) && current?.href === c.href
                        ? "bg-white/10 text-white"
                        : "text-white/55 hover:text-white/85"
                    }`}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
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
      {suporteHref && (
        <a
          href={suporteHref}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block w-full rounded-lg bg-success/90 px-3 py-2 text-center text-xs font-bold text-white hover:bg-success"
        >
          Falar com a SOS Vagas
        </a>
      )}
      <form action={adminSignOut} className="mt-3">
        <button className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white">
          Sair
        </button>
      </form>
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-bg md:h-dvh md:flex-row md:overflow-hidden">
      {/* Sidebar — desktop/tablet */}
      <aside className="hidden md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col bg-[#0c1526] p-4.5 text-white">
        <div className="flex items-center gap-2.5 px-2 pb-1">
          <BrandMark size={24} />
          <Wordmark light />
        </div>
        <div className="px-2 pb-5 text-[9.5px] font-extrabold uppercase tracking-wide text-white/40">Admin</div>
        <div className="min-h-0 flex-1 overflow-y-auto">{navList()}</div>
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

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
