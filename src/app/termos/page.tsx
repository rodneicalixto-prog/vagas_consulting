import Link from "next/link";
import { Card } from "@/components/ui";
import { IconCheck, IconChevronLeft } from "@/components/icons";
import { saveConsentsAndContinue } from "./actions";
import { CanaisAlertas } from "./canais-alertas";

export default async function TermosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const sp = await searchParams;
  return (
    <form action={saveConsentsAndContinue} className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <div className="flex items-center gap-3 px-5 pt-6 pb-3 md:px-8 md:pt-8">
        <Link
          href="/inicio"
          aria-label="Voltar ao início"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-border bg-surface"
        >
          <IconChevronLeft />
        </Link>
        <h1 className="text-[16px] font-extrabold text-navy md:text-lg">Termos e privacidade</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 md:px-8">
        <Card>
          <h3 className="mb-2 text-[13px] font-extrabold text-navy">
            Aviso resumido de privacidade
          </h3>
          <ul className="flex list-disc flex-col gap-1.5 pl-4 text-[12.5px] leading-relaxed text-text-2">
            <li>Usamos seus dados para conectar você a vagas e empresas.</li>
            <li>
              Currículo e documentos ficam visíveis apenas às empresas dos
              processos em que você participa.
            </li>
            <li>
              Você pode acessar, corrigir, exportar ou excluir seus dados a
              qualquer momento em Privacidade.
            </li>
          </ul>
        </Card>

        <label className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5">
          <input
            type="checkbox"
            name="aceite_termos"
            required
            defaultChecked
            className="peer sr-only"
          />
          <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border border-border bg-white peer-checked:border-navy peer-checked:bg-navy">
            <IconCheck size={11} className="text-white" />
          </span>
          <p className="text-[12.5px] leading-snug">
            Li e aceito os <a className="font-extrabold text-gold-3">Termos de Uso</a>.
          </p>
        </label>
        <label className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5">
          <input
            type="checkbox"
            name="ciente_privacidade"
            required
            defaultChecked
            className="peer sr-only"
          />
          <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border border-border bg-white peer-checked:border-navy peer-checked:bg-navy">
            <IconCheck size={11} className="text-white" />
          </span>
          <p className="text-[12.5px] leading-snug">
            Estou ciente do <a className="font-extrabold text-gold-3">Aviso de Privacidade</a>.
          </p>
        </label>

        <div className="mt-1 text-xs font-extrabold uppercase tracking-wide text-text-2">
          Alertas de vagas (opcional)
        </div>
        <Card className="flex flex-col gap-3">
          <p className="text-[13px] font-bold leading-snug">
            &ldquo;Quero receber alertas de vagas e oportunidades compatíveis
            com meu perfil.&rdquo;
          </p>
          <CanaisAlertas erroTelegram={sp.erro === "telegram"} />
          <p className="text-[11.5px] leading-relaxed text-text-3">
            Essa escolha é opcional. Você pode alterar os canais ou cancelar
            os alertas a qualquer momento em{" "}
            <b className="text-text-2">Privacidade e comunicações</b>.
            Mensagens necessárias sobre sua conta e processos seletivos em
            andamento poderão continuar sendo enviadas.
          </p>
        </Card>
      </div>

      <div className="sticky bottom-0 bg-bg px-5 pb-6 pt-3 md:px-8">
        <button
          type="submit"
          className="block w-full rounded-xl bg-gold px-0 py-3.5 text-center text-[14.5px] font-extrabold text-[#1c1508]"
        >
          Continuar
        </button>
      </div>
    </form>
  );
}
