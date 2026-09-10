import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { statusLabel, statusPillClass, safeHttpUrl } from "@/lib/format";
import type { Enums } from "@/lib/supabase/types";

const CANDIDATO_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-gold-bg text-gold-3" },
  aprovado: { label: "Aprovado", className: "bg-success-bg text-success" },
  reprovado: { label: "Reprovado", className: "bg-danger-bg text-danger" },
};

type CandidaturaRow = {
  id: string;
  status: Enums<"status_candidatura">;
  created_at: string;
  jobTitulo: string;
  jobModalidade: string;
  empresa: string;
};

export default async function CandidatoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user: admin } = await requireInternalUser("pipeline.manage");
  const client = createAdminClient();

  const [{ data: profile }, { data: authUser }, { data: applications }, { data: mensagens }] =
    await Promise.all([
      client
        .from("profiles")
        .select(
          "id, nome_completo, cidade, telefone, titulo_profissional, resumo, disponibilidade, modalidades_desejadas, modelo_trabalho, status_validacao, curriculo_url, perfil_completo_pct, created_at",
        )
        .eq("id", id)
        .maybeSingle(),
      client.auth.admin.getUserById(id),
      client
        .from("applications")
        .select("id, status, created_at, jobs(titulo, modalidade, companies(nome_fantasia, razao_social))")
        .eq("candidate_id", id)
        .order("created_at", { ascending: false }),
      client
        .from("messages")
        .select("id, conteudo, created_at, remetente_id, lida")
        .or(`remetente_id.eq.${id},destinatario_id.eq.${id}`)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (!profile) notFound();

  await client.from("audit_log").insert({
    ator_id: admin.id,
    acao: "candidato_visualizado_pelo_admin",
    objeto_tipo: "profile",
    objeto_id: id,
  });

  const candidaturas: CandidaturaRow[] = (applications ?? []).map((a) => {
    const job = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
    const company = job && (Array.isArray(job.companies) ? job.companies[0] : job.companies);
    return {
      id: a.id,
      status: a.status,
      created_at: a.created_at,
      jobTitulo: job?.titulo ?? "Vaga removida",
      jobModalidade: job?.modalidade ?? "—",
      empresa: company?.nome_fantasia ?? company?.razao_social ?? "—",
    };
  });

  const columns: DataTableColumn<CandidaturaRow>[] = [
    {
      key: "vaga",
      label: "Vaga",
      sortValue: (row) => row.jobTitulo,
      render: (row) => <span className="font-bold text-text">{row.jobTitulo}</span>,
    },
    {
      key: "empresa",
      label: "Empresa",
      sortValue: (row) => row.empresa,
      render: (row) => <span className="text-text-2">{row.empresa}</span>,
    },
    {
      key: "modalidade",
      label: "Modalidade",
      render: (row) => <span className="text-text-2 uppercase">{row.jobModalidade}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortValue: (row) => row.status,
      render: (row) => (
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusPillClass[row.status]}`}>
          {statusLabel[row.status]}
        </span>
      ),
    },
    {
      key: "data",
      label: "Data",
      sortValue: (row) => row.created_at,
      render: (row) => (
        <span className="text-text-2">{new Date(row.created_at).toLocaleDateString("pt-BR")}</span>
      ),
    },
  ];

  const statusCandidato =
    CANDIDATO_STATUS_LABEL[profile.status_validacao] ?? CANDIDATO_STATUS_LABEL.pendente;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-9 pt-7">
        <Link href="/admin/candidatos" className="text-[11.5px] font-bold text-text-3 hover:text-text-2">
          ← Voltar pra Candidatos
        </Link>
        <div className="mt-2 rounded-xl border border-gold-bg bg-gold-bg px-4 py-2.5 text-[12px] font-bold text-gold-3">
          Visualização (somente leitura) — você está vendo os dados de{" "}
          <b>{profile.nome_completo}</b>. Nenhuma ação em nome dele é feita por aqui.
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <h1 className="text-xl font-extrabold text-text">{profile.nome_completo}</h1>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusCandidato.className}`}>
            {statusCandidato.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-2">
          {authUser.user?.email ?? "—"} · {profile.telefone ?? "sem telefone"} ·{" "}
          {profile.cidade ?? "sem cidade"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-9 py-6">
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-extrabold text-text">Perfil</h3>
          <div className="grid grid-cols-2 gap-3 text-[12px] md:grid-cols-3">
            <div>
              <div className="text-[10px] font-bold uppercase text-text-3">Título profissional</div>
              <div className="text-text-2">{profile.titulo_profissional ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-text-3">Disponibilidade</div>
              <div className="text-text-2">{profile.disponibilidade ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-text-3">Modalidades desejadas</div>
              <div className="text-text-2">{(profile.modalidades_desejadas ?? []).join(", ") || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-text-3">Modelo de trabalho</div>
              <div className="text-text-2">{(profile.modelo_trabalho ?? []).join(", ") || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-text-3">Perfil completo</div>
              <div className="text-text-2">{profile.perfil_completo_pct ?? 0}%</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-text-3">Currículo</div>
              <div className="text-text-2">
                {safeHttpUrl(profile.curriculo_url) ? (
                  <a href={safeHttpUrl(profile.curriculo_url)!} target="_blank" rel="noreferrer" className="text-navy underline">
                    Ver arquivo
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
          {profile.resumo && (
            <p className="mt-3 rounded-lg bg-bg p-3 text-[12px] leading-relaxed text-text-2">{profile.resumo}</p>
          )}
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-extrabold text-text">Candidaturas ({candidaturas.length})</h3>
          {candidaturas.length === 0 ? (
            <p className="text-[12px] text-text-2">Nenhuma candidatura ainda.</p>
          ) : (
            <DataTable columns={columns} rows={candidaturas} rowKey={(row) => row.id} />
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-extrabold text-text">Mensagens ({mensagens?.length ?? 0})</h3>
          {!mensagens || mensagens.length === 0 ? (
            <p className="text-[12px] text-text-2">Nenhuma mensagem ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {mensagens.map((m) => (
                <div key={m.id} className="rounded-xl border border-border bg-surface p-3 text-[12px]">
                  <div className="flex items-center justify-between text-[10.5px] text-text-3">
                    <span>{m.remetente_id === id ? "Candidato" : "Equipe interna"}</span>
                    <span>{new Date(m.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="mt-1 text-text-2">{m.conteudo}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
