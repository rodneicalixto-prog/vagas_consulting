import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { COOKIE_ORIGEM, DIAS_COOKIE_ORIGEM, codificarOrigem, origemDoLink } from "@/lib/origem";

const PUBLIC_PATHS = [
  "/login",
  "/termos",
  "/onboarding",
  "/admin/login",
  "/admin/acesso-negado",
  "/admin/definir-senha",
  "/api/webhooks",
  // Cron da Vercel: chega sem sessão, com `Authorization: Bearer <CRON_SECRET>`. Cada rota confere o segredo
  // e fecha (401) se ele não existir; sem esta linha o proxy desviava a chamada para o login.
  "/api/cron",
  "/h/",
];

// Vitrine pública: /vagas e /vagas/<id> (nunca /vagas/<id>/candidatura).
const VAGA_PUBLICA = /^\/vagas(\/[^/]+)?\/?$/;

export async function updateSession(request: NextRequest) {
  // O layout do candidato precisa saber a rota para liberar o "modo visitante".
  const comPath = () => {
    const h = new Headers(request.headers);
    h.set("x-pathname", request.nextUrl.pathname);
    return h;
  };
  let supabaseResponse = NextResponse.next({ request: { headers: comPath() } });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: comPath() } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isPublic =
    pathname === "/" || VAGA_PUBLICA.test(pathname) || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = isAdmin ? "/admin/login" : "/login";
    // Candidato volta para onde estava (ex.: a vaga) depois de entrar.
    url.search = isAdmin ? "" : `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (user) {
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/inicio";
      return NextResponse.redirect(url);
    }
  }

  // Primeiro toque: guarda por qual canal a pessoa chegou (?o= da divulgação ou ?utm_source=).
  // Só grava se ainda não houver; o cadastro lê este cookie e grava no perfil.
  if (request.method === "GET" && !request.cookies.get(COOKIE_ORIGEM)) {
    const o = origemDoLink(request.nextUrl.searchParams);
    if (o) {
      supabaseResponse.cookies.set(COOKIE_ORIGEM, codificarOrigem(o), {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: 60 * 60 * 24 * DIAS_COOKIE_ORIGEM,
        path: "/",
      });
    }
  }

  return supabaseResponse;
}
