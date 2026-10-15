import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { atualizarEmpresa, criarEmpresa, decidirEmpresa } from "./actions";
import { FormularioEmpresa } from "./formulario-empresa";
import { formatarTelefoneBR } from "@/lib/whatsapp";
import { can, requireInternalUser } from "@/lib/auth/internal";
import { empresasParaFiltro, obterEscopo } from "@/lib/auth/escopo";
import { SubmitButton } from "@/components/form-buttons";
import { empresaDaOperacao } from "@/lib/evolution";
import { abrirConversaComEmpresaCliente } from "../conversas/actions";

const LIMITE = 300;

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-navy-bg text-navy" },
  em_analise: { label: "Em análise", className: "bg-gold-bg text-gold-3" },
  ajustes: { label: "Em ajustes", className: "bg-gold-bg text-gold-3" },
  aprovada: { label: "Ativa", className: "bg-success-bg text-success" },
  suspensa: { label: "Suspensa", className: "bg-danger-bg text-danger" },
  bloqueada: { label: "Inativa", className: "bg-danger-bg text-danger" },
};

const FILTROS = [
  { valor: "ativas", rotulo: "Ativas", status: ["aprovada"] },
  { valor: "analise", rotulo: "Em análise", status: ["rascunho", "em_analise", "ajustes"] },
  { valor: "inativas", rotulo: "Inativas", status: ["suspensa", "bloqueada"] },
  { valor: "todas", rotulo: "Todas", status: [] as string[] },
] as const;

