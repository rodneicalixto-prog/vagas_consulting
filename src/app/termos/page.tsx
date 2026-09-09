"use client";

import { useState } from "react";
import { BackHeader, Card, PrimaryLinkButton } from "@/components/ui";
import { IconCheck } from "@/components/icons";

const canais = ["WhatsApp", "E-mail", "SMS"] as const;

export default function TermosPage() {
  const [ativos, setAtivos] = useState<Record<(typeof canais)[number], boolean>>({
    WhatsApp: false,
    "E-mail": false,
    SMS: false,
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <BackHeader title="Termos e privacidade" backHref="/login" />

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

        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5">
          <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md bg-navy">
            <IconCheck size={11} className="text-white" />
          </span>
          <p className="text-[12.5px] leading-snug">
            Li e aceito os <a className="font-extrabold text-gold-3">Termos de Uso</a>.
          </p>
        </div>
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3.5">
          <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md bg-navy">
            <IconCheck size={11} className="text-white" />
          </span>
          <p className="text-[12.5px] leading-snug">
            Estou ciente do <a className="font-extrabold text-gold-3">Aviso de Privacidade</a>.
          </p>
        </div>

        <div className="mt-1 text-xs font-extrabold uppercase tracking-wide text-text-2">
          Alertas de vagas (opcional)
        </div>
        <Card className="flex flex-col gap-3">
          <p className="text-[13px] font-bold leading-snug">
            &ldquo;Quero receber alertas de vagas e oportunidades compatíveis
            com meu perfil.&rdquo;
          </p>
          {canais.map((canal) => (
            <button
              key={canal}
              onClick={() => setAtivos((s) => ({ ...s, [canal]: !s[canal] }))}
              className="flex items-center justify-between border-t border-border py-2.5 text-left first:border-t-0"
            >
              <span className="text-[13px] font-semibold">{canal}</span>
              <span
                className={`relative h-[22px] w-[38px] rounded-full transition-colors ${
                  ativos[canal] ? "bg-gold" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
                    ativos[canal] ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          ))}
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
        <PrimaryLinkButton href="/onboarding">Continuar</PrimaryLinkButton>
      </div>
    </div>
  );
}
