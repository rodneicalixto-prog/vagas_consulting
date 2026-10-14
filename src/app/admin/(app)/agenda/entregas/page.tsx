import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { SubmitButton } from "@/components/form-buttons";
import { CalendarioMes } from "@/components/calendario-mes";
import { empresasParaFiltro, filtroConfidencialJobs, obterEscopo } from "@/lib/auth/escopo";
import { ETAPAS_EM_ABERTO } from "@/lib/dashboard";
import { definirPrazoEntrega } from "./actions";

const MES_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DIA_MS = 24 * 3600_000;

function agoraMs(): number {
  return Date.now();
}

type Empresa = { nome_fantasia: string | null; razao_social: string };

export default async function AgendaEntregasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const sp = await searchParams;
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);
  const agora = agoraMs();

  let q = admin
    .from("jobs")
    .select("id, titulo, status, expira_em, confidencial, companies(nome_fantasia, razao_social)")
    .eq("status", "publicada")
    .order("expira_em", { ascending: true, nullsFirst: false })
    .limit(500);
  if (!escopo.todos) {
    q = q.in("company_id", empresasParaFiltro(escopo)).or(filtroConfidencialJobs(escopo));
  }
  const { data: vagas } = await q;
  const lista = vagas ?? [];

  const ids = lista.map((v) => v.id);
  const { data: apps } = ids.length
    ? await admin.from("applications").select("job_id, status").in("job_id", ids).limit(5000)
    : { data: [] as { job_id: string; status: string }[] };
  const total = new Map<string, number>();
  const andamento = new Map<string, number>();
  for (const a of apps ?? []) {
    total.set(a.job_id, (total.get(a.job_id) ?? 0) + 1);
    if (ETAPAS_EM_ABERTO.includes(a.status)) andamento.set(a.job_id, (andamento.get(a.job_id) ?? 0) + 1);
  }

  const nomeEmpresa = (c: Empresa | Empresa[] | null) => {
    const e = Array.isArray(c) ? c[0] : c;
    return e?.nome_fantasia ?? e?.razao_social ?? "—";
  };

  const comPrazo = lista.filter((v) => v.expira_em);
  const semPrazo = lista.filter((v) => !v.expira_em);

  const hoje = new Date(agora);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const hojeChave = `${hoje.getUTCFullYear()}-${p2(hoje.getUTCMonth() + 1)}-${p2(hoje.getUTCDate())}`;
  const m = MES_RE.exec(sp.mes ?? "");
  const ano = m ? Number(m[1]) : hoje.getUTCFullYear();
  const mes = m ? Number(m[2]) - 1 : hoje.getUTCMonth();
  const chaveMes = (a: number, mm: number) => `${a}-${p2(mm + 1)}`;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-text">Agenda de entregas</h1>
          <Link href="/admin/agenda" className="text-[11.5px] font-bold text-text-3 hover:text-text-2">
            ← Minha agenda
          </Link>
        </div>
        <p className="mt-1 text-xs text-text-2">
          Prazo para entregar candidatos ao cliente, por vaga. Vagas vencidas são arquivadas pela rotina diária.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <div className="mb-6">
          <CalendarioMes
            ano={ano}
            mes={mes}
            eventos={comPrazo.map((v) => ({
              id: v.id,
              titulo: v.titulo,
              tipo: "entrevista",
              inicio: v.expira_em as string,
              status: "agendado",
            }))}
            hojeChave={hojeChave}
            hrefDia={() => "/admin/agenda/entregas"}
            hrefMes={(alvo) => {
              if (alvo === "hoje") return "/admin/agenda/entregas";
              const d = new Date(Date.UTC(ano, mes + (alvo === "proximo" ? 1 : -1), 1));
              return `/admin/agenda/entregas?mes=${chaveMes(d.getUTCFullYear(), d.getUTCMonth())}`;
            }}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid grid-cols-5 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
            <div>Vaga</div>
            <div>Empresa</div>
            <div>Prazo</div>
            <div>Candidaturas</div>
            <div>Alterar prazo</div>
          </div>
          {lista.length === 0 && (
            <div className="px-5 py-6 text-xs text-text-2">Nenhuma vaga publicada na sua carteira.</div>
          )}
          {[...comPrazo, ...semPrazo].map((v) => {
            const dias = v.expira_em
              ? Math.ceil((new Date(v.expira_em).getTime() - agora) / DIA_MS)
              : null;
            const cor =
              dias === null
                ? "bg-black/5 text-text-3"
                : dias < 0
                  ? "bg-danger-bg text-danger"
                  : dias <= 3
                    ? "bg-danger-bg text-danger"
                    : dias <= 7
                      ? "bg-gold-bg text-gold-3"
                      : "bg-success-bg text-success";
            return (
              <div
                key={v.id}
                className="grid grid-cols-5 items-center gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none"
              >
                <div className="truncate font-bold text-text">
                  {v.titulo}
                  {v.confidencial && (
                    <span className="ml-2 rounded bg-danger-bg px-1.5 py-0.5 text-[9px] font-extrabold text-danger">
                      CONFIDENCIAL
                    </span>
                  )}
                </div>
                <div className="truncate text-text-2">{nomeEmpresa(v.companies as Empresa | Empresa[] | null)}</div>
                <div>
                  <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${cor}`}>
                    {dias === null
                      ? "Sem prazo"
                      : dias < 0
                        ? `Vencida há ${-dias}d`
                        : dias === 0
                          ? "Vence hoje"
                          : `${dias} dia${dias === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="text-text-2">
                  {total.get(v.id) ?? 0} · {andamento.get(v.id) ?? 0} em andamento
                </div>
                <form action={definirPrazoEntrega} className="flex items-center gap-1.5">
                  <input type="hidden" name="job_id" value={v.id} />
                  <input
                    type="date"
                    name="prazo"
                    defaultValue={v.expira_em ? v.expira_em.slice(0, 10) : ""}
                    className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-[11.5px]"
                  />
                  <SubmitButton
                    pendingLabel="..."
                    className="rounded-lg bg-navy px-2.5 py-1.5 text-[11px] font-bold text-white"
                  >
                    Salvar
                  </SubmitButton>
                </form>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-text-3">
          Vermelho: até 3 dias ou vencida. Amarelo: até 7 dias. Verde: mais de 7 dias.
        </p>
      </div>
    </div>
  );
}
