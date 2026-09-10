import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { DataTable, type DataTableColumn } from "@/components/data-table";

type LeadRow = {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  idade: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

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

  const columns: DataTableColumn<LeadRow>[] = [
    {
      key: "nome",
      label: "Nome",
      sortValue: (row) => row.nome_completo,
      render: (row) => <span className="truncate font-bold text-text">{row.nome_completo}</span>,
    },
    {
      key: "email",
      label: "E-mail",
      sortValue: (row) => row.email,
      render: (row) => <span className="truncate text-text-2">{row.email}</span>,
    },
    {
      key: "telefone",
      label: "Telefone",
      render: (row) => <span className="text-text-2">{row.telefone}</span>,
    },
    {
      key: "idade",
      label: "Idade",
      sortValue: (row) => row.idade ?? 0,
      render: (row) => <span className="text-text-2">{row.idade ?? "—"}</span>,
    },
    {
      key: "localizacao",
      label: "Localização",
      render: (row) => (
        <span className="text-text-2">
          {row.latitude && row.longitude ? `${row.latitude.toFixed(3)}, ${row.longitude.toFixed(3)}` : "—"}
        </span>
      ),
    },
    {
      key: "quando",
      label: "Quando",
      sortValue: (row) => row.created_at,
      render: (row) => (
        <span className="text-text-2">{new Date(row.created_at).toLocaleString("pt-BR")}</span>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Leads (app instalado)</h1>
        <p className="mt-1 text-xs text-text-2">
          Cadastro mínimo obrigatório capturado na instalação do app — {count ?? 0} no total
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        {!leads || leads.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhum lead ainda.</p>
        ) : (
          <DataTable columns={columns} rows={leads} rowKey={(row) => row.id} />
        )}
      </div>
    </div>
  );
}
