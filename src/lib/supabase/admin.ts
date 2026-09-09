import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente com a service role key — ignora RLS. Só pode ser importado em
 * código server-only (route handlers, server actions), nunca em código
 * que chega ao bundle do browser (o import "server-only" garante isso em
 * build). Uso restrito às rotas do painel admin, e sempre depois de
 * confirmar (com o cliente normal, respeitando RLS) que o usuário
 * logado está em `admin_users`.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
