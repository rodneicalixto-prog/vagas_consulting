import { Pagination } from "@/components/Pagination";
import { SubmitButton } from "@/components/form-buttons";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { empresasParaFiltro, filtroConfidencialJobs, obterEscopo } from "@/lib/auth/escopo";
import { convidarDoBanco } from "./actions";

/** Remove caracteres que têm significado na sintaxe de filtro do PostgREST. */
function limparBusca(v: string | undefined): string {
  return (v ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
}

export default async function TalentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cidade?: string; page?: string }>;
}) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const escopo = await obterEscopo(user.id, role);
  const admin = createAdminClient();
  const sp = await searchParams;
  const q = limparBusca(sp.q);
  const cidade = limparBusca(sp.cidade);

  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  // Só campos de resumo: nunca e-mail, telefone, endereço ou currículo.
  let consulta = admin
    .from("profiles")
    .select("id, nome_completo, titulo_profissional, cidade, disponibilidade, modalidades_desejadas", {
      count: "exact",
    })
    .eq("status_validacao", "aprovado")
    .eq("blacklisted", false);
  if (q) consulta = consulta.or(`nome_completo.ilike.%${q}%,titulo_profissional.ilike.%${q}%`);
  if (cidade) consulta = consulta.ilike("cidade", `%${cidade}%`);

  let consultaVagas = admin
    .from("jobs")
    .select("id, titulo, companies(nome_fantasia, razao_social)")
    .eq("status", "publicada")
    .eq("modalidade", "temporaria");
  if (!escopo.todos) {
    consultaVagas = consultaVagas.in("company_id", empresasParaFiltro(escopo)).or(filtroConfidencialJobs(escopo));
  }

  const [{ data: talentos, count }, { data: vagas }] = await Promise.all([
    consulta.order("nome_completo").range(offset, offset + limit - 1),
    consultaVagas.order("titulo"),
  ]);

  const totalPages = Math.ceil((count || 0) / limit);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Banco de talentos</h1>
        <p className="mt-1 text-xs text-text-2">
          Candidatos aprovados, em resumo. O contato completo só aparece depois que o candidato se candidata a uma vaga
          da sua carteira.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <form className="mb-4 grid gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Nome ou cargo"
            className="rounded-lg border border-border px-3 py-2 text-[13px]"
          />
          <input
            name="cidade"
            defaultValue={cidade}
            placeholder="Cidade"
            className="rounded-lg border border-border px-3 py-2 text-[13px]"
          />
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white">
            Filtrar
          </button>
        </form>

        {(vagas ?? []).length === 0 && (
          <p className="mb-4 rounded-xl bg-navy-bg px-4 py-3 text-xs text-text-2">
            Não há vaga temporária publicada na sua carteira para convidar. Publique uma vaga (ou peça a um admin) para
            liberar o botão Convidar.
          </p>
        )}

        <p className="mb-3 text-xs text-text-2">
          Total: {count ?? 0} | Página {page} de {totalPages || 1}
        </p>

        <div className="flex flex-col gap-3">
          {(talentos ?? []).length === 0 && (
            <div className="rounded-2xl border border-border bg-surface px-5 py-6 text-xs text-text-2">
              Nenhum candidato aprovado com esses filtros.
            </div>
          )}
          {(talentos ?? []).map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[14px] font-extrabold text-text">{t.nome_completo}</h3>
                <span className="text-[11px] text-text-2">{t.cidade ?? "Cidade não informada"}</span>
              </div>
              <p className="mt-0.5 text-[12px] font-bold text-gold-3">{t.titulo_profissional ?? "Sem título"}</p>
              <p className="mt-1 text-[11.5px] text-text-2">
                Disponibilidade: {t.disponibilidade ?? "—"} · Modalidades:{" "}
                {(t.modalidades_desejadas ?? []).join(", ") || "—"}
              </p>

              {(vagas ?? []).length > 0 && (
                <form action={convidarDoBanco} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="candidate_id" value={t.id} />
                  <input type="hidden" name="validade_horas" value="24" />
                  <select
                    name="job_id"
                    required
                    className="rounded-lg border border-border px-3 py-2 text-[12px]"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Convidar para a vaga…
                    </option>
                    {(vagas ?? []).map((v) => {
                      const c = Array.isArray(v.companies) ? v.companies[0] : v.companies;
                      return (
                        <option key={v.id} value={v.id}>
                          {v.titulo} — {c?.nome_fantasia ?? c?.razao_social ?? ""}
                        </option>
                      );
                    })}
                  </select>
                  <SubmitButton
                    pendingLabel="Convidando..."
                    className="rounded-lg bg-navy px-3 py-2 text-[12px] font-bold text-white"
                  >
                    Convidar
                  </SubmitButton>
                </form>
              )}
            </div>
          ))}
        </div>

        <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/talentos" />
      </div>
    </div>
  );
}
