import { SubmitButton } from "@/components/form-buttons";
import { MODOS, ROTULO_MODO_ENTREVISTA, VOZ_LIBERADA, modoEfetivo, sugerirModo, verificarRegras, type RegrasIA } from "@/lib/regras-vaga";
import type { NivelVerificacao, Senioridade } from "@/lib/vaga-estruturada";
import { salvarRegrasIA } from "../../actions";

const CAMPO = "w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-navy";
const ROT = "text-[10.5px] font-bold text-text-2";
const AJUDA = "text-[11px] font-normal text-text-3";

const COR: Record<NivelVerificacao, string> = {
  ok: "bg-success-bg text-success",
  aviso: "bg-gold-bg text-gold-3",
  bloqueio: "bg-danger-bg text-danger",
};
const ROTULO: Record<NivelVerificacao, string> = { ok: "OK", aviso: "Aviso", bloqueio: "Bloqueia" };

/** Regras que a IA segue nesta vaga. Sem as regras mínimas, a IA não conduz: a vaga vai para uma pessoa. */
export function RegrasIAForm({
  jobId,
  regras,
  senioridade,
  temObrigatorios,
  confidencial,
}: {
  jobId: string;
  regras: RegrasIA;
  senioridade: Senioridade;
  temObrigatorios: boolean;
  confidencial: boolean;
}) {
  const ctx = { temObrigatorios, confidencial };
  const efetivo = modoEfetivo(regras, ctx);
  const verificacoes = verificarRegras(regras, ctx);
  const sugestao = sugerirModo({ senioridade });

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-5" aria-labelledby="regras-ia">
      <h2 id="regras-ia" className="text-sm font-extrabold text-text">
        Regras para a IA nesta vaga
      </h2>
      <p className="mt-1 text-[12px] text-text-2">
        A IA nunca age só com o padrão: ela segue o que está aqui. Reprovar sem validação humana, perguntar sobre atributo protegido e
        avaliar emoção nunca são permitidos, mesmo que escritos aqui.
      </p>

      <div
        role="status"
        className={`mt-3 rounded-xl px-4 py-3 text-[12.5px] font-bold ${efetivo.conduzPelaIA ? "bg-success-bg text-success" : "bg-gold-bg text-gold-3"}`}
      >
        {efetivo.conduzPelaIA
          ? `A IA conduz esta vaga: ${ROTULO_MODO_ENTREVISTA[efetivo.modo]}. Regras na versão ${regras.versao}.`
          : `A IA não conduz esta vaga: ela segue para entrevista com pessoa. Motivo: ${efetivo.motivo}`}
      </div>

      {confidencial && (
        <p className="mt-3 rounded-xl bg-navy-bg px-4 py-2.5 text-[12px] text-text-2">
          <b className="text-text">Vaga sigilosa.</b> A IA se apresenta como assistente de seleção e não revela a empresa nem dados que a identifiquem.
        </p>
      )}

      <ul className="mt-3 grid gap-1.5 md:grid-cols-2">
        {verificacoes.map((v) => (
          <li key={v.id} className="flex items-start gap-2 text-[12px] text-text-2">
            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${COR[v.nivel]}`}>{ROTULO[v.nivel]}</span>
            <span>{v.mensagem}</span>
          </li>
        ))}
      </ul>

      <form action={salvarRegrasIA} className="mt-5 grid gap-4 md:grid-cols-2">
        <input type="hidden" name="job_id" value={jobId} />

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className={ROT}>Quem entrevista (obrigatório)</span>
          <select name="modo" defaultValue={regras.modo} className={CAMPO}>
            {MODOS.map((m) => (
              <option key={m} value={m}>
                {ROTULO_MODO_ENTREVISTA[m]}
                {m === "voz" && !VOZ_LIBERADA ? " (ainda não liberada)" : ""}
              </option>
            ))}
          </select>
          <span className={AJUDA}>
            {sugestao === "voz"
              ? "Esta vaga é de liderança: o modo sugerido é voz. Enquanto a voz não for liberada, ela segue para entrevista com pessoa."
              : "Padrão: entrevista pela IA por texto (WhatsApp/chat)."}
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className={ROT}>Nota de corte da triagem, de 0 a 100 (obrigatório)</span>
          <input name="corte_triagem" type="number" min={0} max={100} defaultValue={regras.corte_triagem ?? ""} className={CAMPO} />
          <span className={AJUDA}>Abaixo disso a IA aponta &quot;não segue&quot; e o caso vai para a sua validação.</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className={ROT}>Nota de corte da entrevista, de 0 a 100</span>
          <input name="corte_entrevista" type="number" min={0} max={100} defaultValue={regras.corte_entrevista ?? ""} className={CAMPO} />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className={ROT}>Quando a IA deve chamar uma pessoa, um por linha (obrigatório)</span>
          <textarea
            name="gatilhos_escalada"
            rows={4}
            defaultValue={regras.gatilhos_escalada.join("\n")}
            className={CAMPO}
            placeholder={"Candidato pede salário fora da faixa\nReclamação ou ameaça\nPergunta que a IA não sabe responder"}
          />
        </label>

        <div className="grid grid-cols-3 gap-3 md:col-span-2">
          {(
            [
              ["peso_cultura", "Peso da cultura", regras.peso_cultura],
              ["peso_competencias", "Peso das competências", regras.peso_competencias],
              ["peso_comportamento", "Peso do comportamento", regras.peso_comportamento],
            ] as const
          ).map(([nome, rotulo, valor]) => (
            <label key={nome} className="flex flex-col gap-1">
              <span className={ROT}>{rotulo} (1 a 5)</span>
              <input name={nome} type="number" min={1} max={5} defaultValue={valor} className={CAMPO} />
            </label>
          ))}
        </div>

        <label className="flex flex-col gap-1">
          <span className={ROT}>Perguntas obrigatórias, uma por linha</span>
          <textarea name="perguntas_obrigatorias" rows={4} defaultValue={regras.perguntas_obrigatorias.join("\n")} className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={ROT}>O que a IA nunca deve perguntar nesta vaga, um por linha</span>
          <textarea name="perguntas_proibidas" rows={4} defaultValue={regras.perguntas_proibidas.join("\n")} className={CAMPO} />
        </label>

        <label className="flex flex-col gap-1">
          <span className={ROT}>O que a IA pode informar, um por linha</span>
          <textarea
            name="pode_informar"
            rows={3}
            defaultValue={regras.pode_informar.join("\n")}
            className={CAMPO}
            placeholder={"Faixa salarial\nModelo de trabalho\nTurno"}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={ROT}>O que a IA deve dizer que vai confirmar com a equipe, um por linha</span>
          <textarea name="deve_confirmar_com_equipe" rows={3} defaultValue={regras.deve_confirmar_com_equipe.join("\n")} className={CAMPO} />
        </label>

        <div className="grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className={ROT}>Contato a partir de</span>
            <input name="horario_inicio" type="time" defaultValue={regras.horario_inicio} className={CAMPO} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={ROT}>Contato até</span>
            <input name="horario_fim" type="time" defaultValue={regras.horario_fim} className={CAMPO} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={ROT}>Máx. de tentativas</span>
            <input name="max_tentativas" type="number" min={1} max={10} defaultValue={regras.max_tentativas ?? ""} className={CAMPO} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={ROT}>Tom</span>
            <input name="tom" maxLength={200} defaultValue={regras.tom} className={CAMPO} placeholder="formal, direto" />
          </label>
        </div>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className={ROT}>Instruções da vaga (texto livre, até 2.000 caracteres)</span>
          <textarea name="instrucoes" rows={4} maxLength={2000} defaultValue={regras.instrucoes} className={CAMPO} />
        </label>

        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <SubmitButton pendingLabel="Salvando..." className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white">
            Salvar regras da IA
          </SubmitButton>
          <span className="text-[11.5px] text-text-2">
            {regras.confirmado_em ? `Última confirmação: ${new Date(regras.confirmado_em).toLocaleDateString("pt-BR")} (versão ${regras.versao})` : "Ainda não confirmadas."}
          </span>
        </div>
      </form>
    </section>
  );
}