export default async function ModeracaoEmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string }>;
}) {
  const { user, role } = await requireInternalUser("companies.manage");
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);
  const somenteLeitura = !can(role, "companies.approve");
  const sp = await searchParams;
  const operacaoId = await empresaDaOperacao();
  const podeConversar = !!operacaoId && can(role, "pipeline.manage") && (escopo.todos || escopo.empresas.includes(operacaoId));

  const filtro = FILTROS.find((f) => f.valor === sp.filtro) ?? FILTROS[3];
  const busca = (sp.q ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60).toLowerCase();

  let consulta = admin
    .from("companies")
    .select(
      "id, razao_social, nome_fantasia, cnpj, endereco, status, max_operadores, telefone, email_contato, cep, logradouro, numero, complemento, bairro, cidade, uf, responsavel_nome, responsavel_cargo, responsavel_telefone, responsavel_email",
    )
    .order("nome_fantasia", { ascending: true, nullsFirst: false })
    .limit(LIMITE);
  // Carteira: operador só vê as empresas atribuídas e ativas.
  if (!escopo.todos) consulta = consulta.in("id", empresasParaFiltro(escopo));
  const { data: todas } = await consulta;
  const base = todas ?? [];

  const ids = base.map((c) => c.id);
  const [{ data: vagas }, { data: equipe }] = ids.length
    ? await Promise.all([
        admin.from("jobs").select("company_id, status").in("company_id", ids).limit(5000),
        admin
          .from("company_assignments")
          .select("company_id")
          .in("company_id", ids)
          .eq("papel", "operador")
          .eq("ativo", true),
      ])
    : [{ data: [] as { company_id: string; status: string }[] }, { data: [] as { company_id: string }[] }];

  const abertas = new Map<string, number>();
  const totalVagas = new Map<string, number>();
  for (const v of vagas ?? []) {
    totalVagas.set(v.company_id, (totalVagas.get(v.company_id) ?? 0) + 1);
    if (v.status === "publicada") abertas.set(v.company_id, (abertas.get(v.company_id) ?? 0) + 1);
  }
  const operadores = new Map<string, number>();
  for (const e of equipe ?? []) operadores.set(e.company_id, (operadores.get(e.company_id) ?? 0) + 1);

  const contagem = new Map<string, number>();
  for (const f of FILTROS) {
    contagem.set(
      f.valor,
      f.status.length === 0 ? base.length : base.filter((c) => (f.status as readonly string[]).includes(c.status)).length,
    );
  }
  const lista = base.filter(
    (c) =>
      (filtro.status.length === 0 || (filtro.status as readonly string[]).includes(c.status)) &&
      (!busca ||
        c.razao_social.toLowerCase().includes(busca) ||
        (c.nome_fantasia ?? "").toLowerCase().includes(busca)),
  );

  const href = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const b: Record<string, string | undefined> = { filtro: sp.filtro, q: sp.q, ...extra };
    for (const [k, v] of Object.entries(b)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/empresas?${s}` : "/admin/empresas";
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Empresas</h1>
        <p className="mt-1 text-xs text-text-2">
          {base.length} cliente{base.length === 1 ? "" : "s"} e contratante{base.length === 1 ? "" : "s"} da Vagas Consulting
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              href={href({ filtro: f.valor === "todas" ? undefined : f.valor })}
              className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                filtro.valor === f.valor
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-surface text-text-2 hover:border-navy/40"
              }`}
            >
              {f.rotulo} <span className="opacity-70">{contagem.get(f.valor) ?? 0}</span>
            </Link>
          ))}
          <form className="ml-auto flex gap-2">
            {sp.filtro && <input type="hidden" name="filtro" value={sp.filtro} />}
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Buscar empresa"
              className="w-40 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] md:w-56"
            />
          </form>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-5">
        {!somenteLeitura && (
          <details className="group mb-5 rounded-2xl border border-border bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-[13px] font-extrabold text-navy">
              <span>+ Cadastrar empresa</span>
              <span className="text-[11px] transition-transform group-open:rotate-90">▸</span>
            </summary>
            <div className="border-t border-border p-4">
              <FormularioEmpresa action={criarEmpresa} rotuloBotao="Cadastrar empresa" />
            </div>
          </details>
        )}

        {lista.length === 0 ? (
          <p className="mt-8 text-center text-sm text-text-2">
            Nenhuma empresa neste filtro.{" "}
            <Link href={href({ filtro: undefined, q: undefined })} className="font-bold text-navy underline">
              Ver todas
            </Link>
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {lista.map((c) => {
              const s = STATUS_LABEL[c.status] ?? STATUS_LABEL.rascunho;
              const nome = c.nome_fantasia ?? c.razao_social;
              return (
                <details key={c.id} className="group border-b border-border last:border-b-0">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-bg">
                    <span className="text-[10px] text-text-3 transition-transform group-open:rotate-90">▸</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-bg text-[13px] font-extrabold text-navy">
                      {nome.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 basis-44 truncate text-[13.5px] font-extrabold text-text">{nome}</span>
                    <span className="hidden w-28 text-right text-[11.5px] text-text-2 md:block">
                      {abertas.get(c.id) ?? 0} aberta{(abertas.get(c.id) ?? 0) === 1 ? "" : "s"} · {totalVagas.get(c.id) ?? 0} total
                    </span>
                    {role !== "operador" && (
                      <span className="hidden w-28 text-right text-[11.5px] text-text-2 md:block">
                        {operadores.get(c.id) ?? 0}/{c.max_operadores} operadores
                      </span>
                    )}
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${s.className}`}>
                      {s.label}
                    </span>
                  </summary>

                  <div className="border-t border-border bg-bg/60 px-5 py-4">
                    <div className="grid gap-x-6 gap-y-1 text-[11.5px] text-text-2 md:grid-cols-2">
                      <p>
                        <b className="text-text">{c.razao_social}</b>
                        {c.cnpj ? ` · CNPJ ${c.cnpj}` : " · CNPJ não informado"}
                      </p>
                      <p>
                        <b className="text-text">Telefone:</b>{" "}
                        {c.telefone ? formatarTelefoneBR(c.telefone) : "não informado"}
                        {c.email_contato ? ` · ${c.email_contato}` : ""}
                      </p>
                      <p className="md:col-span-2">
                        <b className="text-text">Endereço:</b> {c.endereco ?? "não informado"}
                      </p>
                      <p className="md:col-span-2">
                        <b className="text-text">Responsável:</b>{" "}
                        {c.responsavel_nome
                          ? [
                              c.responsavel_nome,
                              c.responsavel_cargo,
                              c.responsavel_telefone ? formatarTelefoneBR(c.responsavel_telefone) : null,
                              c.responsavel_email,
                            ]
                              .filter(Boolean)
                              .join(" · ")
                          : "não informado"}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-[11.5px]">
                      <Link href="/admin/vagas" className="font-bold text-navy underline">
                        Ver vagas →
                      </Link>
                      <Link href={`/admin?empresa=${c.id}`} className="font-bold text-navy underline">
                        Ver painel da empresa →
                      </Link>
                      {podeConversar && c.id !== operacaoId && (c.responsavel_telefone || c.telefone) && (
                        <form action={abrirConversaComEmpresaCliente}>
                          <input type="hidden" name="company_id" value={c.id} />
                          <button type="submit" className="font-bold text-success underline">
                            Conversar com o responsável (WhatsApp) →
                          </button>
                        </form>
                      )}
                    </div>

                    {!somenteLeitura && (
                      <details className="group/edit mt-3 rounded-xl border border-border bg-surface">
                        <summary className="cursor-pointer list-none px-4 py-2.5 text-[12px] font-extrabold text-navy">
                          Editar dados, endereço e responsável
                        </summary>
                        <div className="border-t border-border p-4">
                          <FormularioEmpresa
                            action={atualizarEmpresa}
                            companyId={c.id}
                            rotuloBotao="Salvar dados da empresa"
                            dados={c}
                          />
                        </div>
                      </details>
                    )}

                    {!somenteLeitura && (
                      <form action={decidirEmpresa} className="mt-3 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="company_id" value={c.id} />
                        <input
                          name="motivo"
                          placeholder="Motivo da alteração de status"
                          className="min-w-0 flex-1 basis-56 rounded-lg border border-border bg-surface px-3 py-2 text-[12px]"
                        />
                        <SubmitButton
                          name="acao"
                          value="corrigir"
                          pendingLabel="..."
                          className="rounded-lg border border-border bg-surface px-3 py-2 text-[11.5px] font-extrabold text-text-2"
                        >
                          Marcar para revisão
                        </SubmitButton>
                        <SubmitButton
                          name="acao"
                          value="rejeitar"
                          pendingLabel="..."
                          className="rounded-lg bg-danger px-3 py-2 text-[11.5px] font-extrabold text-white"
                        >
                          Inativar
                        </SubmitButton>
                        <SubmitButton
                          name="acao"
                          value="aprovar"
                          pendingLabel="..."
                          className="rounded-lg bg-success px-3 py-2 text-[11.5px] font-extrabold text-white"
                        >
                          Ativar
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
