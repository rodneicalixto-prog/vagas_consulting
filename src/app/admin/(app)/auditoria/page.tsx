import { Pagination } from "@/components/Pagination";
import { requireInternalUser } from "@/lib/auth/internal";
import { getAuditLogs } from "@/lib/security/audit";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  await requireInternalUser("audit.read");

  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const { logs, total, pages } = await getAuditLogs({ page, limit: 50 });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Auditoria</h1>
        <p className="mt-1 text-xs text-text-2">Quem alterou o quê, quando — e exportação</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-text-2">
            Total: {total} registros | Página {page} de {pages}
          </p>
        </div>

        {!logs || logs.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhum registro ainda.</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="grid grid-cols-5 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
                <div>Quando</div>
                <div>Ator</div>
                <div>Ação</div>
                <div>Objeto</div>
                <div>Detalhes</div>
              </div>
              {logs.map((log: any) => (
                <div key={log.id} className="grid grid-cols-5 gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none">
                  <div className="text-text-2">{new Date(log.criado_em).toLocaleString("pt-BR")}</div>
                  <div className="text-text-2">{log.ator_id ? `#${log.ator_id.slice(0, 8)}` : "Sistema"}</div>
                  <div className="font-bold text-navy">{log.acao}</div>
                  <div className="text-text-2">
                    {log.objeto_tipo} {log.objeto_id ? `#${log.objeto_id.slice(0, 8)}` : ""}
                  </div>
                  <div className="text-text-2 truncate">
                    {log.detalhes ? JSON.stringify(log.detalhes).slice(0, 30) : "—"}
                  </div>
                </div>
              ))}
            </div>

            <Pagination currentPage={page} totalPages={pages} baseUrl="/admin/auditoria" />
          </>
        )}
      </div>
    </div>
  );
}
