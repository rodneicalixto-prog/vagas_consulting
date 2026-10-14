import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";

const LIMITE_LINHAS = 5000;

function haSeteDias(): number {
  return Date.now() - 7 * 24 * 3600_000;
}

type Linha = {
  candidate_id: string;
  job_id: string;
  status: string;
  created_at: string;
  jobs: {
    titulo: string;
    company_id: string | null;
    companies: { nome_fantasia: string | null; razao_social: string } | { nome_fantasia: string | null; razao_social: string }[] | null;
  } | null;
};

function empresaDe(l: Linha): { id: string; nome: string } {
  const c = l.jobs?.companies;
  const emp = Array.isArray(c) ? c[0] : c;
  return {
    id: l.jobs?.company_id ?? "sem-empresa",
    nome: emp?.nome_fantasia ?? emp?.razao_social ?? "Empresa não identificada",
  };
}

export default async function RankingPage() {
  await requireInternalUser("platform.data");
  const admin = createAdminClient();

  const { data, count } = await admin
    .from("applications")
    .select("candidate_id, job_id, status, created_at, jobs(titulo, company_id, companies(nome_fantasia, razao_social))", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(LIMITE_LINHAS);

  const linhas = (data ?? []) as unknown as Linha[];
  const truncado = (count ?? 0) > linhas.length;

  const porCandidato = new Map<string, { total: number; empresas: Set<string>; vagas: Set<string> }>();
  const porVaga = new Map<string, { titulo: string; empresa: string; total: number }>();
  const porEmpresa = new Map<string, { nome: string; total: number; vagas: Set<string> }>();

  for (const l of linhas) {
    const emp = empresaDe(l);
    const c = porCandidato.get(l.candidate_id) ?? { total: 0, empresas: new Set(), vagas: new Set() };
    c.total += 1;
    c.empresas.add(emp.id);
    c.vagas.add(l.job_id);
    porCandidato.set(l.candidate_id, c);

    const v = porVaga.get(l.job_id) ?? { titulo: l.jobs?.titulo ?? "Vaga removida", empresa: emp.nome, total: 0 };
    v.total += 1;
    porVaga.set(l.job_id, v);

    const e = porEmpresa.get(emp.id) ?? { nome: emp.nome, total: 0, vagas: new Set() };
    e.total += 1;
    e.vagas.add(l.job_id);
    porEmpresa.set(emp.id, e);
  }

  const topCandidatos = [...porCandidato.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 20);
  const topVagas = [...porVaga.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 20);
  const topEmpresas = [...porEmpresa.values()].sort((a, b) => b.total - a.total);

  const ids = topCandidatos.map(([id]) => id);
  const { data: perfis } = ids.length
    ? await admin.from("profiles").select("id, nome_completo, cidade").in("id", ids)
    : { data: [] as { id: string; nome_completo: string; cidade: string | null }[] };
  const perfil = new Map((perfis ?? []).map((p) => [p.id, p]));

  const seteDias = haSeteDias();
  const novas7d = linhas.filter((l) => new Date(l.created_at).getTime() >= seteDias).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <h1 className="text-xl font-extrabold text-text">Ranking de candidaturas</h1>
        <p className="mt-1 text-xs text-text-2">
          Quem mais se candidata, vagas mais disputadas e volume por empresa. O mesmo candidato pode concorrer a várias
          vagas e empresas ao mesmo tempo.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <Resumo rotulo="Candidaturas" valor={count ?? 0} />
          <Resumo rotulo="Últimos 7 dias" valor={novas7d} />
          <Resumo rotulo="Candidatos distintos" valor={porCandidato.size} />
          <Resumo rotulo="Empresas com candidaturas" valor={porEmpresa.size} />
        </div>
        {truncado && (
          <p className="mb-4 rounded-xl bg-gold-bg px-4 py-3 text-xs text-text-2">
            Mostrando as {LIMITE_LINHAS} candidaturas mais recentes de {count}.
          </p>
        )}

        <Secao titulo="Candidatos com mais candidaturas">
          {topCandidatos.length === 0 && <Vazio />}
          {topCandidatos.map(([id, c]) => (
            <Linha3
              key={id}
              a={
                <Link href={`/admin/candidatos/${id}`} className="font-bold text-navy underline">
                  {perfil.get(id)?.nome_completo ?? `#${id.slice(0, 8)}`}
                </Link>
              }
              b={perfil.get(id)?.cidade ?? "—"}
              c={`${c.total} candidaturas · ${c.empresas.size} empresa(s)`}
            />
          ))}
        </Secao>

        <Secao titulo="Vagas mais disputadas">
          {topVagas.length === 0 && <Vazio />}
          {topVagas.map(([id, v]) => (
            <Linha3 key={id} a={<span className="font-bold text-text">{v.titulo}</span>} b={v.empresa} c={`${v.total} candidaturas`} />
          ))}
        </Secao>

        <Secao titulo="Volume por empresa">
          {topEmpresas.length === 0 && <Vazio />}
          {topEmpresas.map((e) => (
            <Linha3
              key={e.nome}
              a={<span className="font-bold text-text">{e.nome}</span>}
              b={`${e.vagas.size} vaga(s)`}
              c={`${e.total} candidaturas`}
            />
          ))}
        </Secao>
      </div>
    </div>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-[10.5px] font-extrabold uppercase text-text-3">{rotulo}</div>
      <div className="mt-1 text-2xl font-extrabold text-text">{valor}</div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
      <h3 className="border-b border-border px-5 py-3 text-sm font-extrabold text-text">{titulo}</h3>
      {children}
    </div>
  );
}

function Linha3({ a, b, c }: { a: React.ReactNode; b: string; c: string }) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none">
      <div>{a}</div>
      <div className="text-text-2">{b}</div>
      <div className="text-right font-bold text-text">{c}</div>
    </div>
  );
}

function Vazio() {
  return <div className="px-5 py-6 text-xs text-text-2">Ainda não há candidaturas.</div>;
}
