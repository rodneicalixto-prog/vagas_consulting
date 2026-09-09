import { createAdminClient } from "@/lib/supabase/admin";
import { decidirEmpresa } from "./actions";

export default async function ModeracaoEmpresasPage() {
  const admin = createAdminClient();

  const { data: companies } = await admin
    .from("companies")
    .select("id, razao_social, nome_fantasia, cnpj, endereco, status")
    .in("status", ["em_analise", "ajustes"])
    .order("created_at", { ascending: true });

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Moderação — Empresas</h1>
        <p className="mt-1 text-xs text-text-2">
          Análise cadastral, CNPJ, responsáveis, documentos, risco e histórico
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        {!companies || companies.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Nenhuma empresa na fila.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {companies.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border bg-surface p-5">
                <h3 className="text-[14px] font-extrabold text-text">{c.nome_fantasia ?? c.razao_social}</h3>
                <p className="mt-0.5 text-[11.5px] text-text-2">
                  {c.cnpj ? `CNPJ ${c.cnpj}` : "CNPJ não informado"} · {c.endereco ?? "endereço não informado"}
                </p>

                <form action={decidirEmpresa} className="mt-4 flex flex-col gap-2.5">
                  <input type="hidden" name="company_id" value={c.id} />
                  <textarea
                    name="motivo"
                    placeholder="Motivo (obrigatório para reprovar ou solicitar correção)"
                    rows={2}
                    className="rounded-lg border border-border bg-bg px-3 py-2 text-[12px]"
                  />
                  <div className="flex gap-2.5">
                    <button
                      name="acao"
                      value="corrigir"
                      className="flex-1 rounded-lg border border-border bg-bg py-2.5 text-[12px] font-extrabold text-text-2"
                    >
                      Solicitar correção
                    </button>
                    <button
                      name="acao"
                      value="rejeitar"
                      className="flex-1 rounded-lg bg-danger py-2.5 text-[12px] font-extrabold text-white"
                    >
                      Rejeitar
                    </button>
                    <button
                      name="acao"
                      value="aprovar"
                      className="flex-1 rounded-lg bg-success py-2.5 text-[12px] font-extrabold text-white"
                    >
                      Aprovar
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
