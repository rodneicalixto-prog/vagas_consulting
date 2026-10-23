import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import {
  candidatosVisiveis,
  empresasParaFiltro,
  filtroConfidencialJobs,
  obterEscopo,
  vagasVisiveis,
} from "@/lib/auth/escopo";
import { SubmitButton } from "@/components/form-buttons";
import { CONVITES_CANCELAVEIS, conviteExpirado, conviteLabel, formatPrazo } from "@/lib/convites";
import { criarConviteFormulario, decidirConvite } from "./actions";

export default async function ConvitesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; erro?: string }>;
}) {
  const { aviso, erro } = await searchParams;
  const { user, role } = await requireInternalUser("pipeline.manage");
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);
  const vagasIds = await vagasVisiveis(escopo);
  const candidatosIds = await candidatosVisiveis(escopo);

  let consultaConvites = admin
    .from("invites")
    .select("id, status, validade, motivo, resposta_em, created_at, candidate_id, jobs(titulo)");
  let consultaCandidatos = admin.from("profiles").select("id, nome_completo").eq("blacklisted", false);
  let consultaVagas = admin
    .from("jobs")
    .select("id, titulo, companies(nome_fantasia, razao_social)")
    .eq("status", "publicada");
  // Carteira: operador só vê convites/vagas da carteira; o seletor lista
  // candidatos aprovados (banco de talentos, sem contato).
  if (vagasIds) consultaConvites = consultaConvites.in("job_id", vagasIds);
  if (candidatosIds) consultaCandidatos = consultaCandidatos.eq("status_validacao", "aprovado");
  if (!escopo.todos) {
    consultaVagas = consultaVagas
      .in("company_id", empresasParaFiltro(escopo))
      .or(filtroConfidencialJobs(escopo));
  }

  const [{ data: convites }, { data: candidatos }, { data: vagas }] = await Promise.all([
    consultaConvites.order("created_at", { ascending: false }).limit(50),
    consultaCandidatos.order("nome_completo").limit(500),
    consultaVagas.order("titulo"),
  ]);

  // Nomes dos candidatos dos convites listados (independe do limite do seletor).
  const idsConvites = [...new Set((convites ?? []).map((c) => c.candidate_id))];
  const { data: nomes } = idsConvites.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", idsConvites)
    : { data: [] as { id: string; nome_completo: string }[] };
  const nomePorId = new Map((nomes ?? []).map((c) => [c.id, c.nome_completo]));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-7 md:px-9">
        <h1 className="text-xl font-extrabold text-text">Convites</h1>
        <p className="mt-1 text-xs text-text-2">
          Convite direto para vagas publicadas (temporária, PJ ou efetiva). O candidato responde pelo app; a equipe confirma.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-9">
        {aviso === "enviado" && (
          <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-[12.5px] font-bold text-success">
            Convite enviado com sucesso. Ele aparece na lista abaixo e a mensagem já está em Mensagens do candidato.
          </p>
        )}
        {erro && (
          <p className="mb-4 rounded-xl bg-danger-bg px-4 py-3 text-[12.5px] font-bold text-danger">
            Não foi possível enviar o convite: {erro}
          </p>
        )}
        {aviso === "ja-convidado" && (
          <p className="mb-4 rounded-xl bg-navy-bg px-4 py-3 text-[12.5px] font-bold text-navy">
            Este candidato já tem um convite ativo para esta vaga. Ele aparece na lista abaixo.
          </p>
        )}
        <form action={criarConviteFormulario} className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-[12px] font-extrabold text-text-2">
            Candidato
            <select name="candidate_id" required className="rounded-lg border border-border px-3 py-2 text-[13px] font-normal">
              <option value="">Selecione…</option>
              {(candidatos ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_completo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-extrabold text-text-2">
            Vaga publicada
            <select name="job_id" required className="rounded-lg border border-border px-3 py-2 text-[13px] font-normal">
              <option value="">Selecione…</option>
              {(vagas ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.titulo} — {v.companies?.nome_fantasia ?? v.companies?.razao_social}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-extrabold text-text-2">
            Prazo para responder (horas)
            <input
              name="validade_horas"
              type="number"
              min={1}
              max={168}
              defaultValue={72}
              className="rounded-lg border border-border px-3 py-2 text-[13px] font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-extrabold text-text-2 md:col-span-4">
            Mensagem para o candidato (opcional)
            <textarea
              name="mensagem"
              maxLength={1000}
              rows={3}
              placeholder="Ex.: Temos uma vaga temporária para carga de caminhão de segunda a sábado. Confirme se tem disponibilidade."
              className="rounded-lg border border-border px-3 py-2 text-[13px] font-normal"
            />
          </label>
          <div className="flex items-end">
            <SubmitButton
              type="submit"
              pendingLabel="Enviando…"
              className="w-full rounded-lg bg-gold px-4 py-2.5 text-[12px] font-extrabold text-[#1c1508]"
            >
              Enviar convite
            </SubmitButton>
          </div>
        </form>

        {(vagas ?? []).length === 0 && (
          <p className="mb-4 text-xs text-text-2">
            Nenhuma vaga publicada. Publique uma em Cadastro de vagas para poder convidar.
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-border text-text-2">
              <tr>
                <th className="px-4 py-3">Candidato</th>
                <th className="px-4 py-3">Vaga</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Prazo</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(convites ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-text-2">
                    Nenhum convite enviado ainda.
                  </td>
                </tr>
              )}
              {(convites ?? []).map((c) => {
                const expirado = conviteExpirado(c);
                return (
                  <tr key={c.id} className="border-b border-border last:border-none">
                    <td className="px-4 py-3">{nomePorId.get(c.candidate_id) ?? "—"}</td>
                    <td className="px-4 py-3">{c.jobs?.titulo}</td>
                    <td className="px-4 py-3">
                      {expirado ? "Expirado" : conviteLabel[c.status]}
                      {c.status === "recusado" && c.motivo ? ` — ${c.motivo}` : ""}
                    </td>
                    <td className="px-4 py-3">{formatPrazo(c.validade)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {c.status === "aceito" && (
                          <form action={decidirConvite}>
                            <input type="hidden" name="invite_id" value={c.id} />
                            <input type="hidden" name="acao" value="confirmar" />
                            <SubmitButton
                              type="submit"
                              pendingLabel="…"
                              className="rounded-lg bg-success-bg px-3 py-1.5 text-[11px] font-extrabold text-success"
                            >
                              Confirmar
                            </SubmitButton>
                          </form>
                        )}
                        {CONVITES_CANCELAVEIS.includes(c.status) && (
                          <form action={decidirConvite}>
                            <input type="hidden" name="invite_id" value={c.id} />
                            <input type="hidden" name="acao" value="cancelar" />
                            <SubmitButton
                              type="submit"
                              pendingLabel="…"
                              className="rounded-lg bg-danger-bg px-3 py-1.5 text-[11px] font-extrabold text-danger"
                            >
                              Cancelar
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
