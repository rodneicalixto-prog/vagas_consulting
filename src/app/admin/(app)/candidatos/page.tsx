import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { validarCandidato } from "./actions";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/data-table";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-gold-bg text-gold-3" },
  aprovado: { label: "Aprovado", className: "bg-success-bg text-success" },
  reprovado: { label: "Reprovado", className: "bg-danger-bg text-danger" },
};

type CandidatoRow = {
  id: string;
  nome_completo: string;
  email: string;
  cidade: string | null;
  modalidades_desejadas: string[] | null;
  status_validacao: string;
  blacklisted: boolean;
};

export default async function CandidatosPage() {
  await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();

  const [{ data: profiles }, { data: usersPage }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, nome_completo, cidade, titulo_profissional, modalidades_desejadas, status_validacao, blacklisted, created_at")
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email]) ?? []);
  const candidatos: CandidatoRow[] = (profiles ?? []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? "—",
  }));

  const columns: DataTableColumn[] = [
    { key: "nome", label: "Candidato", sortable: true },
    { key: "cidade", label: "Cidade", sortable: true },
    { key: "modalidades", label: "Modalidades" },
    { key: "status", label: "Status", sortable: true },
    { key: "acao", label: "Ação" },
  ];

  const rows: DataTableRow[] = candidatos.map((row) => {
    const s = STATUS_LABEL[row.status_validacao] ?? STATUS_LABEL.pendente;
    return {
      id: row.id,
      sortValues: { nome: row.nome_completo, cidade: row.cidade ?? "", status: row.status_validacao },
      cells: {
        nome: (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-bold text-text">{row.nome_completo}</span>
              {row.blacklisted && (
                <span className="shrink-0 rounded bg-danger px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                  BLACK LIST
                </span>
              )}
            </div>
            <div className="truncate text-[11px] text-text-2">{row.email}</div>
          </div>
        ),
        cidade: <span className="text-text-2">{row.cidade ?? "—"}</span>,
        modalidades: (
          <span className="text-text-2">{(row.modalidades_desejadas ?? []).join(", ") || "—"}</span>
        ),
        status: (
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${s.className}`}>{s.label}</span>
        ),
        acao: (
          <div className="flex gap-1.5">
            <Link
              href={`/admin/candidatos/${row.id}`}
              className="rounded bg-navy-bg px-2.5 py-1.5 text-[10.5px] font-extrabold text-navy"
            >
              Visualizar
            </Link>
            <form action={validarCandidato}>
              <input type="hidden" name="candidate_id" value={row.id} />
              <input type="hidden" name="acao" value="aprovar" />
              <button
                type="submit"
                disabled={row.status_validacao === "aprovado"}
                className="rounded bg-success px-2.5 py-1.5 text-[10.5px] font-extrabold text-white disabled:opacity-40"
              >
                Aprovar
              </button>
            </form>
            <form action={validarCandidato}>
              <input type="hidden" name="candidate_id" value={row.id} />
              <input type="hidden" name="acao" value="reprovar" />
              <button
                type="submit"
                disabled={row.status_validacao === "reprovado"}
                className="rounded bg-danger px-2.5 py-1.5 text-[10.5px] font-extrabold text-white disabled:opacity-40"
              >
                Reprovar
              </button>
            </form>
          </div>
        ),
      },
    };
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Candidatos</h1>
        <p className="mt-1 text-xs text-text-2">
          Banco de candidatos da plataforma — busque, acompanhe e valide (aprovado/reprovado)
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        {candidatos.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhum candidato cadastrado.</p>
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}
      </div>
    </div>
  );
}
