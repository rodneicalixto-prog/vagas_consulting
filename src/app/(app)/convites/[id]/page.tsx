import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, Pill, BackHeader, Tag } from "@/components/ui";
import { SubmitButton } from "@/components/form-buttons";
import { modalidadeLabel, modalidadeTagClass } from "@/lib/format";
import {
  CONVITES_ABERTOS,
  conviteExpirado,
  conviteLabel,
  convitePillClass,
  formatPrazo,
} from "@/lib/convites";
import { responderConvite } from "./actions";
import { exibirRemuneracao } from "@/lib/money";

const MOTIVOS = [
  "Não tenho disponibilidade nesse dia/horário",
  "O local fica longe para mim",
  "A remuneração não atende",
  "Já assumi outro compromisso",
  "Outro motivo",
];

const MENSAGENS: Record<string, { texto: string; tom: "ok" | "erro" }> = {
  aceitar: { texto: "Convite aceito. A equipe vai confirmar com você em breve.", tom: "ok" },
  recusar: { texto: "Convite recusado. Obrigado por avisar.", tom: "ok" },
  "ja-respondido": { texto: "Este convite já foi respondido.", tom: "erro" },
  expirado: { texto: "O prazo para responder este convite terminou.", tom: "erro" },
  "vaga-encerrada": { texto: "Esta vaga não está mais disponível.", tom: "erro" },
  indisponivel: { texto: "Não foi possível aceitar este convite. Fale com a equipe.", tom: "erro" },
};

export default async function ConviteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { ok, erro } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: convite } = await supabase
    .from("invites")
    .select(
      "id, candidate_id, status, validade, motivo, resposta_em, jobs(titulo, local, modalidade, remuneracao_texto, descricao, companies(nome_fantasia, razao_social))",
    )
    .eq("id", id)
    .eq("candidate_id", user!.id)
    .maybeSingle();

  if (!convite) notFound();

  // Primeira abertura: ofertado -> visualizado (só o dono, e só nesse estado).
  let status = convite.status;
  if (status === "ofertado") {
    const admin = createAdminClient();
    const { data } = await admin
      .from("invites")
      .update({ status: "visualizado" })
      .eq("id", id)
      .eq("candidate_id", user!.id)
      .eq("status", "ofertado")
      .select("status")
      .maybeSingle();
    if (data) status = data.status;
  }

  const expirado = conviteExpirado({ status, validade: convite.validade });
  const podeResponder = CONVITES_ABERTOS.includes(status) && !expirado;
  const msg = MENSAGENS[ok ?? erro ?? ""];
  const empresa = convite.jobs?.companies?.nome_fantasia ?? convite.jobs?.companies?.razao_social;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <BackHeader title="Convite" backHref="/convites" />

      <div className="flex flex-col gap-4 px-5 md:px-8">
        {msg && (
          <div
            role="status"
            className={`rounded-xl px-4 py-3 text-[12.5px] font-bold ${
              msg.tom === "ok" ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
            }`}
          >
            {msg.texto}
          </div>
        )}

        <Card className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              {convite.jobs?.modalidade && (
                <Tag className={modalidadeTagClass[convite.jobs.modalidade]}>
                  {modalidadeLabel[convite.jobs.modalidade]}
                </Tag>
              )}
              <h2 className="mt-2 text-[17px] font-extrabold">{convite.jobs?.titulo}</h2>
              <div className="text-[12px] text-text-2">{empresa}</div>
            </div>
            <Pill className={expirado ? "bg-black/5 text-text-3" : convitePillClass[status]}>
              {expirado ? "Expirado" : conviteLabel[status]}
            </Pill>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-[12.5px]">
            <div>
              <dt className="font-extrabold text-text-2">Local</dt>
              <dd>{convite.jobs?.local ?? "A combinar"}</dd>
            </div>
            <div>
              <dt className="font-extrabold text-text-2">Remuneração</dt>
              <dd>{exibirRemuneracao(convite.jobs?.remuneracao_texto) || "A combinar"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="font-extrabold text-text-2">Responder até</dt>
              <dd>{formatPrazo(convite.validade)}</dd>
            </div>
          </dl>

          {convite.jobs?.descricao && (
            <p className="whitespace-pre-line text-[12.5px] text-text-2">{convite.jobs.descricao}</p>
          )}
        </Card>

        {podeResponder ? (
          <form action={responderConvite} className="flex flex-col gap-3">
            <input type="hidden" name="invite_id" value={convite.id} />
            <SubmitButton
              type="submit"
              name="acao"
              value="aceitar"
              pendingLabel="Enviando…"
              className="w-full rounded-xl bg-gold px-0 py-3.5 text-[14.5px] font-extrabold text-[#1c1508]"
            >
              Aceitar convite
            </SubmitButton>

            <Card className="flex flex-col gap-2">
              <label htmlFor="motivo" className="text-[12px] font-extrabold text-text-2">
                Se não puder, conte o motivo (opcional)
              </label>
              <select
                id="motivo"
                name="motivo"
                defaultValue=""
                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px]"
              >
                <option value="">Prefiro não informar</option>
                {MOTIVOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <SubmitButton
                type="submit"
                name="acao"
                value="recusar"
                pendingLabel="Enviando…"
                className="rounded-xl border border-border bg-surface px-0 py-3 text-[13.5px] font-extrabold text-navy"
              >
                Recusar convite
              </SubmitButton>
            </Card>
          </form>
        ) : (
          <p className="text-[12.5px] text-text-2">
            {expirado
              ? "O prazo terminou. Fale com a equipe se ainda tiver interesse."
              : status === "recusado" && convite.motivo
                ? `Você recusou este convite. Motivo informado: ${convite.motivo}.`
                : "Este convite não aceita mais resposta."}
          </p>
        )}
      </div>
    </div>
  );
}
