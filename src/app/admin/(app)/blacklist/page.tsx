import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/data-table";
import { alterarBlacklist } from "../candidatos/actions";

export default async function BlacklistPage() {
  await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nome_completo, cidade, blacklist_motivo, blacklist_em")
    .eq("blacklisted", true)
    .order("blacklist_em", { ascending: false });

  const columns: DataTableColumn[] = [
    { key: "nome", label: "Candidato", sortable: true },
    { key: "cidade", label: "Cidade" },
    { key: "motivo", label: "Motivo" },
    { key: "quando", label: "Desde", sortable: true },
    { key: "acao", label: "Ação" },
  ];

  const rows: DataTableRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    sortValues: { nome: p.nome_completo, quando: p.blacklist_em ?? "" },
    cells: {
      nome: (
        <Link href={`/admin/candidatos/${p.id}`} className="font-bold text-navy underline">
          {p.nome_completo}
        </Link>
      ),
      cidade: <span className="text-text-2">{p.cidade ?? "—"}</span>,
      motivo: <span className="text-text-2">{p.blacklist_motivo ?? "—"}</span>,
      quando: (
        <span className="text-text-2">
          {p.blacklist_em ? new Date(p.blacklist_em).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
      acao: (
        <form action={alterarBlacklist}>
          <input type="hidden" name="candidate_id" value={p.id} />
          <input type="hidden" name="acao" value="remover" />
          <button
            type="submit"
            className="rounded bg-success px-2.5 py-1.5 text-[10.5px] font-extrabold text-white"
          >
            Remover da black list
          </button>
        </form>
      ),
    },
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Black list</h1>
        <p className="mt-1 text-xs text-text-2">
          Candidatos que não honraram compromisso — não devem ser convidados pra nenhuma vaga
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        {rows.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Ninguém na black list.</p>
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}
      </div>
    </div>
  );
}
