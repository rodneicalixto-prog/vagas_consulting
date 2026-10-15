import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { filtroConfidencialJobs, obterEscopo } from "@/lib/auth/escopo";
import {
  calcular,
  periodoDoMes,
  type CandidaturaIn,
  type Indicador,
  type Manual,
  type Metas,
  type VagaIn,
} from "@/lib/indicadores";
import { AtualizarPlano, FormManual, FormMetas, FormPlano } from "./forms-indicadores";

export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COR = {
  verde: "bg-success-bg text-success",
  atencao: "bg-gold-bg text-gold-3",
  abaixo: "bg-danger-bg text-danger",
  sem_dado: "bg-navy-bg text-text-2",
} as const;
const ROTULO = { verde: "Na meta", atencao: "Atenção", abaixo: "Abaixo", sem_dado: "Sem dado" } as const;

function fmt(i: Indicador): string {
  if (i.valor === null) return "sem dado";
  if (i.unidade === "R$") return `R$ ${i.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  return `${i.valor.toLocaleString("pt-BR")}${i.unidade === "%" ? "%" : ` ${i.unidade}`}`;
}

export default async function IndicadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ empresa?: string; mes?: string }>;
}) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { empresa, mes } = await searchParams;
  const escopo = await obterEscopo(user.id, role);
  const admin = createAdminClient();

  const consulta = admin.from("companies").select("id, nome_fantasia, razao_social").order("razao_social").limit(300);
  const { data: empresas } = escopo.todos
    ? await consulta
    : await consulta.in("id", escopo.empresas.length > 0 ? escopo.empresas : ["00000000-0000-0000-0000-000000000000"]);
  const lista = empresas ?? [];
  const escolhida = lista.find((e) => e.id === empresa && UUID.test(e.id)) ?? lista[0];

  const agora = new Date();
  const mesPadrao = `${agora.getUTCFullYear()}-${String(agora.getUTCMonth() + 1).padStart(2, "0")}`;
  const per = periodoDoMes(mes ?? mesPadrao) ?? periodoDoMes(mesPadrao)!;
  const mesAtual = `${per.ini.getUTCFullYear()}-${String(per.ini.getUTCMonth() + 1).padStart(2, "0")}`;

  if (!escolhida) {
    return (
      <div className="px-4 md:px-9 py-8">
        <h1 className="text-xl font-extrabold text-text">Indicadores de R&amp;S</h1>
        <p className="mt-2 text-sm text-text-2">Nenhuma empresa na sua carteira.</p>
      </div>
    );
  }

  let vq = admin
    .from("jobs")
    .select("id, status, publicada_em, created_at, updated_at")
    .eq("company_id", escolhida.id)
    .limit(2000);
  if (!escopo.todos) vq = vq.or(filtroConfidencialJobs(escopo));
  const { data: vagas } = await vq;
  const jobIds = (vagas ?? []).map((v) => v.id);

  const vazio = { data: [] as never[] };
  const [apps, tri, fic, res, ofertas, metasRow, manualRow, planos] = await Promise.all([
    jobIds.length
      ? admin.from("applications").select("id, job_id, status, origem, created_at, updated_at").in("job_id", jobIds).limit(5000)
      : vazio,
    jobIds.length ? admin.from("job_screenings").select("application_id").in("job_id", jobIds).limit(5000) : vazio,
    jobIds.length ? admin.from("interview_scorecards").select("application_id").in("job_id", jobIds).limit(5000) : vazio,
    jobIds.length ? admin.from("assessment_results").select("application_id").in("job_id", jobIds).limit(5000) : vazio,
    jobIds.length
      ? admin
          .from("offer_letters")
          .select("status, enviada_em")
          .in("job_id", jobIds)
          .not("enviada_em", "is", null)
          .gte("enviada_em", per.ini.toISOString())
          .lt("enviada_em", per.fim.toISOString())
          .limit(2000)
      : vazio,
    admin.from("recruitment_goals").select("metas").eq("company_id", escolhida.id).maybeSingle(),
    admin.from("recruitment_monthly").select("valores").eq("company_id", escolhida.id).eq("periodo", per.inicioISO).maybeSingle(),
    admin
      .from("recruitment_action_plans")
      .select("id, indicador, valor_texto, meta_texto, causa, acao, responsavel, prazo, estado, o_que_funcionou")
      .eq("company_id", escolhida.id)
      .eq("periodo", per.inicioISO)
      .order("created_at", { ascending: true }),
  ]);

  const nivelExtra = new Map<string, number>();
  const marca = (id: string, n: number) => nivelExtra.set(id, Math.max(nivelExtra.get(id) ?? 0, n));
  for (const r of tri.data as { application_id: string }[]) marca(r.application_id, 1);
  for (const r of fic.data as { application_id: string }[]) marca(r.application_id, 2);
  for (const r of res.data as { application_id: string }[]) marca(r.application_id, 3);

  const metas = (metasRow.data?.metas ?? {}) as Metas;
  const manualDigitado = (manualRow.data?.valores ?? {}) as Manual;
  // Ofertas registradas na plataforma completam o que não foi digitado.
  const cartas = (ofertas.data ?? []) as { status: string }[];
  const manual: Manual = {
    ...manualDigitado,
    ofertas_enviadas: manualDigitado.ofertas_enviadas ?? (cartas.length > 0 ? cartas.length : null),
    ofertas_aceitas:
      manualDigitado.ofertas_aceitas ?? (cartas.length > 0 ? cartas.filter((c) => c.status === "aceita").length : null),
  };
  const r = calcular({
    vagas: (vagas ?? []) as VagaIn[],
    candidaturas: (apps.data ?? []) as CandidaturaIn[],
    nivelExtra,
    ini: per.ini,
    fim: per.fim,
    manual,
    metas,
  });
  const fora = r.indicadores.filter((i) => i.status === "abaixo" || i.status === "atencao");
  const planosLista = planos.data ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Indicadores de R&amp;S</h1>
        <p className="mt-1 text-xs text-text-2">
          {escolhida.nome_fantasia || escolhida.razao_social} · {per.rotulo}. Números do banco e do que você informa.
        </p>
        <form method="get" className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">Empresa</span>
            <select name="empresa" defaultValue={escolhida.id} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm">
              {lista.map((e) => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">Mês</span>
            <input type="month" name="mes" defaultValue={mesAtual} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm" />
          </label>
          <button type="submit" className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">Ver</button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        {r.faltando.length > 0 && (
          <p className="rounded-xl bg-gold-bg px-4 py-3 text-[12px] font-semibold text-gold-3">
            Sem dado neste mês: {r.faltando.join(", ")}. Preencha os números abaixo; indicador sem dado não vira zero.
          </p>
        )}

        <section className="grid gap-3 md:grid-cols-3">
          {r.indicadores.map((i) => (
            <div key={i.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-text-2">{i.nome}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${COR[i.status]}`}>{ROTULO[i.status]}</span>
              </div>
              <div className="mt-1 text-xl font-extrabold text-text">{fmt(i)}</div>
              <div className="text-[11px] text-text-3">
                Meta: {i.meta !== null ? `${i.direcao === "menor" ? "até" : "mín."} ${i.meta}${i.unidade === "%" ? "%" : ""}` : "não definida"}
                {" · "}{i.origem === "banco" ? "do banco" : "informado"}
              </div>
              {i.nota && <div className="text-[11px] text-text-3">{i.nota}</div>}
            </div>
          ))}
        </section>

        {r.leituras.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-2 text-sm font-extrabold text-text">Leitura em conjunto</h2>
            <ul className="list-disc pl-5 text-[12.5px] text-text-2">
              {r.leituras.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </section>
        )}

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-2 text-sm font-extrabold text-text">Funil de seleção (candidaturas do mês)</h2>
            <table className="w-full text-left text-[12.5px]">
              <thead><tr className="text-[10.5px] uppercase text-text-3"><th className="py-1">Etapa</th><th>Qtd</th><th>Conversão</th></tr></thead>
              <tbody>
                {r.funil.map((l) => (
                  <tr key={l.etapa} className="border-t border-border">
                    <td className="py-1.5">{l.rotulo}</td>
                    <td className="font-bold">{l.quantidade}</td>
                    <td>{l.conversao === null ? "—" : `${l.conversao}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-text-3">
              A etapa alcançada vem do status atual e dos registros de triagem, entrevista e teste; quem foi recusado sem
              registro conta só como candidatura.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-2 text-sm font-extrabold text-text">Fontes</h2>
            {r.fontes.length === 0 ? (
              <p className="text-[12.5px] text-text-2">Sem candidaturas no mês.</p>
            ) : (
              <table className="w-full text-left text-[12.5px]">
                <thead><tr className="text-[10.5px] uppercase text-text-3"><th className="py-1">Fonte</th><th>Candidaturas</th><th>Contratações</th></tr></thead>
                <tbody>
                  {r.fontes.map((f) => (
                    <tr key={f.fonte} className="border-t border-border">
                      <td className="py-1.5">{f.fonte}</td>
                      <td className="font-bold">{f.candidaturas}</td>
                      <td>{f.contratacoes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {r.principalFonte && <p className="mt-2 text-[12px] text-text-2">Principal fonte de contratação: {r.principalFonte}.</p>}
            <p className="mt-2 text-[11px] text-text-3">
              Fonte vem do marcador do link da divulgação (3N). Custo por fonte depende de gasto por canal, ainda não informado.
            </p>
          </div>
        </section>

        <FormManual companyId={escolhida.id} mes={mesAtual} v={manual as Record<string, number | null | undefined>} />
        <FormMetas companyId={escolhida.id} m={metas as Record<string, number | null | undefined>} />

        <section className="grid gap-4">
          <h2 className="text-sm font-extrabold text-text">Plano de ação</h2>
          {planosLista.length === 0 ? (
            <p className="text-[12.5px] text-text-2">Nenhuma ação neste mês.</p>
          ) : (
            <ul className="grid gap-2">
              {planosLista.map((p) => (
                <li key={p.id} className="rounded-xl border border-border bg-surface p-4 text-[12.5px]">
                  <div className="font-bold text-text">{p.indicador} · {p.estado.replace("_", " ")}</div>
                  <p className="mt-1 text-text-2">{p.acao}</p>
                  <p className="text-[11.5px] text-text-3">
                    Responsável: {p.responsavel} · prazo {new Date(`${p.prazo}T12:00:00`).toLocaleDateString("pt-BR")}
                    {p.causa ? ` · causa: ${p.causa}` : ""}
                  </p>
                  {p.o_que_funcionou && <p className="mt-1 text-[11.5px] text-success">Funcionou: {p.o_que_funcionou}</p>}
                  <AtualizarPlano companyId={escolhida.id} planId={p.id} estado={p.estado} />
                </li>
              ))}
            </ul>
          )}
          <FormPlano
            companyId={escolhida.id}
            mes={mesAtual}
            indicadores={fora.map((i) => ({ nome: i.nome, valor: fmt(i), meta: i.meta !== null ? String(i.meta) : "—" }))}
          />
        </section>

        <p className="text-[11px] text-text-3">
          <Link href="/admin/estrategico" className="underline">Visão estratégica</Link> · Imprima esta página (Ctrl+P) para
          o relatório do mês. Diversidade fica fora até decisão sua e consentimento próprio.
        </p>
      </div>
    </div>
  );
}
