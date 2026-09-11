import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_CLASS: Record<string, string> = {
  agendado: "bg-navy-bg text-navy",
  concluido: "bg-success-bg text-success",
  cancelado: "bg-danger-bg text-danger",
};

function dataDeCorte(diasAtras: number): string {
  return new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000).toISOString();
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AgendaEquipePage() {
  const { role } = await requireInternalUser("pipeline.manage");
  if (role !== "superadmin") redirect("/admin/agenda");

  const admin = createAdminClient();

  const seteDiasAtras = dataDeCorte(7);

  const [{ data: compromissos }, { data: equipe }] = await Promise.all([
    admin
      .from("compromissos")
      .select("id, titulo, tipo, descricao, inicio, fim, status, responsavel_id")
      .gte("inicio", seteDiasAtras)
      .order("inicio", { ascending: true }),
    admin.from("admin_users").select("user_id, nome_exibicao, perfil").order("nome_exibicao"),
  ]);

  const nomePorResponsavel = new Map(
    (equipe ?? []).map((a) => [a.user_id, a.nome_exibicao ?? `Admin #${a.user_id.slice(0, 8)}`]),
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-text">Agenda da equipe</h1>
          <Link href="/admin/agenda" className="text-[11.5px] font-bold text-text-3 hover:text-text-2">
            ← Minha agenda
          </Link>
        </div>
        <p className="mt-1 text-xs text-text-2">
          Todos os compromissos de todos os operadores/administradores — últimos 7 dias em diante
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        {!compromissos || compromissos.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhum compromisso no período.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="grid grid-cols-5 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
              <div>Quando</div>
              <div>Responsável</div>
              <div>Título</div>
              <div>Tipo</div>
              <div>Status</div>
            </div>
            {compromissos.map((c) => (
              <div key={c.id} className="grid grid-cols-5 gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none">
                <div className="text-text-2">{formatarDataHora(c.inicio)}</div>
                <div className="font-bold text-text">
                  {nomePorResponsavel.get(c.responsavel_id) ?? "—"}
                </div>
                <div className="text-text">{c.titulo}</div>
                <div>
                  <span className="rounded-md bg-navy-bg px-2 py-1 text-[9.5px] font-extrabold uppercase text-navy">
                    {c.tipo === "entrevista" ? "Entrevista" : "Interno"}
                  </span>
                </div>
                <div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${STATUS_CLASS[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
