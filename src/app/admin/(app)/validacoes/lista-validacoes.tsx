import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MENSAGEM_NEUTRA,
  PRAZO_HORAS,
  ROTULO_ETAPA,
  ROTULO_STATUS_VALIDACAO,
  continuacaoDaDecisao,
  horasRestantes,
  ordenarFila,
  situacaoPrazo,
  type MotivoReprovacao,
  type SituacaoPrazo,
  type StatusValidacao,
} from "@/lib/validacao-reprovacao";
import { SubmitButton } from "@/components/form-buttons";
import { decidirValidacao } from "./actions";

const SELO_PRAZO: Record<SituacaoPrazo, { texto: (h: number) => string; classe: string }> = {
  no_prazo: { texto: (h) => `${h} h para decidir`, classe: "bg-navy-bg text-navy" },
  vence_em_breve: { texto: (h) => `Vence em ${h} h`, classe: "bg-gold-bg text-gold-3" },
  vencido: { texto: (h) => `Vencido há ${Math.abs(h)} h`, classe: "bg-danger-bg text-danger" },
};

const CONFIANCA: Record<MotivoReprovacao["confianca"], string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

const CAMPO = "w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-navy";

/** Fila de casos que a IA apontou para reprovar e que esperam a decisão de uma pessoa. */
export async function ListaValidacoes({
  jobIds,
  incluirDecididos = false,
  volta,
  mostrarVaga,
}: {
  /** Vagas visíveis para quem consulta (já filtradas por carteira e sigilo). `null` = todas. */
  jobIds: string[] | null;
  incluirDecididos?: boolean;
  volta: string;
  mostrarVaga: boolean;
}) {
  const admin = createAdminClient();
  let q = admin
    .from("validacoes_reprovacao")
    .select("id, job_id, application_id, candidate_id, etapa, status, motivo, prazo_em, observacao, decidido_em, created_at")
    .order("prazo_em", { ascending: true })
    .limit(300);
  if (jobIds) q = q.in("job_id", jobIds.length ? jobIds : ["00000000-0000-0000-0000-000000000000"]);
  q = incluirDecididos ? q : q.in("status", ["aguardando", "aguardando_dados"]);
  const { data } = await q;
  const casos = data ?? [];

  const candIds = [...new Set(casos.map((c) => c.candidate_id))];
  const vagaIds = [...new Set(casos.map((c) => c.job_id))];
  const [{ data: perfis }, { data: vagas }] = await Promise.all([
    candIds.length ? admin.from("profiles").select("id, nome_completo").in("id", candIds) : Promise.resolve({ data: [] as { id: string; nome_completo: string }[] }),
    vagaIds.length ? admin.from("jobs").select("id, titulo").in("id", vagaIds) : Promise.resolve({ data: [] as { id: string; titulo: string }[] }),
  ]);
  const nome = new Map((perfis ?? []).map((p) => [p.id, p.nome_completo]));
  const titulo = new Map((vagas ?? []).map((v) => [v.id, v.titulo]));

  const agora = new Date();
  const tipados = casos.map((c) => ({
    ...c,
    status: c.status as StatusValidacao,
    motivo: c.motivo as unknown as MotivoReprovacao,
  }));
  const ativos = ordenarFila(
    tipados.filter((c) => c.status === "aguardando" || c.status === "aguardando_dados"),
    agora,
  );
  const decididos = tipados.filter((c) => c.status !== "aguardando" && c.status !== "aguardando_dados");

  if (ativos.length === 0 && decididos.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-2">
        <p className="font-bold text-text">Nenhuma reprovação aguardando decisão.</p>
        <p className="mt-1">
          Quando a IA apontar um candidato para reprovar, o caso aparece aqui com o motivo, a evidência e o que poderia mudar o resultado.
          O candidato só recebe resposta depois da sua decisão.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="rounded-xl bg-navy-bg px-4 py-3 text-[12px] text-text-2">
        A IA aponta, você decide. Até a sua decisão o candidato não recebe resposta sobre reprovação; se passar de {PRAZO_HORAS} horas, ele
        recebe só este aviso neutro: &quot;{MENSAGEM_NEUTRA}&quot;
      </p>

      {ativos.map((c) => {
        const m = c.motivo;
        const sit = situacaoPrazo(c.prazo_em, agora);
        const h = horasRestantes(c.prazo_em, agora);
        const selo = SELO_PRAZO[sit];
        return (
          <article key={c.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/admin/candidatos/${c.candidate_id}`} className="text-sm font-extrabold text-text underline">
                  {nome.get(c.candidate_id) ?? "Candidato"}
                </Link>
                <p className="text-[11.5px] text-text-2">
                  {ROTULO_ETAPA[c.etapa as keyof typeof ROTULO_ETAPA] ?? c.etapa}
                  {mostrarVaga && (
                    <>
                      {" · "}
                      <Link href={`/admin/vagas/${c.job_id}`} className="font-bold text-navy underline">
                        {titulo.get(c.job_id) ?? "Vaga"}
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.status === "aguardando_dados" && (
                  <span className="rounded-full bg-gold-bg px-2.5 py-0.5 text-[10.5px] font-extrabold text-gold-3">
                    {ROTULO_STATUS_VALIDACAO.aguardando_dados}
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-extrabold ${selo.classe}`}>{selo.texto(h)}</span>
              </div>
            </div>

            {m.justificativa_incompleta && (
              <p role="alert" className="mt-3 rounded-xl bg-danger-bg px-4 py-2.5 text-[12px] font-bold text-danger">
                A IA não deu evidência suficiente para este caso. Confira o currículo antes de confirmar; na dúvida, reverta ou peça dados.
              </p>
            )}

            <dl className="mt-3 grid gap-3 text-[12.5px] md:grid-cols-2">
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">Critério não atendido</dt>
                <dd className="mt-0.5 font-bold text-text">
                  {m.criterio}{" "}
                  {m.eliminatorio && <span className="rounded bg-danger-bg px-1.5 py-0.5 text-[10px] font-extrabold text-danger">Eliminatório</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">Confiança da IA</dt>
                <dd className="mt-0.5 font-bold text-text">{CONFIANCA[m.confianca]}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">Evidência</dt>
                <dd className="mt-0.5 text-text-2">{m.evidencia ? `“${m.evidencia}”` : "Sem evidência registrada."}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">Análise da IA</dt>
                <dd className="mt-0.5 text-text-2">{m.analise}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">O que poderia mudar o resultado</dt>
                <dd className="mt-0.5 text-text-2">{m.o_que_mudaria}</dd>
              </div>
            </dl>

            <form action={decidirValidacao} className="mt-4 grid gap-2 border-t border-border pt-4">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="volta" value={volta} />
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold text-text-2">
                  Observação (obrigatória para reverter ou pedir dados; opcional para confirmar)
                </span>
                <textarea name="observacao" rows={2} maxLength={1000} className={CAMPO} />
              </label>
              <div className="flex flex-wrap gap-2">
                <SubmitButton name="decisao" value="confirmar" pendingLabel="Salvando..." className="rounded-xl bg-danger px-4 py-2 text-[12.5px] font-bold text-white">
                  Confirmar reprovação
                </SubmitButton>
                <SubmitButton name="decisao" value="reverter" pendingLabel="Salvando..." className="rounded-xl bg-navy px-4 py-2 text-[12.5px] font-bold text-white">
                  Reverter
                </SubmitButton>
                {c.status === "aguardando" && (
                  <SubmitButton name="decisao" value="pedir_dados" pendingLabel="Salvando..." className="rounded-xl border border-border px-4 py-2 text-[12.5px] font-bold text-navy">
                    Pedir mais dados
                  </SubmitButton>
                )}
              </div>
              <p className="text-[11px] text-text-3">
                Confirmar: {continuacaoDaDecisao("confirmar").descricao} Reverter: {continuacaoDaDecisao("reverter").descricao}
              </p>
            </form>
          </article>
        );
      })}

      {incluirDecididos && decididos.length > 0 && (
        <section className="mt-2">
          <h2 className="mb-2 text-sm font-extrabold text-text">Já decididos</h2>
          <ul className="grid gap-2">
            {decididos.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-surface px-4 py-3 text-[12.5px]">
                <b className="text-text">{nome.get(c.candidate_id) ?? "Candidato"}</b> · {ROTULO_STATUS_VALIDACAO[c.status]} ·{" "}
                {c.motivo.criterio}
                {c.status === "confirmada" && (
                  <>
                    {" · "}
                    <Link href={`/admin/vagas/${c.job_id}/devolutivas`} className="font-bold text-navy underline">
                      Preparar devolutiva →
                    </Link>
                  </>
                )}
                {c.observacao && <span className="block text-text-2">Observação: {c.observacao}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
