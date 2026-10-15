import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { empresaDaOperacao } from "@/lib/evolution";
import { SubmitButton } from "@/components/form-buttons";
import { ROTULO_TIPO, TIPOS_NOTA, type TipoNota } from "@/lib/agente";
import { criarAgente, mudarStatusNota, salvarAgente, salvarNota } from "./actions";

const STATUS_CLASSE: Record<string, string> = {
  rascunho: "bg-gold-bg text-gold-3",
  aprovada: "bg-success-bg text-success",
  arquivada: "bg-black/5 text-text-3",
};

const STATUS_ROTULO: Record<string, string> = {
  rascunho: "Rascunho",
  aprovada: "Aprovada",
  arquivada: "Arquivada",
};

const CAMPO =
  "rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-navy w-full";

export default async function AgentePage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { role } = await requireInternalUser();
  if (role !== "superadmin") redirect("/admin/acesso-negado");
  const sp = await searchParams;
  const admin = createAdminClient();

  const operacaoId = await empresaDaOperacao();
  if (!operacaoId) {
    return (
      <div className="px-4 md:px-9 py-8 text-sm text-text-2">
        A empresa da operação ainda não foi definida na plataforma.
      </div>
    );
  }

  const [{ data: empresa }, { data: agente }] = await Promise.all([
    admin.from("companies").select("nome_fantasia, razao_social").eq("id", operacaoId).maybeSingle(),
    admin.from("ai_agents").select("*").eq("company_id", operacaoId).maybeSingle(),
  ]);
  const nomeEmpresa = empresa?.nome_fantasia || empresa?.razao_social || "SOS Vagas";

  // Uso do mês: sugestões por resultado e custo estimado.
  const inicioMes = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const uso = { total: 0, usada: 0, editada: 0, descartada: 0, pendente: 0, paradas: 0, custo: 0, tokens: 0 };
  if (agente) {
    const [{ data: sugs }, { data: runs }] = await Promise.all([
      admin
        .from("ai_suggestions")
        .select("estado, motivo_parada")
        .eq("agent_id", agente.id)
        .gte("created_at", inicioMes)
        .limit(5000),
      admin
        .from("ai_agent_runs")
        .select("custo_usd, tokens_in, tokens_out")
        .eq("agent_id", agente.id)
        .gte("created_at", inicioMes)
        .limit(5000),
    ]);
    for (const s of sugs ?? []) {
      uso.total += 1;
      if (s.motivo_parada) uso.paradas += 1;
      else if (s.estado === "usada") uso.usada += 1;
      else if (s.estado === "editada") uso.editada += 1;
      else if (s.estado === "descartada") uso.descartada += 1;
      else if (s.estado === "pendente") uso.pendente += 1;
    }
    for (const r of runs ?? []) {
      uso.custo += Number(r.custo_usd ?? 0);
      uso.tokens += (r.tokens_in ?? 0) + (r.tokens_out ?? 0);
    }
  }

  const filtro = TIPOS_NOTA.find((t) => t === sp.tipo) ?? null;
  let q = admin
    .from("ai_knowledge_notes")
    .select("id, tipo, titulo, corpo_md, status, versao, origem, updated_at")
    .eq("company_id", operacaoId)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (filtro) q = q.eq("tipo", filtro);
  const { data: notas } = await q;
  const lista = notas ?? [];

  const contagem = new Map<string, number>();
  const { data: todas } = await admin.from("ai_knowledge_notes").select("tipo, status").eq("company_id", operacaoId);
  for (const n of todas ?? []) if (n.status !== "arquivada") contagem.set(n.tipo, (contagem.get(n.tipo) ?? 0) + 1);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Agente de IA</h1>
        <p className="mt-1 text-xs text-text-2">
          {nomeEmpresa} · piloto em <b className="text-text">modo sugestão</b>: o agente propõe, a pessoa decide e envia.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        {/* Agente */}
        {!agente ? (
          <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
            <p className="text-sm text-text-2">Esta empresa ainda não tem agente. Crie o agente do piloto.</p>
            <form action={criarAgente} className="mt-3">
              <SubmitButton pendingLabel="Criando..." className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">
                Criar agente da {nomeEmpresa}
              </SubmitButton>
            </form>
          </div>
        ) : (
          <form
            action={salvarAgente}
            className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-3"
          >
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold text-text-2">Nome do agente</span>
              <input name="nome" defaultValue={agente.nome} required minLength={2} maxLength={60} className={CAMPO} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold text-text-2">Tom</span>
              <select name="tom" defaultValue={agente.tom} className={CAMPO}>
                <option value="formal">Formal</option>
                <option value="proximo">Próximo</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold text-text-2">Provedor</span>
              <select name="provedor" defaultValue={agente.provedor} className={CAMPO}>
                <option value="groq">Groq (padrão)</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Claude</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[10.5px] font-bold text-text-2">Modelo (vazio usa o padrão do provedor)</span>
              <input name="modelo" defaultValue={agente.modelo ?? ""} maxLength={80} className={CAMPO} />
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm font-bold text-text">
              <input type="checkbox" name="ativo" value="sim" defaultChecked={agente.ativo} />
              Agente ligado
            </label>
            <label className="flex flex-col gap-1 md:col-span-3">
              <span className="text-[10.5px] font-bold text-text-2">
                Roteiro: como o agente conduz a conversa, perguntas eliminatórias e o que nunca responde
              </span>
              <textarea name="roteiro" defaultValue={agente.roteiro} rows={7} className={CAMPO} />
            </label>
            <div className="flex flex-wrap items-center gap-3 md:col-span-3">
              <SubmitButton pendingLabel="Salvando..." className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">
                Salvar agente
              </SubmitButton>
              <span className="text-[11.5px] text-text-2">
                Nível de autonomia {agente.nivel_autonomia} (sugestão) · teto de US$ {Number(agente.teto_mensal_usd)}/mês.
                Ligado, ele gera uma sugestão por mensagem de candidato, só com notas aprovadas e a vaga em andamento.
              </span>
            </div>
          </form>
        )}

        {agente && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Sugestões no mês", uso.total],
              ["Usadas sem edição", uso.usada],
              ["Editadas", uso.editada],
              ["Descartadas", uso.descartada],
              ["Paradas (risco, sem fonte, teto)", uso.paradas],
            ].map(([rotulo, valor]) => (
              <div key={String(rotulo)} className="rounded-2xl border border-border bg-surface p-4">
                <div className="text-[10.5px] font-bold uppercase text-text-2">{rotulo}</div>
                <div className="mt-1 text-[22px] font-extrabold text-navy">{valor}</div>
              </div>
            ))}
            <div className="col-span-2 rounded-2xl border border-border bg-surface p-4 md:col-span-5">
              <span className="text-[12px] text-text-2">
                Custo estimado do mês: <b className="text-text">US$ {uso.custo.toFixed(4)}</b> de US${" "}
                {Number(agente.teto_mensal_usd)} · {uso.tokens.toLocaleString("pt-BR")} tokens. Valor aproximado
                (tabela de preços do modelo); o contador oficial é o do provedor.
              </span>
            </div>
          </div>
        )}

        {/* Base de conhecimento */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-text">Base de conhecimento</h2>
            <p className="text-[11.5px] text-text-2">
              Só notas <b>aprovadas</b> entram no contexto do agente e na exportação para o Obsidian.
            </p>
          </div>
          <a
            href="/api/admin/agente/exportar"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-[12.5px] font-bold text-navy"
          >
            Exportar para o Obsidian (.zip)
          </a>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-[12px] font-bold">
          <Link
            href="/admin/agente"
            className={`rounded-full px-3 py-1.5 ${!filtro ? "bg-navy text-white" : "bg-surface text-text-2 border border-border"}`}
          >
            Todas
          </Link>
          {TIPOS_NOTA.map((t) => (
            <Link
              key={t}
              href={`/admin/agente?tipo=${t}`}
              className={`rounded-full px-3 py-1.5 ${filtro === t ? "bg-navy text-white" : "bg-surface text-text-2 border border-border"}`}
            >
              {ROTULO_TIPO[t]} · {contagem.get(t) ?? 0}
            </Link>
          ))}
        </div>

        <details className="mb-4 rounded-2xl border border-border bg-surface">
          <summary className="cursor-pointer list-none px-5 py-3 text-[13px] font-extrabold text-navy">
            + Nova nota
          </summary>
          <form action={salvarNota} className="grid gap-3 border-t border-border p-5 md:grid-cols-3">
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[10.5px] font-bold text-text-2">Título</span>
              <input name="titulo" required minLength={3} maxLength={120} className={CAMPO} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold text-text-2">Tipo</span>
              <select name="tipo" defaultValue={filtro ?? "faq"} className={CAMPO}>
                {TIPOS_NOTA.map((t) => (
                  <option key={t} value={t}>
                    {ROTULO_TIPO[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 md:col-span-3">
              <span className="text-[10.5px] font-bold text-text-2">Texto (Markdown)</span>
              <textarea name="corpo_md" rows={6} maxLength={20000} className={CAMPO} />
            </label>
            <div className="md:col-span-3">
              <SubmitButton pendingLabel="Salvando..." className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">
                Salvar como rascunho
              </SubmitButton>
            </div>
          </form>
        </details>

        {lista.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-5 py-6 text-xs text-text-2">
            Nenhuma nota {filtro ? `do tipo ${ROTULO_TIPO[filtro as TipoNota].toLowerCase()} ` : ""}ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {lista.map((n) => (
              <details key={n.id} className="group border-b border-border last:border-b-0">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-bg">
                  <span className="text-[10px] text-text-3 transition-transform group-open:rotate-90">▸</span>
                  <span className="min-w-0 flex-1 basis-48 text-[13px] font-extrabold text-text">{n.titulo}</span>
                  <span className="rounded bg-navy-bg px-2 py-0.5 text-[10.5px] font-bold text-navy">
                    {ROTULO_TIPO[n.tipo as TipoNota] ?? n.tipo}
                  </span>
                  <span className="text-[10.5px] text-text-3">v{n.versao}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${STATUS_CLASSE[n.status]}`}>
                    {STATUS_ROTULO[n.status] ?? n.status}
                  </span>
                </summary>
                <div className="border-t border-border bg-bg/60 px-5 py-4">
                  <form action={salvarNota} className="grid gap-3 md:grid-cols-3">
                    <input type="hidden" name="id" value={n.id} />
                    <label className="flex flex-col gap-1 md:col-span-2">
                      <span className="text-[10.5px] font-bold text-text-2">Título</span>
                      <input name="titulo" defaultValue={n.titulo} required minLength={3} maxLength={120} className={CAMPO} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10.5px] font-bold text-text-2">Tipo</span>
                      <select name="tipo" defaultValue={n.tipo} className={CAMPO}>
                        {TIPOS_NOTA.map((t) => (
                          <option key={t} value={t}>
                            {ROTULO_TIPO[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 md:col-span-3">
                      <span className="text-[10.5px] font-bold text-text-2">
                        Texto (Markdown) · salvar uma nota aprovada a devolve para rascunho
                      </span>
                      <textarea name="corpo_md" defaultValue={n.corpo_md} rows={7} maxLength={20000} className={CAMPO} />
                    </label>
                    <div className="md:col-span-3">
                      <SubmitButton
                        pendingLabel="Salvando..."
                        className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white"
                      >
                        Salvar alterações
                      </SubmitButton>
                    </div>
                  </form>

                  <div className="mt-3 flex flex-wrap gap-4 text-[11.5px]">
                    {n.status !== "aprovada" && n.status !== "arquivada" && (
                      <form action={mudarStatusNota}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="acao" value="aprovar" />
                        <SubmitButton pendingLabel="..." className="font-bold text-success underline">
                          Aprovar (entra no agente)
                        </SubmitButton>
                      </form>
                    )}
                    {n.status === "aprovada" && (
                      <form action={mudarStatusNota}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="acao" value="reabrir" />
                        <SubmitButton pendingLabel="..." className="font-bold text-navy underline">
                          Voltar para rascunho
                        </SubmitButton>
                      </form>
                    )}
                    {n.status === "arquivada" ? (
                      <form action={mudarStatusNota}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="acao" value="reabrir" />
                        <SubmitButton pendingLabel="..." className="font-bold text-navy underline">
                          Reabrir
                        </SubmitButton>
                      </form>
                    ) : (
                      <form action={mudarStatusNota}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="acao" value="arquivar" />
                        <SubmitButton pendingLabel="..." className="font-bold text-danger underline">
                          Arquivar
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
