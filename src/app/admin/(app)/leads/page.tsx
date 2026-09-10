import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

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

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
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
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="grid grid-cols-6 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
              <div>Nome</div>
              <div>E-mail</div>
              <div>Telefone</div>
              <div>Idade</div>
              <div>Localização</div>
              <div>Quando</div>
            </div>
            {leads.map((l) => (
              <div key={l.id} className="grid grid-cols-6 gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none">
                <div className="truncate font-bold text-text">{l.nome_completo}</div>
                <div className="truncate text-text-2">{l.email}</div>
                <div className="text-text-2">{l.telefone}</div>
                <div className="text-text-2">{l.idade ?? "—"}</div>
                <div className="text-text-2">
                  {l.latitude && l.longitude ? `${l.latitude.toFixed(3)}, ${l.longitude.toFixed(3)}` : "—"}
                </div>
                <div className="text-text-2">{new Date(l.created_at).toLocaleString("pt-BR")}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
