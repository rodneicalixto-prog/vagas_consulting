import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { arquivoDaRota, corteDeRetencao } from "@/lib/ajuda";
import { temasSemResposta } from "@/lib/base-conhecimento";

export const maxDuration = 60;

const ROTULO_PAPEL: Record<string, string> = {
  operador: "Operador",
  admin_empresa: "Admin da empresa",
  admin: "Administrador",
  superadmin: "Superadmin",
};

function agoraMs(): number {
  return Date.now();
}

/** Lacunas do manual: o que a equipe perguntou e o assistente não resolveu. */
export default async function AjudaLacunasPage() {
  const { role } = await requireInternalUser();
  if (role !== "superadmin") redirect("/admin/acesso-negado");

  const admin = createAdminClient();
  const { data } = await admin
    .from("help_questions")
    .select("id, papel, rota, pergunta, sem_resposta, util, created_at")
    .gte("created_at", corteDeRetencao(new Date(agoraMs())))
    .order("created_at", { ascending: false })
    .limit(1000);
  const linhas = data ?? [];

  const total = linhas.length;
  const semResposta = linhas.filter((l) => l.sem_resposta).length;
  const util = linhas.filter((l) => l.util === true).length;
  const naoUtil = linhas.filter((l) => l.util === false).length;
  const problemas = linhas.filter((l) => l.sem_resposta || l.util === false);
  const temas = temasSemResposta(problemas.map((l) => l.pergunta), 2, 10);

  const porCapitulo = new Map<string, { total: number; problemas: number }>();
  for (const l of linhas) {
    const cap = arquivoDaRota(l.rota) ?? "(tela sem capítulo)";
    const v = porCapitulo.get(cap) ?? { total: 0, problemas: 0 };
    v.total += 1;
    if (l.sem_resposta || l.util === false) v.problemas += 1;
    porCapitulo.set(cap, v);
  }
  const capitulos = [...porCapitulo.entries()].sort((a, b) => b[1].problemas - a[1].problemas || b[1].total - a[1].total);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href="/admin/agente" className="text-[11.5px] font-bold text-navy underline">← Agente de IA</Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Lacunas do manual (Ajuda)</h1>
        <p className="mt-1 text-xs text-text-2">
          Perguntas feitas à Ajuda nos últimos 90 dias, anonimizadas. Cada pergunta sem resposta ou marcada com
          &quot;Não ajudou&quot; é um tópico que falta ou está confuso no manual.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6 grid gap-5">
        <section className="grid gap-3 md:grid-cols-4">
          {[
            ["Perguntas", total],
            ["Sem resposta", semResposta],
            ["Ajudou", util],
            ["Não ajudou", naoUtil],
          ].map(([rotulo, valor]) => (
            <div key={rotulo as string} className="rounded-2xl border border-border bg-surface p-4">
              <div className="text-[11px] font-bold text-text-2">{rotulo}</div>
              <div className="mt-1 text-2xl font-extrabold text-text">{valor}</div>
            </div>
          ))}
        </section>

        {temas.length > 0 && (
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-2 text-sm font-extrabold text-text">Temas que mais se repetem nos problemas</h2>
            <p className="text-[12.5px] text-text-2">
              {temas.map((t) => `${t.termo} (${t.vezes})`).join(", ")}. Vale escrever ou melhorar o tópico.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-extrabold text-text">Por capítulo da tela de origem</h2>
          {capitulos.length === 0 ? (
            <p className="text-[12.5px] text-text-2">Ainda não há perguntas.</p>
          ) : (
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase text-text-3">
                  <th className="py-1">Capítulo</th>
                  <th>Perguntas</th>
                  <th>Com problema</th>
                </tr>
              </thead>
              <tbody>
                {capitulos.map(([cap, v]) => (
                  <tr key={cap} className="border-t border-border">
                    <td className="py-1.5">{cap}</td>
                    <td>{v.total}</td>
                    <td className={v.problemas > 0 ? "font-bold text-danger" : ""}>{v.problemas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-extrabold text-text">Perguntas com problema (mais recentes)</h2>
          {problemas.length === 0 ? (
            <p className="text-[12.5px] text-text-2">Nenhuma pergunta sem resposta ou marcada como não útil.</p>
          ) : (
            <ul className="grid gap-2">
              {problemas.slice(0, 40).map((l) => (
                <li key={l.id} className="rounded-xl bg-bg px-3 py-2 text-[12.5px]">
                  <p className="text-text">{l.pergunta}</p>
                  <p className="mt-0.5 text-[11px] text-text-3">
                    {ROTULO_PAPEL[l.papel] ?? l.papel} · {l.rota || "sem tela"} ·{" "}
                    {l.sem_resposta ? "sem resposta" : "não ajudou"} ·{" "}
                    {new Date(l.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
