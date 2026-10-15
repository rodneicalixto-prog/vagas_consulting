import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { empresasParaFiltro, obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import { ETAPAS_EM_ABERTO } from "@/lib/dashboard";
import type { Enums } from "@/lib/supabase/types";

function agoraMs(): number {
  return Date.now();
}

type Escopo = Awaited<ReturnType<typeof obterEscopo>>;

const DIA_MS = 86_400_000;
const FUSO_MS = 3 * 60 * 60 * 1000; // America/Sao_Paulo (UTC-3)

type Acao = {
  chave: string;
  rotulo: string;
  dica: string;
  valor: number;
  href: string;
};

/**
 * "Precisa de ação agora": o que está esperando uma pessoa, com contagem e
 * destino clicável. Tudo limitado à carteira (o painel usa chave de serviço).
 */
export async function PainelDeAcoes({
  userId,
  role,
  escopo,
}: {
  userId: string;
  role: string;
  escopo: Escopo;
}) {
  const admin = createAdminClient();
  const agora = agoraMs();
  const operador = role === "operador";
  const semCarteira = !escopo.todos && escopo.empresas.length === 0;

  // Início e fim de hoje no fuso de São Paulo.
  const local = new Date(agora - FUSO_MS);
  const iniHoje = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + FUSO_MS;
  const fimHoje = iniHoje + DIA_MS;

  const vagasIds = await vagasVisiveis(escopo); // null = sem filtro
  const empresas = escopo.todos ? null : empresasParaFiltro(escopo);

  // Conversas (sigilo: operador só conta as dele e a fila de candidatos).
  const contarConversas = async (naoLidas: boolean, soFila: boolean) => {
    if (semCarteira) return 0;
    let q = admin.from("conversations").select("id", { count: "exact", head: true });
    if (empresas) q = q.in("company_id", empresas);
    if (operador) q = q.or(`atendente_id.eq.${userId},and(atendente_id.is.null,candidate_id.not.is.null)`);
    if (soFila) q = q.is("atendente_id", null).not("candidate_id", "is", null);
    if (naoLidas) q = q.gt("nao_lidas", 0);
    const { count } = await q;
    return count ?? 0;
  };

  const vagasSemFiltroVazio = vagasIds !== null && vagasIds.length === 0;

  const [fila, naoLidas, compromissosHoje, paradas, publicadas, entregas, followups] = await Promise.all([
    contarConversas(false, true),
    contarConversas(true, false),
    admin
      .from("compromissos")
      .select("id", { count: "exact", head: true })
      .eq("responsavel_id", userId)
      .gte("inicio", new Date(iniHoje).toISOString())
      .lt("inicio", new Date(fimHoje).toISOString())
      .not("status", "in", "(cancelado,cancelada,concluido,concluida)")
      .then((r) => r.count ?? 0),
    vagasSemFiltroVazio
      ? Promise.resolve(0)
      : (() => {
          let q = admin
            .from("applications")
            .select("id", { count: "exact", head: true })
            .in("status", ETAPAS_EM_ABERTO as Enums<"status_candidatura">[])
            .lt("updated_at", new Date(agora - 7 * DIA_MS).toISOString());
          if (vagasIds) q = q.in("job_id", vagasIds);
          return q.then((r) => r.count ?? 0);
        })(),
    vagasSemFiltroVazio
      ? Promise.resolve([] as { id: string }[])
      : (() => {
          let q = admin
            .from("jobs")
            .select("id")
            .eq("status", "publicada")
            .lt("publicada_em", new Date(agora - 5 * DIA_MS).toISOString())
            .limit(500);
          if (vagasIds) q = q.in("id", vagasIds);
          return q.then((r) => (r.data ?? []) as { id: string }[]);
        })(),
    vagasSemFiltroVazio
      ? Promise.resolve(0)
      : (() => {
          let q = admin
            .from("jobs")
            .select("id", { count: "exact", head: true })
            .eq("status", "publicada")
            .not("expira_em", "is", null)
            .lte("expira_em", new Date(agora + 3 * DIA_MS).toISOString());
          if (vagasIds) q = q.in("id", vagasIds);
          return q.then((r) => r.count ?? 0);
        })(),
    // Follow-ups de abordagem vencidos (só os do próprio usuário).
    admin
      .from("outreach_drafts")
      .select("id", { count: "exact", head: true })
      .eq("criado_por", userId)
      .eq("estado", "enviada")
      .lte("proximo_followup_em", new Date(agora).toISOString())
      .then((r) => r.count ?? 0),
  ]);

  // Vagas publicadas há 5+ dias sem nenhuma candidatura.
  let semCandidatura = 0;
  if (publicadas.length > 0) {
    const { data: comCand } = await admin
      .from("applications")
      .select("job_id")
      .in(
        "job_id",
        publicadas.map((v) => v.id),
      )
      .limit(5000);
    const tem = new Set((comCand ?? []).map((c) => c.job_id));
    semCandidatura = publicadas.filter((v) => !tem.has(v.id)).length;
  }

  const acoes: Acao[] = [
    {
      chave: "fila",
      rotulo: "Conversas na fila",
      dica: "Candidatos esperando alguém assumir",
      valor: fila,
      href: "/admin/conversas?filtro=fila",
    },
    {
      chave: "nao-lidas",
      rotulo: "Mensagens não lidas",
      dica: operador ? "Nas suas conversas e na fila" : "Em todas as conversas da carteira",
      valor: naoLidas,
      href: "/admin/conversas?filtro=nao-lidas",
    },
    {
      chave: "hoje",
      rotulo: "Compromissos hoje",
      dica: "Entrevistas e tarefas da sua agenda",
      valor: compromissosHoje,
      href: "/admin/agenda",
    },
    {
      chave: "parados",
      rotulo: "Candidaturas paradas 7+ dias",
      dica: "Sem mudança de etapa",
      valor: paradas,
      href: "/admin?detalhe=parados",
    },
    {
      chave: "sem-candidatura",
      rotulo: "Vagas sem candidato há 5+ dias",
      dica: "Publicadas e sem nenhuma candidatura",
      valor: semCandidatura,
      href: "/admin/vagas",
    },
    {
      chave: "followups",
      rotulo: "Follow-ups de abordagem",
      dica: "Lembretes vencidos para você enviar",
      valor: followups,
      href: "/admin/abordagens",
    },
    {
      chave: "entregas",
      rotulo: "Entregas vencendo em 3 dias",
      dica: "Prazo da vaga perto de acabar",
      valor: entregas,
      href: "/admin/agenda/entregas",
    },
  ];

  const pendentes = acoes.reduce((s, a) => s + (a.valor > 0 ? 1 : 0), 0);

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-extrabold text-text">Precisa de ação agora</h2>
        <span className="text-[11.5px] text-text-2">
          {pendentes === 0 ? "Nada pendente" : `${pendentes} ${pendentes === 1 ? "tipo de pendência" : "tipos de pendência"}`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {acoes.map((a) => {
          const alerta = a.valor > 0;
          return (
            <Link
              key={a.chave}
              href={a.href}
              className={`rounded-2xl border p-4 transition hover:shadow-sm ${
                alerta ? "border-gold-2 bg-gold-bg" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12px] font-bold text-text-2">{a.rotulo}</span>
                <span className="text-[11px] font-bold text-navy">Abrir →</span>
              </div>
              <div className={`mt-1 text-2xl font-extrabold ${alerta ? "text-gold-3" : "text-success"}`}>{a.valor}</div>
              <div className="mt-0.5 text-[11px] text-text-3">{a.dica}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
