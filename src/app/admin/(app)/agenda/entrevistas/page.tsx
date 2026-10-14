import Link from "next/link";
import { requireInternalUser } from "@/lib/auth/internal";
import { carregarEntrevistas } from "@/lib/agenda";
import { CalendarioMes } from "@/components/calendario-mes";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/data-table";
import { statusLabel } from "@/lib/format";

const MES_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

function agoraMs(): number {
  return Date.now();
}

function dataHora(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export default async function AgendaEntrevistasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const sp = await searchParams;
  const agora = agoraMs();
  const entrevistas = await carregarEntrevistas(user.id, role, 60, agora);

  const hoje = new Date(agora);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const hojeChave = `${hoje.getUTCFullYear()}-${p2(hoje.getUTCMonth() + 1)}-${p2(hoje.getUTCDate())}`;
  const m = MES_RE.exec(sp.mes ?? "");
  const ano = m ? Number(m[1]) : hoje.getUTCFullYear();
  const mes = m ? Number(m[2]) - 1 : hoje.getUTCMonth();
  const chaveMes = (a: number, mm: number) => `${a}-${p2(mm + 1)}`;

  const colunas: DataTableColumn[] = [
    { key: "quando", label: "Quando", sortable: true },
    { key: "candidato", label: "Candidato", sortable: true },
    { key: "vaga", label: "Vaga", sortable: true },
    { key: "etapa", label: "Etapa atual", sortable: true },
    { key: "resp", label: "Responsável", sortable: true },
    { key: "status", label: "Situação", sortable: true },
  ];
  const linhas: DataTableRow[] = entrevistas.map((e) => ({
    id: e.id,
    sortValues: {
      quando: e.inicio,
      candidato: e.candidato,
      vaga: e.vaga,
      etapa: e.etapa ?? "",
      resp: e.responsavel,
      status: e.status,
    },
    cells: {
      quando: <span className="font-bold text-text">{dataHora(e.inicio)}</span>,
      candidato: e.candidatoId ? (
        <Link href={`/admin/candidatos/${e.candidatoId}`} className="font-bold text-navy underline">
          {e.candidato}
        </Link>
      ) : (
        <span className="text-text-2">{e.titulo}</span>
      ),
      vaga: <span className="text-text-2">{e.vaga === "—" ? "—" : `${e.vaga} — ${e.empresa}`}</span>,
      etapa: (
        <span className="text-text-2">
          {e.etapa ? (statusLabel[e.etapa as keyof typeof statusLabel] ?? e.etapa) : "—"}
        </span>
      ),
      resp: <span className="text-text-2">{e.responsavel}</span>,
      status: <span className="text-text-2">{e.status}</span>,
    },
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-text">Agenda de entrevistas</h1>
          <Link href="/admin/agenda" className="text-[11.5px] font-bold text-text-3 hover:text-text-2">
            ← Minha agenda
          </Link>
        </div>
        <p className="mt-1 text-xs text-text-2">
          {role === "operador"
            ? "Entrevistas das vagas da sua carteira e as que você marcou"
            : "Entrevistas de todas as empresas"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <div className="mb-6">
          <CalendarioMes
            ano={ano}
            mes={mes}
            eventos={entrevistas.map((e) => ({
              id: e.id,
              titulo: e.candidato !== "—" ? e.candidato : e.titulo,
              tipo: "entrevista",
              inicio: e.inicio,
              status: e.status,
            }))}
            hojeChave={hojeChave}
            hrefDia={(dia) => `/admin/agenda?mes=${chaveMes(ano, mes)}&data=${dia}#novo`}
            hrefMes={(alvo) => {
              if (alvo === "hoje") return "/admin/agenda/entrevistas";
              const d = new Date(Date.UTC(ano, mes + (alvo === "proximo" ? 1 : -1), 1));
              return `/admin/agenda/entrevistas?mes=${chaveMes(d.getUTCFullYear(), d.getUTCMonth())}`;
            }}
          />
        </div>

        {linhas.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-5 py-6 text-xs text-text-2">
            Nenhuma entrevista nos últimos 60 dias ou agendada.
          </p>
        ) : (
          <DataTable columns={colunas} rows={linhas} />
        )}
      </div>
    </div>
  );
}
