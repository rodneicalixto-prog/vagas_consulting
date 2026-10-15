import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { SubmitButton } from "@/components/form-buttons";
import { calcularVagasOperador, rotuloVagasOperador } from "@/lib/operadores";
import { empresaDaOperacao } from "@/lib/evolution";
import {
  alternarConfianca,
  convidarOperador,
  desativarOperador,
  reativarOperador,
} from "./actions";

const EM_ANDAMENTO = ["recebida", "triagem", "entrevista", "teste", "proposta"] as const;

type SearchParams = Promise<{ empresa?: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OperadoresPage({ searchParams }: { searchParams: SearchParams }) {
  // Sem capability fixa: admin da empresa gerencia; superadmin/admin só leem.
  const { user, role } = await requireInternalUser();
  const admin = createAdminClient();
  const sp = await searchParams;

  const ehAdminEmpresa = role === "admin_empresa";
  const mostrarSeletor = role === "superadmin" || role === "admin";
  if (!ehAdminEmpresa && !mostrarSeletor) redirect("/admin/acesso-negado");

  let companyId: string | null = null;
  let empresasLeitura: { id: string; nome: string }[] = [];
  const operacaoId = role === "superadmin" ? await empresaDaOperacao() : null;

  if (ehAdminEmpresa) {
    const { data } = await admin
      .from("company_assignments")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("papel", "admin_empresa")
      .eq("ativo", true)
      .limit(1);
    companyId = data?.[0]?.company_id ?? null;
  } else {
    const { data } = await admin
      .from("companies")
      .select("id, razao_social, nome_fantasia")
      .order("razao_social");
    empresasLeitura = (data ?? []).map((e) => ({ id: e.id, nome: e.nome_fantasia ?? e.razao_social }));
    const pedida = sp.empresa && UUID.test(sp.empresa) ? sp.empresa : operacaoId;
    companyId = empresasLeitura.find((e) => e.id === pedida)?.id ?? null;
  }

  // Admin da empresa gerencia a própria equipe; o superadmin gerencia a da
  // operação (SOS Vagas) e lê as das empresas clientes.
  const podeGerenciar = ehAdminEmpresa || (role === "superadmin" && !!companyId && companyId === operacaoId);
  const somenteLeitura = mostrarSeletor && !podeGerenciar;

  const seletor = mostrarSeletor && (
    <form className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <select
        name="empresa"
        defaultValue={companyId ?? ""}
        className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
      >
        <option value="">Empresa…</option>
        {empresasLeitura.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nome}
          </option>
        ))}
      </select>
      <button className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">Ver operadores</button>
      <span className="text-[11.5px] text-text-2">
        {podeGerenciar ? "Equipe da sua operação: você gerencia." : "Visão somente leitura."}
      </span>
    </form>
  );

  if (!companyId) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="shrink-0 px-4 md:px-9 pt-7">
          <h1 className="text-xl font-extrabold text-text">Operadores</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
          {seletor}
          <p className="rounded-xl bg-navy-bg px-4 py-3 text-xs text-text-2">
            {somenteLeitura
              ? "Escolha uma empresa para ver os operadores."
              : "Nenhuma empresa vinculada ao seu acesso. Fale com o suporte."}
          </p>
        </div>
      </div>
    );
  }

  const { data: empresa } = await admin
    .from("companies")
    .select("id, razao_social, nome_fantasia, max_operadores")
    .eq("id", companyId)
    .maybeSingle();

  const [{ data: atribuicoes }, { data: vagasEmpresa }] = await Promise.all([
    admin
      .from("company_assignments")
      .select("id, user_id, ativo, acessa_confidenciais, created_at")
      .eq("company_id", companyId)
      .eq("papel", "operador")
      .order("created_at", { ascending: true }),
    admin.from("jobs").select("id").eq("company_id", companyId),
  ]);

  const linhas = atribuicoes ?? [];
  const userIds = linhas.map((l) => l.user_id);

  const { data: perfis } =
    userIds.length > 0
      ? await admin.from("admin_users").select("user_id, nome_exibicao").in("user_id", userIds)
      : { data: [] as { user_id: string; nome_exibicao: string | null }[] };
  const nomePorUser = new Map((perfis ?? []).map((p) => [p.user_id, p.nome_exibicao]));

  // Contagem da empresa (candidaturas não têm dono): mostrada uma vez.
  const vagaIds = (vagasEmpresa ?? []).map((v) => v.id);
  let candidaturasEmAndamento = 0;
  if (vagaIds.length > 0) {
    const { count } = await admin
      .from("applications")
      .select("id", { count: "exact", head: true })
      .in("job_id", vagaIds)
      .in("status", [...EM_ANDAMENTO]);
    candidaturasEmAndamento = count ?? 0;
  }

  const emUso = linhas.filter((l) => l.ativo).length;
  const vagas = calcularVagasOperador(Number(empresa?.max_operadores ?? 0), emUso);
  const nomeEmpresa = empresa?.nome_fantasia ?? empresa?.razao_social ?? "Empresa";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Operadores</h1>
        <p className="mt-1 text-xs text-text-2">
          {nomeEmpresa} · <b className="text-text">{rotuloVagasOperador(vagas)}</b>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        {seletor}

        {podeGerenciar && (
          <form
            action={convidarOperador}
            className="mb-6 grid gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-3"
          >
            <input
              name="nome"
              required
              minLength={2}
              maxLength={120}
              placeholder="Nome do operador"
              disabled={vagas.cheio}
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm disabled:opacity-50"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="E-mail"
              disabled={vagas.cheio}
              className="rounded-xl border border-border bg-bg px-3 py-2 text-sm disabled:opacity-50"
            />
            <SubmitButton
              pendingLabel="Convidando..."
              disabled={vagas.cheio}
              className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white"
            >
              Convidar operador
            </SubmitButton>
            {vagas.cheio && (
              <p className="text-[12px] text-danger md:col-span-3">
                Todas as vagas de operador estão em uso. Desative um operador ou peça ao superadmin para
                ampliar o limite da empresa.
              </p>
            )}
          </form>
        )}

        <p className="mb-4 rounded-xl bg-navy-bg px-4 py-3 text-xs text-text-2">
          Candidaturas em andamento na empresa: <b className="text-text">{candidaturasEmAndamento}</b>. As
          candidaturas pertencem à empresa, não a um operador específico.
        </p>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid grid-cols-4 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
            <div>Operador</div>
            <div>Situação</div>
            <div>Acesso de confiança</div>
            <div>Ações</div>
          </div>
          {linhas.length === 0 && (
            <div className="px-5 py-6 text-xs text-text-2">Nenhum operador cadastrado ainda.</div>
          )}
          {linhas.map((l) => (
            <div
              key={l.id}
              className="grid grid-cols-4 items-center gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none"
            >
              <div className="font-bold text-text">
                {nomePorUser.get(l.user_id) ?? `Operador #${l.user_id.slice(0, 8)}`}
              </div>
              <div className={l.ativo ? "text-text-2" : "text-text-3"}>{l.ativo ? "Ativo" : "Inativo"}</div>
              {podeGerenciar ? (
                <form action={alternarConfianca}>
                  <input type="hidden" name="assignment_id" value={l.id} />
                  <input type="hidden" name="valor" value={l.acessa_confidenciais ? "false" : "true"} />
                  <SubmitButton pendingLabel="..." className="text-[11px] font-bold text-navy underline">
                    {l.acessa_confidenciais ? "Sim — retirar" : "Não — conceder"}
                  </SubmitButton>
                </form>
              ) : (
                <div className="text-text-2">{l.acessa_confidenciais ? "Sim" : "Não"}</div>
              )}
              {podeGerenciar ? (
                l.ativo ? (
                  <form action={desativarOperador}>
                    <input type="hidden" name="assignment_id" value={l.id} />
                    <SubmitButton pendingLabel="..." className="text-[11px] font-bold text-danger underline">
                      Desativar
                    </SubmitButton>
                  </form>
                ) : (
                  <form action={reativarOperador}>
                    <input type="hidden" name="assignment_id" value={l.id} />
                    <SubmitButton
                      pendingLabel="..."
                      disabled={vagas.cheio}
                      title={vagas.cheio ? "Sem vaga de operador em aberto" : undefined}
                      className="text-[11px] font-bold text-navy underline"
                    >
                      Reativar
                    </SubmitButton>
                  </form>
                )
              ) : (
                <div className="text-text-3">—</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
