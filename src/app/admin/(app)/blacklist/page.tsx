import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, requireInternalUser } from "@/lib/auth/internal";
import { candidatosVisiveis, obterEscopo } from "@/lib/auth/escopo";
import { SubmitButton } from "@/components/form-buttons";
import { formatarTelefoneBR } from "@/lib/whatsapp";
import { alterarBlacklist } from "../candidatos/actions";
import { bloquearNaEmpresa, liberarNaEmpresa } from "./actions";

export default async function BlacklistPage() {
  const { user, role } = await requireInternalUser();

  if (can(role, "platform.data")) return <BlacklistGlobal />;
  if (can(role, "blacklist.empresa")) return <BlacklistDaEmpresa userId={user.id} role={role} />;
  redirect("/admin/acesso-negado");
}

/** Plataforma: black list global (vale para todas as empresas). */
async function BlacklistGlobal() {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nome_completo, cidade, blacklist_motivo, blacklist_em")
    .eq("blacklisted", true)
    .order("blacklist_em", { ascending: false });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Black list</h1>
        <p className="mt-1 text-xs text-text-2">
          Global da plataforma: candidatos que não devem ser convidados para nenhuma vaga ·{" "}
          {(profiles ?? []).length} pessoa{(profiles ?? []).length === 1 ? "" : "s"}. Cada empresa também tem a
          própria black list, cadastrada pelo administrador dela.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-5">
        {(profiles ?? []).length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-2">Ninguém na black list.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {(profiles ?? []).map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-5 py-3 text-[12px] last:border-b-0"
              >
                <Link
                  href={`/admin/candidatos/${p.id}`}
                  className="min-w-0 flex-1 basis-44 truncate font-bold text-navy underline"
                >
                  {p.nome_completo}
                </Link>
                <span className="hidden w-28 truncate text-text-2 md:block">{p.cidade ?? "—"}</span>
                <span className="min-w-0 flex-1 basis-56 truncate text-text-2">{p.blacklist_motivo ?? "—"}</span>
                <span className="w-24 text-right text-[11px] text-text-3">
                  {p.blacklist_em ? new Date(p.blacklist_em).toLocaleDateString("pt-BR") : "—"}
                </span>
                <form action={alterarBlacklist}>
                  <input type="hidden" name="candidate_id" value={p.id} />
                  <input type="hidden" name="acao" value="remover" />
                  <button
                    type="submit"
                    className="rounded bg-success px-2.5 py-1.5 text-[10.5px] font-extrabold text-white"
                  >
                    Remover
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Admin da empresa: black list só da empresa dele. */
async function BlacklistDaEmpresa({ userId, role }: { userId: string; role: Parameters<typeof obterEscopo>[1] }) {
  const admin = createAdminClient();

  const { data: atrib } = await admin
    .from("company_assignments")
    .select("company_id, companies(nome_fantasia, razao_social)")
    .eq("user_id", userId)
    .eq("papel", "admin_empresa")
    .eq("ativo", true)
    .limit(1);
  const companyId = atrib?.[0]?.company_id as string | undefined;
  if (!companyId) redirect("/admin/acesso-negado");
  const emp = atrib?.[0]?.companies;
  const empresa = Array.isArray(emp) ? emp[0] : emp;
  const nomeEmpresa = empresa?.nome_fantasia ?? empresa?.razao_social ?? "sua empresa";

  const { data: bloqueios } = await admin
    .from("company_blacklist")
    .select("id, candidate_id, nome_informado, telefone_normalizado, motivo, created_at")
    .eq("company_id", companyId)
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  // Nomes dos já cadastrados e lista para escolher quem bloquear.
  const escopo = await obterEscopo(userId, role);
  const visiveis = (await candidatosVisiveis(escopo)) ?? [];
  const idsNomes = [...new Set([...visiveis, ...(bloqueios ?? []).map((b) => b.candidate_id).filter((v): v is string => !!v)])];
  const { data: perfis } = idsNomes.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", idsNomes.slice(0, 400))
    : { data: [] as { id: string; nome_completo: string }[] };
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));
  const jaBloqueados = new Set((bloqueios ?? []).map((b) => b.candidate_id).filter(Boolean));
  const opcoes = (perfis ?? [])
    .filter((p) => visiveis.includes(p.id) && !jaBloqueados.has(p.id))
    .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, "pt-BR"));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Black list da empresa</h1>
        <p className="mt-1 text-xs text-text-2">
          Só vale para <b>{nomeEmpresa}</b>: a pessoa não consegue se candidatar às vagas dela nem receber convite.
          Outras empresas não veem esta lista. {(bloqueios ?? []).length} cadastrad
          {(bloqueios ?? []).length === 1 ? "a" : "as"}.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-5">
        <details className="group mb-5 rounded-2xl border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[13px] font-extrabold text-navy">
            <span>+ Cadastrar candidato problemático</span>
            <span className="text-[11px] transition-transform group-open:rotate-90">▸</span>
          </summary>
          <form action={bloquearNaEmpresa} className="grid gap-3 border-t border-border p-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[10.5px] font-bold text-text-2">Candidato da sua empresa</span>
              <select
                name="candidate_id"
                defaultValue=""
                className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm"
              >
                <option value="">— escolher na lista (ou informar o telefone abaixo) —</option>
                {opcoes.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome_completo}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold text-text-2">Nome (se não estiver na lista)</span>
              <input name="nome" className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold text-text-2">
                Telefone — vale mesmo antes de a pessoa se cadastrar
              </span>
              <input
                name="telefone"
                placeholder="(11) 90000-0000"
                className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[10.5px] font-bold text-text-2">
                Motivo (obrigatório — ex.: faltou sem avisar, abandonou o posto)
              </span>
              <input
                name="motivo"
                required
                minLength={3}
                maxLength={500}
                className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm"
              />
            </label>
            <SubmitButton
              pendingLabel="Cadastrando..."
              className="rounded-lg bg-danger px-4 py-2.5 text-sm font-extrabold text-white md:col-span-2"
            >
              Colocar na black list da empresa
            </SubmitButton>
          </form>
        </details>

        {(bloqueios ?? []).length === 0 ? (
          <p className="mt-8 text-center text-sm text-text-2">Ninguém na black list da empresa.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {(bloqueios ?? []).map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-5 py-3 text-[12px] last:border-b-0"
              >
                <span className="min-w-0 flex-1 basis-44 truncate font-bold text-text">
                  {b.candidate_id ? (
                    <Link href={`/admin/candidatos/${b.candidate_id}`} className="text-navy underline">
                      {nome.get(b.candidate_id) ?? "Candidato"}
                    </Link>
                  ) : (
                    (b.nome_informado ?? "Pessoa não cadastrada")
                  )}
                </span>
                <span className="hidden w-36 truncate text-text-2 md:block">
                  {b.telefone_normalizado ? formatarTelefoneBR(b.telefone_normalizado) : "—"}
                </span>
                <span className="min-w-0 flex-1 basis-56 truncate text-text-2">{b.motivo}</span>
                <span className="w-24 text-right text-[11px] text-text-3">
                  {new Date(b.created_at).toLocaleDateString("pt-BR")}
                </span>
                <form action={liberarNaEmpresa}>
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton
                    pendingLabel="..."
                    className="rounded border border-border bg-bg px-2.5 py-1.5 text-[10.5px] font-extrabold text-text-2"
                  >
                    Liberar
                  </SubmitButton>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
