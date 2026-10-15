import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, requireInternalUser } from "@/lib/auth/internal";
import { chaveMestraConfigurada } from "@/lib/crypto-segredos";
import { PROVEDORES, type GrupoProvedor } from "@/lib/integracoes";
import { SubmitButton } from "@/components/form-buttons";
import { removerCredencial, salvarCredencial, testarCredencial } from "./actions";

const GRUPOS: { id: GrupoProvedor; rotulo: string }[] = [
  { id: "ia", rotulo: "Inteligência artificial" },
  { id: "whatsapp", rotulo: "WhatsApp" },
  { id: "email", rotulo: "E-mail" },
  { id: "sms", rotulo: "SMS" },
  { id: "telegram", rotulo: "Telegram" },
];

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  ok: { rotulo: "Conectado", classe: "bg-success-bg text-success" },
  erro: { rotulo: "Com erro", classe: "bg-danger-bg text-danger" },
  nao_testada: { rotulo: "Não testada", classe: "bg-gold-bg text-gold-3" },
};

function quando(iso: string | null): string {
  if (!iso) return "nunca";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string }>;
}) {
  const { user, role } = await requireInternalUser();
  const ehSuper = can(role, "integracoes.manage");
  if (!ehSuper && !can(role, "integracoes.empresa")) redirect("/admin/acesso-negado");

  const admin = createAdminClient();
  const sp = await searchParams;

  // Escopo exibido: superadmin escolhe; admin da empresa só a empresa dele.
  let companyId: string | null = null;
  if (ehSuper) {
    companyId = sp.empresa && /^[0-9a-f-]{36}$/i.test(sp.empresa) ? sp.empresa : null;
  } else {
    const { data } = await admin
      .from("company_assignments")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("papel", "admin_empresa")
      .eq("ativo", true)
      .limit(1);
    companyId = (data?.[0]?.company_id as string | undefined) ?? null;
    if (!companyId) redirect("/admin/acesso-negado");
  }

  const { data: empresas } = ehSuper
    ? await admin.from("companies").select("id, razao_social, nome_fantasia").eq("status", "aprovada").order("razao_social")
    : { data: [] as { id: string; razao_social: string; nome_fantasia: string | null }[] };

  let consulta = admin
    .from("integration_credentials")
    .select("id, provedor, ultimos4, config, teto_mensal_usd, status, status_msg, testado_em");
  consulta = companyId ? consulta.eq("company_id", companyId) : consulta.eq("escopo", "plataforma");
  const { data: creds } = await consulta;
  const porProvedor = new Map((creds ?? []).map((c) => [c.provedor, c]));

  // Para a empresa: o que herda da plataforma.
  const { data: daPlataforma } = companyId
    ? await admin.from("integration_credentials").select("provedor, status").eq("escopo", "plataforma")
    : { data: [] as { provedor: string; status: string }[] };
  const herdadas = new Map((daPlataforma ?? []).map((c) => [c.provedor, c.status]));

  const cofreOk = chaveMestraConfigurada();
  const nomeEscopo = companyId
    ? ((empresas ?? []).find((e) => e.id === companyId)?.nome_fantasia ??
      (empresas ?? []).find((e) => e.id === companyId)?.razao_social ??
      "Empresa")
    : "Plataforma";

  // Que provedores aparecem neste escopo.
  const visiveis = PROVEDORES.filter((p) => {
    if (!companyId) return true; // plataforma: tudo
    if (!ehSuper) return p.byokEmpresa; // admin da empresa: só IA própria
    return p.byokEmpresa || p.id === "evolution"; // superadmin na empresa: IA + instância
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Integrações</h1>
        <p className="mt-1 text-xs text-text-2">
          Escopo: <b>{nomeEscopo}</b>. As chaves ficam cifradas e nunca voltam para a tela.
        </p>

        {ehSuper && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/admin/integracoes"
              className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                !companyId ? "border-navy bg-navy text-white" : "border-border bg-surface text-text-2"
              }`}
            >
              Plataforma
            </Link>
            {(empresas ?? []).map((e) => (
              <Link
                key={e.id}
                href={`/admin/integracoes?empresa=${e.id}`}
                className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
                  companyId === e.id ? "border-navy bg-navy text-white" : "border-border bg-surface text-text-2"
                }`}
              >
                {e.nome_fantasia ?? e.razao_social}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-5">
        {!cofreOk && (
          <p className="mb-4 rounded-xl bg-gold-bg px-4 py-3 text-xs leading-relaxed text-text-2">
            <b className="text-gold-3">Cofre desativado:</b> a chave-mestra de criptografia ainda não foi configurada no
            servidor (variável <code>INTEGRATIONS_ENCRYPTION_KEY</code>). Enquanto isso, nada é gravado.
          </p>
        )}

        {companyId && (
          <p className="mb-4 rounded-xl bg-navy-bg px-4 py-3 text-xs leading-relaxed text-text-2">
            Sem chave própria, a empresa usa a chave da plataforma (e o custo é da plataforma). Com chave própria, o uso
            sai da conta da empresa.
          </p>
        )}

        {GRUPOS.map((g) => {
          const itens = visiveis.filter((p) => p.grupo === g.id);
          if (itens.length === 0) return null;
          return (
            <section key={g.id} className="mb-5">
              <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-text-3">{g.rotulo}</h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                {itens.map((p) => {
                  const c = porProvedor.get(p.id);
                  const s = c ? (STATUS[c.status] ?? STATUS.nao_testada) : null;
                  const herda = !c && companyId ? herdadas.get(p.id) : undefined;
                  const config = (c?.config as { base_url?: string; instance?: string; remetente?: string; provedor?: string } | null) ?? {};
                  const ehInstancia = p.id === "evolution" && !!companyId;
                  return (
                    <details
                      key={p.id}
                      open={!!c && c.status !== "ok"}
                      className="group border-b border-border last:border-b-0"
                    >
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-bg">
                        <span className="text-[10px] text-text-3 transition-transform group-open:rotate-90">▸</span>
                        <span className="min-w-0 flex-1 basis-44 text-[13.5px] font-extrabold text-text">
                          {ehInstancia ? "WhatsApp da empresa (instância)" : p.rotulo}
                        </span>
                        {c?.ultimos4 && (
                          <span className="font-mono text-[11px] text-text-3">••••{c.ultimos4}</span>
                        )}
                        {s ? (
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${s.classe}`}>
                            {s.rotulo}
                          </span>
                        ) : herda ? (
                          <span className="rounded-full bg-navy-bg px-2.5 py-1 text-[10px] font-extrabold text-navy">
                            Usa a da plataforma
                          </span>
                        ) : (
                          <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-extrabold text-text-3">
                            Não configurada
                          </span>
                        )}
                      </summary>

                      <div className="border-t border-border bg-bg/60 px-5 py-4">
                        {c && c.status === "nao_testada" && (
                          <p className="mb-3 rounded-lg bg-gold-bg px-3 py-2 text-[11.5px] font-bold text-gold-3">
                            Chave salva. Clique em &ldquo;Testar conexão&rdquo; (botão verde abaixo) para validar.
                          </p>
                        )}
                        {c?.status_msg && (
                          <p className="mb-3 text-[11.5px] text-text-2">
                            {c.status_msg} <span className="text-text-3">(testado em {quando(c.testado_em)})</span>
                          </p>
                        )}

                        <form action={salvarCredencial} className="grid gap-3 md:grid-cols-2">
                          {companyId && ehSuper && <input type="hidden" name="company_id" value={companyId} />}
                          <input type="hidden" name="provedor" value={p.id} />

                          {!ehInstancia && (
                            <label className="flex flex-col gap-1 md:col-span-2">
                              <span className="text-[10.5px] font-bold text-text-2">
                                {c ? "Nova chave (deixe vazio para manter a atual)" : "Chave"} · {p.dica}
                              </span>
                              <input
                                name="segredo"
                                type="password"
                                autoComplete="off"
                                placeholder={c?.ultimos4 ? `••••${c.ultimos4}` : "Cole a chave aqui"}
                                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                              />
                            </label>
                          )}

                          {p.id === "evolution" && !companyId && (
                            <label className="flex flex-col gap-1 md:col-span-2">
                              <span className="text-[10.5px] font-bold text-text-2">URL da Evolution (https)</span>
                              <input
                                name="base_url"
                                defaultValue={config.base_url ?? ""}
                                placeholder="https://evolution.seudominio.com.br"
                                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                              />
                            </label>
                          )}
                          {ehInstancia && (
                            <label className="flex flex-col gap-1 md:col-span-2">
                              <span className="text-[10.5px] font-bold text-text-2">
                                Nome da instância (um número por empresa)
                              </span>
                              <input
                                name="instance"
                                defaultValue={config.instance ?? ""}
                                placeholder="rh_empresa"
                                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                              />
                            </label>
                          )}
                          {p.id === "resend" && (
                            <label className="flex flex-col gap-1 md:col-span-2">
                              <span className="text-[10.5px] font-bold text-text-2">Remetente (opcional)</span>
                              <input
                                name="remetente"
                                defaultValue={config.remetente ?? ""}
                                placeholder="Vagas <vagas@seudominio.com.br>"
                                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                              />
                            </label>
                          )}
                          {p.id === "sms" && (
                            <label className="flex flex-col gap-1 md:col-span-2">
                              <span className="text-[10.5px] font-bold text-text-2">Provedor de SMS</span>
                              <input
                                name="sms_provedor"
                                defaultValue={config.provedor ?? ""}
                                placeholder="Zenvia, Twilio..."
                                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                              />
                            </label>
                          )}
                          {p.grupo === "ia" && (
                            <label className="flex flex-col gap-1">
                              <span className="text-[10.5px] font-bold text-text-2">Teto mensal (US$)</span>
                              <input
                                name="teto"
                                defaultValue={c?.teto_mensal_usd ?? ""}
                                inputMode="decimal"
                                placeholder="100"
                                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
                              />
                            </label>
                          )}

                          <div className="flex items-end md:col-span-2">
                            <SubmitButton
                              pendingLabel="Salvando..."
                              className="rounded-lg bg-navy px-4 py-2.5 text-[12.5px] font-extrabold text-white"
                            >
                              {c ? "Salvar alterações" : "Salvar"}
                            </SubmitButton>
                          </div>
                        </form>

                        {c && (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                            <form action={testarCredencial}>
                              {companyId && ehSuper && <input type="hidden" name="company_id" value={companyId} />}
                              <input type="hidden" name="id" value={c.id} />
                              <SubmitButton
                                pendingLabel="Testando..."
                                className="rounded-lg bg-success px-3 py-2 text-[11.5px] font-extrabold text-white"
                              >
                                Testar conexão
                              </SubmitButton>
                            </form>
                            <form action={removerCredencial}>
                              {companyId && ehSuper && <input type="hidden" name="company_id" value={companyId} />}
                              <input type="hidden" name="id" value={c.id} />
                              <SubmitButton
                                pendingLabel="..."
                                className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-[11.5px] font-extrabold text-danger"
                              >
                                Remover
                              </SubmitButton>
                            </form>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p className="mt-2 text-[11px] leading-relaxed text-text-3">
          O consumo mensal e o bloqueio pelo teto passam a valer quando o agente de IA for ativado (Fase 3 da
          comunicação). Por ora o teto fica registrado.
        </p>
      </div>
    </div>
  );
}
