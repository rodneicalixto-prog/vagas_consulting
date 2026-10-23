import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nomeEmpresa, revelaEmpresa } from "@/lib/sigilo";
import { statusLabel } from "@/lib/format";
import { Card } from "@/components/ui";
import { SubmitButton } from "@/components/form-buttons";
import { responderEntrevistaOnline } from "./entrevista-actions";

const AVISOS_ENTREVISTA: Record<string, string> = {
  confirmada: "Entrevista confirmada. O link da reunião está abaixo.",
  recusada: "Você recusou a entrevista. A equipe vai propor outro horário.",
  "ja-respondida": "Esta entrevista já foi respondida.",
  indisponivel: "Não foi possível responder esta entrevista.",
};

function formatarBrasilia(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Passo = { status: string; quando: string | null };

const APROVADO = new Set(["contratado"]);
const NAO_APROVADO = new Set(["rejeitada", "reprovado_cliente"]);

function formatar(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function LinhaDoTempoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ entrevista?: string }>;
}) {
  const { id } = await params;
  const { entrevista: avisoEntrevista } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A leitura passa pela RLS do candidato: candidatura de outra pessoa => 404.
  const { data: candidatura } = await supabase
    .from("applications")
    .select("id, status, created_at, jobs(titulo, confidencial, companies(nome_fantasia, razao_social))")
    .eq("id", id)
    .eq("candidate_id", user!.id)
    .maybeSingle();
  if (!candidatura) notFound();

  // Entrevista online ativa (proposta ou confirmada). A RLS deixa o candidato ler só as dele.
  const { data: entrevistaAtiva } = await supabase
    .from("entrevistas_online")
    .select("id, data_hora, link, status")
    .eq("application_id", id)
    .in("status", ["proposta", "confirmada"])
    .maybeSingle();

  // Histórico de etapas: o candidato não lê o audit_log, então a leitura é
  // feita no servidor, só depois de confirmada a posse da candidatura acima.
  const admin = createAdminClient();
  const { data: eventos } = await admin
    .from("audit_log")
    .select("depois, created_at")
    .eq("objeto_tipo", "application")
    .eq("objeto_id", id)
    .eq("acao", "candidatura_status_alterado")
    .order("created_at", { ascending: true });

  const passos: Passo[] = [{ status: "recebida", quando: candidatura.created_at }];
  for (const e of eventos ?? []) {
    const status = (e.depois as { status?: string } | null)?.status;
    if (status && status !== passos[passos.length - 1].status) {
      passos.push({ status, quando: e.created_at });
    }
  }
  // Dado antigo sem evento registrado: garante que a etapa atual apareça.
  if (passos[passos.length - 1].status !== candidatura.status) {
    passos.push({ status: candidatura.status, quando: null });
  }

  // "Revelado fica revelado": se em algum momento chegou à etapa que revela a
  // empresa, o nome continua visível mesmo depois do desfecho.
  const jaRevelada = passos.some((p) => revelaEmpresa(p.status));
  const empresa = nomeEmpresa(
    candidatura.jobs?.companies,
    candidatura.jobs?.confidencial,
    jaRevelada ? "entrevista" : candidatura.status,
  );

  const final = passos[passos.length - 1].status;
  const desfecho = APROVADO.has(final) ? "Aprovado" : NAO_APROVADO.has(final) ? "Não aprovado" : null;

  return (
    <div className="flex flex-col gap-4 px-5 pb-8 pt-6 md:px-8 md:pt-8">
      <Link href="/processos" className="text-[12px] font-bold text-navy underline">
        ← Meus processos
      </Link>
      <div>
        <h1 className="text-[19px] font-extrabold text-navy">{candidatura.jobs?.titulo}</h1>
        <div className="text-[12px] text-text-2">{empresa}</div>
      </div>

      {avisoEntrevista && AVISOS_ENTREVISTA[avisoEntrevista] && (
        <p className="rounded-xl bg-navy-bg px-4 py-3 text-[12.5px] font-bold text-navy">
          {AVISOS_ENTREVISTA[avisoEntrevista]}
        </p>
      )}

      {entrevistaAtiva?.status === "proposta" && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-[14px] font-extrabold text-navy">Entrevista online proposta</h2>
          <p className="text-[13px] text-text">
            {formatarBrasilia(entrevistaAtiva.data_hora)} (horário de Brasília)
          </p>
          <p className="text-[12px] text-text-2">
            Confirme se você consegue participar. O link da reunião aparece aqui depois da confirmação.
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={responderEntrevistaOnline}>
              <input type="hidden" name="entrevista_id" value={entrevistaAtiva.id} />
              <input type="hidden" name="application_id" value={id} />
              <input type="hidden" name="acao" value="confirmar" />
              <SubmitButton
                pendingLabel="Enviando…"
                className="rounded-xl bg-gold px-4 py-2.5 text-[13px] font-extrabold text-[#1c1508]"
              >
                Confirmar entrevista
              </SubmitButton>
            </form>
            <form action={responderEntrevistaOnline}>
              <input type="hidden" name="entrevista_id" value={entrevistaAtiva.id} />
              <input type="hidden" name="application_id" value={id} />
              <input type="hidden" name="acao" value="recusar" />
              <SubmitButton
                pendingLabel="Enviando…"
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-[13px] font-bold text-navy"
              >
                Não consigo participar
              </SubmitButton>
            </form>
          </div>
        </Card>
      )}

      {entrevistaAtiva?.status === "confirmada" && (
        <Card className="flex flex-col gap-2">
          <h2 className="text-[14px] font-extrabold text-navy">Entrevista online confirmada</h2>
          <p className="text-[13px] text-text">{formatarBrasilia(entrevistaAtiva.data_hora)} (horário de Brasília)</p>
          <a
            href={entrevistaAtiva.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-bold text-navy underline break-all"
          >
            Entrar na reunião
          </a>
        </Card>
      )}

      <Card className="flex flex-col gap-0">
        <ol className="flex flex-col">
          {passos.map((p, i) => {
            const ultimo = i === passos.length - 1;
            return (
              <li key={`${p.status}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 h-3 w-3 shrink-0 rounded-full ${ultimo ? "bg-gold" : "bg-navy"}`}
                  />
                  {!ultimo && <span className="w-px flex-1 bg-border" />}
                </div>
                <div className="pb-4">
                  <div className={`text-[13px] ${ultimo ? "font-extrabold text-navy" : "font-bold text-text"}`}>
                    {p.status === "recebida" ? "Candidatura enviada" : statusLabel[p.status as keyof typeof statusLabel]}
                    {ultimo && <span className="ml-2 text-[10.5px] font-bold text-gold-3">Etapa atual</span>}
                  </div>
                  {p.quando && <div className="text-[11px] text-text-3">{formatar(p.quando)}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {desfecho && (
        <p className="rounded-xl bg-navy-bg px-4 py-3 text-[12.5px] text-text-2">
          <b className="text-navy">Resultado: {desfecho}.</b> Isso não impede você de se candidatar a outras
          oportunidades, inclusive nesta mesma empresa.
        </p>
      )}
    </div>
  );
}
