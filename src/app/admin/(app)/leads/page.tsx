import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/data-table";

export default async function LeadsPage() {
  await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();

  const { data: leads, count } = await admin
    .from("leads")
    .select("id, nome_completo, email, telefone, idade, latitude, longitude, origem, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(200);

  const columns: DataTableColumn[] = [
    { key: "nome", label: "Nome", sortable: true },
    { key: "email", label: "E-mail", sortable: true },
    { key: "telefone", label: "Telefone" },
    { key: "idade", label: "Idade", sortable: true },
    { key: "localizacao", label: "Localização" },
    { key: "quando", label: "Quando", sortable: true },
  ];

  const rows: DataTableRow[] = (leads ?? []).map((row) => ({
    id: row.id,
    sortValues: {
      nome: row.nome_completo,
      email: row.email,
      idade: row.idade ?? 0,
      quando: row.created_at,
    },
    cells: {
      nome: <span className="truncate font-bold text-text">{row.nome_completo}</span>,
      email: <span className="truncate text-text-2">{row.email}</span>,
      telefone: <span className="text-text-2">{row.telefone}</span>,
      idade: <span className="text-text-2">{row.idade ?? "—"}</span>,
      localizacao: (
        <span className="text-text-2">
          {row.latitude && row.longitude ? `${row.latitude.toFixed(3)}, ${row.longitude.toFixed(3)}` : "—"}
        </span>
      ),
      quando: <span className="text-text-2">{new Date(row.created_at).toLocaleString("pt-BR")}</span>,
    },
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Leads (app instalado)</h1>
        <p className="mt-1 text-xs text-text-2">
          Cadastro mínimo obrigatório capturado na instalação do app — {count ?? 0} no total
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        {!leads || leads.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhum lead ainda.</p>
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}
      </div>
    </div>
  );
}
