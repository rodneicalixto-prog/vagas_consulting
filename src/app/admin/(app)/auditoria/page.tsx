import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

export default async function AuditoriaPage() {
  await requireInternalUser("audit.read");
  const admin = createAdminClient();

  const { data: logs } = await admin
    .from("audit_log")
    .select("id, acao, objeto_tipo, objeto_id, ator_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Auditoria</h1>
        <p className="mt-1 text-xs text-text-2">Quem alterou o quê, quando — e exportação</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        {!logs || logs.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhum registro ainda.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="grid grid-cols-4 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
              <div>Quando</div>
              <div>Ator</div>
              <div>Ação</div>
              <div>Objeto</div>
            </div>
            {logs.map((log) => (
              <div key={log.id} className="grid grid-cols-4 gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none">
                <div className="text-text-2">{new Date(log.created_at).toLocaleString("pt-BR")}</div>
                <div className="text-text-2">{log.ator_id ? `#${log.ator_id.slice(0, 8)}` : "Sistema"}</div>
                <div className="font-bold text-navy">{log.acao}</div>
                <div className="text-text-2">
                  {log.objeto_tipo} {log.objeto_id ? `#${log.objeto_id.slice(0, 8)}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
