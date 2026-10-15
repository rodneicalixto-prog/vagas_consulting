import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { SubmitButton } from "@/components/form-buttons";
import {
  ROTULO_SENIORIDADE,
  SENIORIDADES,
  normalizarCriterios,
  obrigatoriosParaTexto,
  temBloqueio,
  verificarVaga,
  type NivelVerificacao,
} from "@/lib/vaga-estruturada";
import { salvarCriterios } from "../actions";
import { GerarComIA } from "./gerar-com-ia";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAMPO = "w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-navy";

const COR: Record<NivelVerificacao, string> = {
  ok: "bg-success-bg text-success",
  aviso: "bg-gold-bg text-gold-3",
  bloqueio: "bg-danger-bg text-danger",
};
const ROTULO: Record<NivelVerificacao, string> = { ok: "OK", aviso: "Aviso", bloqueio: "Bloqueia" };

export default async function CriteriosDaVagaPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, role } = await requireInternalUser("jobs.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const escopo = await obterEscopo(user.id, role);
  await exigirVaga(escopo, id);

  const admin = createAdminClient();
  const { data: vaga } = await admin
    .from("jobs")
    .select("id, titulo, status, local, modelo_trabalho, remuneracao_texto, descricao, requisitos, criterios, companies(nome_fantasia, razao_social)")
    .eq("id", id)
    .maybeSingle();
  if (!vaga) redirect("/admin/vagas");

  const criterios = normalizarCriterios(vaga.criterios);
  const verificacoes = verificarVaga({
    titulo: vaga.titulo,
    descricao: vaga.descricao,
    requisitos: vaga.requisitos,
    local: vaga.local,
    modelo_trabalho: vaga.modelo_trabalho,
    remuneracao_texto: vaga.remuneracao_texto,
    criterios,
  });
  const bloqueada = temBloqueio(verificacoes);
  const emp = Array.isArray(vaga.companies) ? vaga.companies[0] : vaga.companies;
  const nomeEmpresa = emp?.nome_fantasia || emp?.razao_social || "Empresa";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-9 pt-7">
        <Link href="/admin/vagas" className="text-[11.5px] font-bold text-navy underline">
          ← Cadastro de vagas
        </Link>
        <h1 className="mt-2 text-xl font-extrabold text-text">Critérios da vaga</h1>
        <Link href={`/admin/vagas/${id}/divulgacao`} className="mt-1 inline-block text-[11.5px] font-bold text-navy underline">
          Gerar divulgação desta vaga →
        </Link>
        <p className="mt-1 text-xs text-text-2">
          {vaga.titulo} · {nomeEmpresa}. Estes campos alimentam divulgação, triagem, roteiro de entrevista, testes e laudo.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-9 py-6">
        <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-text">Qualidade da vaga</h2>
            {bloqueada && (
              <span className="rounded-full bg-danger-bg px-3 py-1 text-[11px] font-extrabold text-danger">
                Publicação bloqueada
              </span>
            )}
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {verificacoes.map((v) => (
              <li key={v.id} className="flex items-start gap-2 text-[12px] text-text-2">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${COR[v.nivel]}`}>
                  {ROTULO[v.nivel]}
                </span>
                <span>{v.mensagem}</span>
              </li>
            ))}
          </ul>
        </section>

        <GerarComIA jobId={vaga.id} />

        {criterios.proposta_ia && !criterios.confirmado_em && (
          <p className="mb-4 rounded-xl bg-gold-bg px-4 py-3 text-[12.5px] font-bold text-gold-3">
            Estes campos são uma proposta da IA e ainda não foram conferidos. Revise, ajuste e clique em Salvar critérios.
          </p>
        )}
        {criterios.lacunas.length > 0 && (
          <div className="mb-4 rounded-xl bg-navy-bg px-4 py-3 text-[12.5px] text-text-2">
            <b className="text-text">Falta perguntar ao gestor:</b>
            <ul className="mt-1 list-disc pl-5">
              {criterios.lacunas.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}

        <form action={salvarCriterios} className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
          <input type="hidden" name="job_id" value={vaga.id} />

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-[10.5px] font-bold text-text-2">
              Rotina: o que a pessoa vai fazer no dia a dia (concreto, sem clichê)
            </span>
            <textarea name="rotina" defaultValue={criterios.rotina} rows={4} maxLength={3000} className={CAMPO} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">
              Requisitos obrigatórios (um por linha, de 4 a 7). Comece a linha com * para marcar como eliminatório.
            </span>
            <textarea
              name="obrigatorios"
              defaultValue={obrigatoriosParaTexto(criterios)}
              rows={8}
              className={CAMPO}
              placeholder={"* Registro profissional ativo\nExperiência com atendimento ao público\nDisponibilidade para turno"}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">Desejáveis (um por linha: contam ponto, não eliminam)</span>
            <textarea name="desejaveis" defaultValue={criterios.desejaveis.join("\n")} rows={8} className={CAMPO} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">
              Competências comportamentais (uma por linha; são avaliadas na entrevista)
            </span>
            <textarea
              name="comportamentais"
              defaultValue={criterios.comportamentais.join("\n")}
              rows={5}
              className={CAMPO}
            />
          </label>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold text-text-2">Senioridade</span>
              <select name="senioridade" defaultValue={criterios.senioridade} className={CAMPO}>
                {SENIORIDADES.map((s) => (
                  <option key={s} value={s}>
                    {ROTULO_SENIORIDADE[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold text-text-2">Anos de experiência pedidos</span>
              <input
                name="anos_experiencia"
                type="number"
                min={0}
                max={40}
                defaultValue={criterios.anos_experiencia ?? ""}
                className={CAMPO}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-[10.5px] font-bold text-text-2">Diferencial: por que alguém iria querer esta vaga</span>
            <textarea name="diferencial" defaultValue={criterios.diferencial} rows={3} maxLength={600} className={CAMPO} />
          </label>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <SubmitButton pendingLabel="Salvando..." className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">
              Salvar critérios
            </SubmitButton>
            <span className="text-[11.5px] text-text-2">
              {criterios.confirmado_em
                ? `Última confirmação: ${new Date(criterios.confirmado_em).toLocaleDateString("pt-BR")}`
                : "Ainda não confirmados."}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
