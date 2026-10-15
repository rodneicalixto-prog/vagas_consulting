import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { obterEscopo } from "@/lib/auth/escopo";
import { estadoDaInstancia } from "@/lib/linhas-servidor";
import { podeCriarLinha } from "@/lib/linhas";
import { FormLimite, FormNovaLinha } from "./form-nova-linha";
import { FormEditarLinha, PainelConexao, type OpcaoOperador } from "./painel-linha";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LinhasPage({ searchParams }: { searchParams: Promise<{ empresa?: string }> }) {
  const { user, role } = await requireInternalUser();
  if (role !== "superadmin" && role !== "admin_empresa") redirect("/admin/acesso-negado");
  const { empresa } = await searchParams;
  const escopo = await obterEscopo(user.id, role);
  const admin = createAdminClient();

  const consulta = admin
    .from("companies")
    .select("id, nome_fantasia, razao_social, max_linhas_whatsapp")
    .order("razao_social")
    .limit(300);
  const { data: lista } = escopo.todos
    ? await consulta
    : await consulta.in("id", escopo.empresas.length > 0 ? escopo.empresas : ["00000000-0000-0000-0000-000000000000"]);
  const empresas = lista ?? [];
  const atual = empresas.find((e) => e.id === empresa && UUID.test(e.id)) ?? empresas[0];
  if (!atual) {
    return <div className="px-4 md:px-9 py-8 text-sm text-text-2">Nenhuma empresa na sua carteira.</div>;
  }

  const [{ data: linhas }, { data: vinculos }] = await Promise.all([
    admin
      .from("whatsapp_lines")
      .select("id, instance, apelido, operador_id, agente, padrao, ativa")
      .eq("company_id", atual.id)
      .order("created_at", { ascending: true }),
    admin.from("company_assignments").select("user_id, papel").eq("company_id", atual.id).eq("ativo", true),
  ]);
  const ids = [...new Set((vinculos ?? []).map((v) => v.user_id))];
  const { data: nomes } = ids.length
    ? await admin.from("admin_users").select("user_id, nome_exibicao").in("user_id", ids)
    : { data: [] as { user_id: string; nome_exibicao: string | null }[] };
  const nomeDe = new Map((nomes ?? []).map((n) => [n.user_id, n.nome_exibicao || "Operador"]));
  const operadores: OpcaoOperador[] = ids.map((id) => ({ id, nome: nomeDe.get(id) ?? "Operador" }));

  const itens = linhas ?? [];
  const ativas = itens.filter((l) => l.ativa).length;
  const limite = podeCriarLinha({ role, ativas, max: atual.max_linhas_whatsapp ?? 1 });
  const estados = await Promise.all(itens.map((l) => (l.ativa ? estadoDaInstancia(l.instance) : Promise.resolve(null))));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Números de WhatsApp</h1>
        <p className="mt-1 text-xs text-text-2">
          {atual.nome_fantasia || atual.razao_social}: {ativas} de {atual.max_linhas_whatsapp ?? 1} número(s) em uso.
          Compartilhado (fila da empresa) ou dedicado a um operador.
        </p>
        {escopo.todos && empresas.length > 1 && (
          <form method="get" className="mt-3 flex items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold text-text-2">Empresa</span>
              <select name="empresa" defaultValue={atual.id} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</option>)}
              </select>
            </label>
            <button type="submit" className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">Ver</button>
          </form>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        {itens.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-5 text-[12.5px] text-text-2">
            Esta empresa ainda não tem número. Crie o primeiro abaixo.
          </p>
        )}

        {itens.map((l, i) => (
          <section key={l.id} className="grid gap-4 rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-text">
                {l.apelido}
                {l.padrao && <span className="ml-2 rounded bg-navy-bg px-2 py-0.5 text-[10.5px] font-bold text-navy">Padrão</span>}
                {!l.ativa && <span className="ml-2 rounded bg-black/5 px-2 py-0.5 text-[10.5px] font-bold text-text-3">Desativada</span>}
              </h2>
              <span className="text-[11.5px] text-text-3">
                {l.operador_id ? `Dedicado a ${nomeDe.get(l.operador_id) ?? "operador"}` : "Compartilhado"}
              </span>
            </div>
            {l.ativa ? (
              <PainelConexao lineId={l.id} estadoInicial={estados[i]?.estado ?? "desconhecido"} numeroInicial={estados[i]?.numero ?? null} />
            ) : (
              <p className="text-[12.5px] text-text-2">Número desativado: não recebe nem envia.</p>
            )}
            <details className="rounded-xl border border-border bg-bg">
              <summary className="cursor-pointer list-none px-4 py-2 text-[12.5px] font-bold text-navy">Editar número</summary>
              <div className="border-t border-border p-4">
                <FormEditarLinha
                  lineId={l.id}
                  apelido={l.apelido}
                  operadorId={l.operador_id}
                  agente={l.agente}
                  ativa={l.ativa}
                  operadores={operadores}
                />
              </div>
            </details>
          </section>
        ))}

        <FormNovaLinha companyId={atual.id} operadores={operadores} podeCriar={limite.ok} motivo={limite.motivo} />
        {role === "superadmin" && <FormLimite companyId={atual.id} max={atual.max_linhas_whatsapp ?? 1} />}
      </div>
    </div>
  );
}
