import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import { SubmitButton } from "@/components/form-buttons";
import { STATUS_CANDIDATURA_EM_ABERTO } from "@/lib/format";
import { criarCompromisso, atualizarStatusCompromisso, excluirCompromisso } from "./actions";
import { CalendarioMes } from "@/components/calendario-mes";

const STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_CLASS: Record<string, string> = {
  agendado: "bg-navy-bg text-navy",
  concluido: "bg-success-bg text-success",
  cancelado: "bg-danger-bg text-danger",
};

function agoraMs(): number {
  return Date.now();
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MES_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; data?: string; modo?: string }>;
}) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const sp = await searchParams;
  const admin = createAdminClient();
  // Carteira: o seletor de candidaturas só oferece vagas do escopo.
  const vagasIds = await vagasVisiveis(await obterEscopo(user.id, role));
  let consultaCandidaturas = admin
    .from("applications")
    .select("id, candidate_id, status, jobs(titulo, companies(razao_social, nome_fantasia))")
    .in("status", STATUS_CANDIDATURA_EM_ABERTO);
  if (vagasIds) consultaCandidaturas = consultaCandidaturas.in("job_id", vagasIds);

  const [{ data: compromissos }, { data: candidaturasAbertas }] = await Promise.all([
    admin
      .from("compromissos")
      .select("id, titulo, tipo, descricao, inicio, fim, status, application_id")
      .eq("responsavel_id", user.id)
      .order("inicio", { ascending: true }),
    consultaCandidaturas.order("created_at", { ascending: false }).limit(50),
  ]);

  const candidateIds = [...new Set((candidaturasAbertas ?? []).map((c) => c.candidate_id))];
  const { data: candidatosPerfis } = candidateIds.length
    ? await admin.from("profiles").select("id, nome_completo").in("id", candidateIds)
    : { data: [] };
  const nomePorCandidato = new Map((candidatosPerfis ?? []).map((p) => [p.id, p.nome_completo]));

  const opcoesCandidatura = (candidaturasAbertas ?? []).map((c) => {
    const job = Array.isArray(c.jobs) ? c.jobs[0] : c.jobs;
    const company = job ? (Array.isArray(job.companies) ? job.companies[0] : job.companies) : null;
    return {
      id: c.id,
      label: `${nomePorCandidato.get(c.candidate_id) ?? "Candidato"} — ${job?.titulo ?? "Vaga"} (${company?.nome_fantasia ?? company?.razao_social ?? "—"})`,
    };
  });

  const agora = agoraMs();

  // Calendário: mês pedido (?mes=AAAA-MM) ou o atual; dia clicado preenche o formulário.
  const hoje = new Date(agora);
  const hojeChave = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}-${String(hoje.getUTCDate()).padStart(2, "0")}`;
  const m = MES_RE.exec(sp.mes ?? "");
  const ano = m ? Number(m[1]) : hoje.getUTCFullYear();
  const mes = m ? Number(m[2]) - 1 : hoje.getUTCMonth();
  const dataEscolhida = DATA_RE.test(sp.data ?? "") ? (sp.data as string) : "";
  const modo = sp.modo === "lista" ? "lista" : "calendario";
  const chaveMes = (a: number, mm: number) => `${a}-${String(mm + 1).padStart(2, "0")}`;
  const hrefMes = (alvo: "anterior" | "proximo" | "hoje") => {
    if (alvo === "hoje") return "/admin/agenda";
    const d = new Date(Date.UTC(ano, mes + (alvo === "proximo" ? 1 : -1), 1));
    return `/admin/agenda?mes=${chaveMes(d.getUTCFullYear(), d.getUTCMonth())}`;
  };
  const hrefDia = (dia: string) => `/admin/agenda?mes=${chaveMes(ano, mes)}&data=${dia}#novo`;

  const proximos = (compromissos ?? []).filter(
    (c) => c.status === "agendado" && new Date(c.inicio).getTime() >= agora - 60 * 60 * 1000,
  );
  const passados = (compromissos ?? []).filter(
    (c) => c.status !== "agendado" || new Date(c.inicio).getTime() < agora - 60 * 60 * 1000,
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-text">Minha agenda</h1>
          {role === "superadmin" && (
            <Link
              href="/admin/agenda/equipe"
              className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-text-2 hover:border-navy hover:text-navy"
            >
              Ver agenda da equipe →
            </Link>
          )}
        </div>
        <p className="mt-1 text-xs text-text-2">Entrevistas e compromissos internos</p>
        <div className="mt-3 flex gap-2">
          <Link
            href="/admin/agenda"
            className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
              modo === "calendario" ? "border-navy bg-navy text-white" : "border-border bg-surface text-text-2"
            }`}
          >
            Calendário
          </Link>
          <Link
            href="/admin/agenda?modo=lista"
            className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold ${
              modo === "lista" ? "border-navy bg-navy text-white" : "border-border bg-surface text-text-2"
            }`}
          >
            Lista
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        {modo === "calendario" && (
          <div className="mb-6">
            <CalendarioMes
              ano={ano}
              mes={mes}
              eventos={(compromissos ?? []).map((c) => ({
                id: c.id,
                titulo: c.titulo,
                tipo: c.tipo,
                inicio: c.inicio,
                status: c.status,
              }))}
              hojeChave={hojeChave}
              hrefDia={hrefDia}
              hrefMes={hrefMes}
            />
          </div>
        )}

        <form id="novo" action={criarCompromisso} className="mb-6 grid scroll-mt-4 gap-3 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
          <h2 className="text-sm font-extrabold text-text md:col-span-2">Novo compromisso</h2>
          <input name="titulo" required placeholder="Título" className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
          <select name="tipo" defaultValue="interno" className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm">
            <option value="interno">Compromisso interno</option>
            <option value="entrevista">Entrevista com candidato</option>
          </select>
          <div className="grid grid-cols-2 gap-2 md:col-span-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-text-3">Início</label>
              <div className="flex gap-2">
                <input type="date" name="data_inicio" required defaultValue={dataEscolhida} className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
                <input type="time" name="hora_inicio" required className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-text-3">Fim (opcional)</label>
              <div className="flex gap-2">
                <input type="date" name="data_fim" className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
                <input type="time" name="hora_fim" className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm" />
              </div>
            </div>
          </div>
          <select name="application_id" defaultValue="" className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm md:col-span-2">
            <option value="">Vincular a uma candidatura em aberto (opcional, só para entrevista)</option>
            {opcoesCandidatura.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <textarea
            name="descricao"
            placeholder="Descrição (opcional)"
            rows={2}
            className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm md:col-span-2"
          />
          <SubmitButton
            pendingLabel="Salvando..."
            className="rounded-lg bg-navy px-4 py-2.5 text-sm font-extrabold text-white md:col-span-2"
          >
            Criar compromisso
          </SubmitButton>
        </form>

        <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-text-3">Próximos</h3>
        {proximos.length === 0 ? (
          <p className="mb-6 text-sm text-text-2">Nenhum compromisso agendado.</p>
        ) : (
          <div className="mb-6 flex flex-col gap-3">
            {proximos.map((c) => (
              <CompromissoCard key={c.id} compromisso={c} />
            ))}
          </div>
        )}

        {passados.length > 0 && (
          <>
            <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-text-3">Anteriores</h3>
            <div className="flex flex-col gap-3">
              {passados.map((c) => (
                <CompromissoCard key={c.id} compromisso={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CompromissoCard({
  compromisso,
}: {
  compromisso: {
    id: string;
    titulo: string;
    tipo: string;
    descricao: string | null;
    inicio: string;
    fim: string | null;
    status: string;
  };
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <span className="rounded-md bg-navy-bg px-2 py-1 text-[9.5px] font-extrabold uppercase text-navy">
          {compromisso.tipo === "entrevista" ? "Entrevista" : "Interno"}
        </span>
        <h4 className="text-[13.5px] font-extrabold text-text">{compromisso.titulo}</h4>
        <span className={`ml-auto rounded-full px-2 py-1 text-[10px] font-extrabold ${STATUS_CLASS[compromisso.status]}`}>
          {STATUS_LABEL[compromisso.status]}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-text-2">{formatarDataHora(compromisso.inicio)}</p>
      {compromisso.descricao && <p className="mt-2 text-[12px] text-text-2">{compromisso.descricao}</p>}
      {compromisso.status === "agendado" && (
        <div className="mt-3 flex gap-2">
          <form action={atualizarStatusCompromisso}>
            <input type="hidden" name="compromisso_id" value={compromisso.id} />
            <input type="hidden" name="status" value="concluido" />
            <SubmitButton
              pendingLabel="..."
              className="rounded-lg bg-success px-3 py-2 text-[11.5px] font-extrabold text-white"
            >
              Concluir
            </SubmitButton>
          </form>
          <form action={atualizarStatusCompromisso}>
            <input type="hidden" name="compromisso_id" value={compromisso.id} />
            <input type="hidden" name="status" value="cancelado" />
            <SubmitButton
              pendingLabel="..."
              className="rounded-lg border border-border bg-bg px-3 py-2 text-[11.5px] font-extrabold text-text-2"
            >
              Cancelar
            </SubmitButton>
          </form>
          <form action={excluirCompromisso}>
            <input type="hidden" name="compromisso_id" value={compromisso.id} />
            <SubmitButton
              pendingLabel="..."
              className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-[11.5px] font-extrabold text-danger"
            >
              Excluir
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}
