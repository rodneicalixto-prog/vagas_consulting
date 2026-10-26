import Link from "next/link";
import { requireInternalUser } from "@/lib/auth/internal";
import { candidatosVisiveis, obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import { createAdminClient } from "@/lib/supabase/admin";
import { BotaoPdf, CabecalhoImpressao } from "@/components/botao-pdf";
import {
  ROTULO_CANAL_ORIGEM,
  agruparOrigens,
  desdeDias,
  interpretarOrigemCandidatura,
  resumirPorCanal,
  rotuloOrigem,
  type CanalOrigem,
} from "@/lib/origem";

const PERIODOS = [
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
  { dias: 365, rotulo: "12 meses" },
  { dias: 0, rotulo: "Tudo" },
] as const;

const NENHUM = "00000000-0000-0000-0000-000000000000";

/** De onde vêm os candidatos: cadastros, candidaturas e contratados por canal. */
export default async function OrigensPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { user, role } = await requireInternalUser("dashboard.read");
  const { dias: diasBruto } = await searchParams;
  const dias = PERIODOS.some((p) => String(p.dias) === diasBruto) ? Number(diasBruto) : 90;
  const desde = desdeDias(dias);

  const escopo = await obterEscopo(user.id, role);
  const [vagas, candidatos] = await Promise.all([vagasVisiveis(escopo), candidatosVisiveis(escopo)]);
  const admin = createAdminClient();

  let qPerfis = admin.from("profiles").select("origem_canal, origem_detalhe, created_at").order("created_at", { ascending: false }).limit(5000);
  if (candidatos) qPerfis = qPerfis.in("id", candidatos.length ? candidatos : [NENHUM]);
  if (desde) qPerfis = qPerfis.gte("created_at", desde);

  let qApps = admin.from("applications").select("origem, status, created_at").order("created_at", { ascending: false }).limit(5000);
  if (vagas) qApps = qApps.in("job_id", vagas.length ? vagas : [NENHUM]);
  if (desde) qApps = qApps.gte("created_at", desde);

  const [{ data: perfis }, { data: apps }] = await Promise.all([qPerfis, qApps]);
  const listaPerfis = (perfis ?? []).map((p) => ({
    canal: ((p.origem_canal as CanalOrigem | null) ?? "nao_informado") as CanalOrigem,
    detalhe: p.origem_detalhe ?? "",
  }));
  const listaApps = apps ?? [];

  const porCanal = resumirPorCanal(listaPerfis, listaApps);
  const detalhesCadastros = agruparOrigens(listaPerfis).slice(0, 15);
  const detalhesCandidaturas = agruparOrigens(listaApps.map((a) => interpretarOrigemCandidatura(a.origem))).slice(0, 15);
  const semOrigem = listaPerfis.filter((p) => p.canal === "nao_informado").length;
  const tot = porCanal.reduce((s, r) => ({ c: s.c + r.cadastros, a: s.a + r.candidaturas, h: s.h + r.contratados }), { c: 0, a: 0, h: 0 });
  const rotuloPeriodo = PERIODOS.find((p) => p.dias === dias)?.rotulo ?? "";

  return (
    <div className="h-full overflow-y-auto px-4 md:px-9 py-7">
      <CabecalhoImpressao titulo="Origem dos candidatos" subtitulo={`Período: ${rotuloPeriodo}`} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold text-text">Origem dos candidatos</h1>
        <span className="ml-auto">
          <BotaoPdf nomeDoArquivo={`Origem dos candidatos - ${rotuloPeriodo}`} />
        </span>
      </div>
      <p className="mt-1 text-xs text-text-2">
        Por qual canal cada pessoa chegou. <b>Cadastro</b> guarda o primeiro toque; <b>candidatura</b> guarda o canal de cada vaga.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        {PERIODOS.map((p) => (
          <Link
            key={p.dias}
            href={`/admin/origens?dias=${p.dias}`}
            className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
              p.dias === dias ? "border-navy bg-navy text-white" : "border-border bg-surface text-text-2"
            }`}
          >
            {p.rotulo}
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ["Cadastros", tot.c],
          ["Candidaturas", tot.a],
          ["Contratados", tot.h],
        ].map(([rotulo, valor]) => (
          <div key={rotulo as string} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">{rotulo}</p>
            <p className="mt-1 text-2xl font-extrabold text-text">{valor}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-7 text-sm font-extrabold text-text">Por canal</h2>
      {porCanal.length === 0 ? (
        <p className="rounded-xl bg-bg px-4 py-6 text-center text-[12.5px] text-text-2">Nenhum cadastro ou candidatura no período.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-bg text-[10.5px] font-bold uppercase tracking-wide text-text-3">
              <tr>
                <th className="px-4 py-2.5">Canal</th>
                <th className="px-4 py-2.5 text-right">Cadastros</th>
                <th className="px-4 py-2.5 text-right">Candidaturas</th>
                <th className="px-4 py-2.5 text-right">Contratados</th>
                <th className="px-4 py-2.5 text-right">Conversão*</th>
              </tr>
            </thead>
            <tbody>
              {porCanal.map((r) => (
                <tr key={r.canal} className="border-t border-border">
                  <td className="px-4 py-2.5 font-bold text-text">{ROTULO_CANAL_ORIGEM[r.canal]}</td>
                  <td className="px-4 py-2.5 text-right">{r.cadastros}</td>
                  <td className="px-4 py-2.5 text-right">{r.candidaturas}</td>
                  <td className="px-4 py-2.5 text-right">{r.contratados}</td>
                  <td className="px-4 py-2.5 text-right">{r.conversao === null ? "—" : `${String(r.conversao).replace(".", ",")}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11px] text-text-3">* Conversão = contratados ÷ candidaturas do canal.</p>
      {semOrigem > 0 && (
        <p className="mt-2 rounded-xl bg-gold-bg px-4 py-3 text-[12px] text-text-2">
          {semOrigem} cadastro(s) sem origem: são de antes deste registro existir ou chegaram sem link com marcador. Nada foi inventado para eles.
        </p>
      )}

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-extrabold text-text">Cadastros por origem (detalhe)</h2>
          <ul className="grid gap-1.5 text-[12.5px]">
            {detalhesCadastros.map((l) => (
              <li key={`${l.canal}|${l.detalhe}`} className="flex justify-between rounded-lg border border-border bg-surface px-3 py-2">
                <span>{rotuloOrigem({ canal: l.canal, detalhe: l.detalhe })}</span>
                <b>{l.total}</b>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-extrabold text-text">Candidaturas por origem (detalhe)</h2>
          <ul className="grid gap-1.5 text-[12.5px]">
            {detalhesCandidaturas.map((l) => (
              <li key={`${l.canal}|${l.detalhe}`} className="flex justify-between rounded-lg border border-border bg-surface px-3 py-2">
                <span>{rotuloOrigem({ canal: l.canal, detalhe: l.detalhe })}</span>
                <b>{l.total}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
