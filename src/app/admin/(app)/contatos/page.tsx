import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { candidatosVisiveis, obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import { statusLabel, statusPillClass, STATUS_CANDIDATURA_EM_ABERTO } from "@/lib/format";
import { formatarTelefoneBR, linkWhatsApp } from "@/lib/whatsapp";

const LIMITE = 40;

/** Remove caracteres com significado na sintaxe de filtro do PostgREST. */
function limpar(v: string | undefined): string {
  return (v ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
}

export default async function ContatosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const sp = await searchParams;
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);
  const q = limpar(sp.q);
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const offset = (page - 1) * LIMITE;

  const visiveis = await candidatosVisiveis(escopo);
  const vagasIds = await vagasVisiveis(escopo);

  let consulta = admin
    .from("profiles")
    .select("id, nome_completo, telefone, cidade", { count: "exact" });
  if (visiveis) consulta = consulta.in("id", visiveis);
  if (q) consulta = consulta.or(`nome_completo.ilike.%${q}%,telefone.ilike.%${q}%`);
  const { data: perfis, count } = await consulta.order("nome_completo").range(offset, offset + LIMITE - 1);

  const ids = (perfis ?? []).map((p) => p.id);
  let qa = admin
    .from("applications")
    .select("candidate_id, job_id, status, updated_at, jobs(titulo)")
    .in("candidate_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    .order("updated_at", { ascending: false });
  if (vagasIds) qa = qa.in("job_id", vagasIds);
  const { data: apps } = await qa;

  const ultima = new Map<string, NonNullable<typeof apps>[number]>();
  const emAndamento = new Set<string>();
  for (const a of apps ?? []) {
    if (!ultima.has(a.candidate_id)) ultima.set(a.candidate_id, a);
    if (STATUS_CANDIDATURA_EM_ABERTO.includes(a.status)) emAndamento.add(a.candidate_id);
  }

  // Auditoria leve: quem abriu a lista de contatos e quantos nomes viu.
  await admin.from("audit_log").insert({
    ator_id: user.id,
    acao: "contatos_visualizados",
    objeto_tipo: "contatos",
    depois: { pagina: page, busca: q || null, quantidade: ids.length },
  });

  const totalPages = Math.ceil((count ?? 0) / LIMITE);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Contatos</h1>
        <p className="mt-1 text-xs text-text-2">
          Nome, telefone, vaga e etapa. Toque no telefone para abrir a conversa no WhatsApp.
          {role !== "superadmin" && role !== "admin" &&
            " O telefone aparece enquanto o candidato tem candidatura em andamento na sua carteira."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <form className="mb-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou telefone"
            className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-[13px]"
          />
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white">
            Buscar
          </button>
        </form>

        <p className="mb-3 text-xs text-text-2">
          Total: {count ?? 0} | Página {page} de {totalPages || 1}
        </p>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="grid grid-cols-4 gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3">
            <div>Nome</div>
            <div>Telefone</div>
            <div>Vaga</div>
            <div>Etapa</div>
          </div>
          {(perfis ?? []).length === 0 && (
            <div className="px-5 py-6 text-xs text-text-2">Nenhum contato encontrado.</div>
          )}
          {(perfis ?? []).map((p) => {
            const ap = ultima.get(p.id);
            const job = ap ? (Array.isArray(ap.jobs) ? ap.jobs[0] : ap.jobs) : null;
            // Operador: contato só enquanto houver candidatura em andamento.
            const mostraTelefone = !visiveis || emAndamento.has(p.id);
            const wa = mostraTelefone ? linkWhatsApp(p.telefone) : null;
            return (
              <div
                key={p.id}
                className="grid grid-cols-4 items-center gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none"
              >
                <Link href={`/admin/candidatos/${p.id}`} className="truncate font-bold text-navy underline">
                  {p.nome_completo}
                </Link>
                <div className="truncate">
                  {!mostraTelefone ? (
                    <span className="text-text-3">Liberado com candidatura em andamento</span>
                  ) : wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-success underline"
                      title="Abrir conversa no WhatsApp"
                    >
                      {formatarTelefoneBR(p.telefone)}
                    </a>
                  ) : (
                    <span className="text-text-2">{p.telefone?.trim() || "—"}</span>
                  )}
                </div>
                <div className="truncate text-text-2">{job?.titulo ?? "Sem candidatura"}</div>
                <div>
                  {ap ? (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusPillClass[ap.status]}`}
                    >
                      {statusLabel[ap.status]}
                    </span>
                  ) : (
                    <span className="text-text-3">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/contatos" />
      </div>
    </div>
  );
}
