import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { validarCandidato } from "./actions";
import { DataTable, type DataTableColumn } from "@/components/data-table";

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
};

export default async function CandidatosPage() {
  await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();

  const [{ data: profiles }, { data: usersPage }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, nome_completo, cidade, titulo_profissional, modalidades_desejadas, status_validacao, created_at")
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailById = new Map(usersPage?.users.map((u) => [u.id, u.email]) ?? []);
  const candidatos: CandidatoRow[] = (profiles ?? []).map((p) => ({
    ...p,
    email: emailById.get(p.id) ?? "—",
  }));

  const columns: DataTableColumn<CandidatoRow>[] = [
    {
      key: "nome",
      label: "Candidato",
      sortValue: (row) => row.nome_completo,
      render: (row) => (
        <div className="min-w-0">
          <div className="truncate font-bold text-text">{row.nome_completo}</div>
          <div className="truncate text-[11px] text-text-2">{row.email}</div>
        </div>
      ),
    },
    {
      key: "cidade",
      label: "Cidade",
      sortValue: (row) => row.cidade ?? "",
      render: (row) => <span className="text-text-2">{row.cidade ?? "—"}</span>,
    },
    {
      key: "modalidades",
      label: "Modalidades",
      render: (row) => (
        <span className="text-text-2">{(row.modalidades_desejadas ?? []).join(", ") || "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortValue: (row) => row.status_validacao,
      render: (row) => {
        const s = STATUS_LABEL[row.status_validacao] ?? STATUS_LABEL.pendente;
        return (
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${s.className}`}>{s.label}</span>
        );
      },
    },
    {
      key: "acao",
      label: "Ação",
      render: (row) => (
        <div className="flex gap-1.5">
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
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Candidatos</h1>
        <p className="mt-1 text-xs text-text-2">
          Banco de candidatos da plataforma — busque, acompanhe e valide (aprovado/reprovado)
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        {candidatos.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhum candidato cadastrado.</p>
        ) : (
          <DataTable columns={columns} rows={candidatos} rowKey={(row) => row.id} />
        )}
      </div>
    </div>
  );
}
