"use client";

import { useState } from "react";

const CANAIS = [
  { name: "canal_whatsapp", label: "WhatsApp" },
  { name: "canal_email", label: "E-mail" },
  { name: "canal_sms", label: "SMS" },
  { name: "canal_telegram", label: "Telegram" },
] as const;

type Nome = (typeof CANAIS)[number]["name"];

function Chave({
  ligado,
  onChange,
  nome,
  rotulo,
}: {
  ligado: boolean;
  onChange: (v: boolean) => void;
  nome?: string;
  rotulo: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2.5">
      <span className="text-[13px] font-semibold">{rotulo}</span>
      <input
        type="checkbox"
        name={nome}
        checked={ligado}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="relative h-[22px] w-[38px] rounded-full bg-border transition-colors peer-checked:bg-gold">
        <span className="absolute top-0.5 left-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all peer-checked:left-[18px]" />
      </span>
    </label>
  );
}

/**
 * Canais de alerta. O consentimento nunca vem pré-marcado (LGPD: precisa ser
 * ato do titular); "Aceitar todos" é um clique explícito dele.
 */
export function CanaisAlertas({ erroTelegram }: { erroTelegram: boolean }) {
  const [ligados, setLigados] = useState<Record<Nome, boolean>>({
    canal_whatsapp: false,
    canal_email: false,
    canal_sms: false,
    canal_telegram: false,
  });
  const todos = CANAIS.every((c) => ligados[c.name]);

  const definir = (nome: Nome, v: boolean) => setLigados((s) => ({ ...s, [nome]: v }));
  const definirTodos = (v: boolean) =>
    setLigados({ canal_whatsapp: v, canal_email: v, canal_sms: v, canal_telegram: v });

  return (
    <div className="flex flex-col">
      <div className="border-b border-border">
        <Chave ligado={todos} onChange={definirTodos} rotulo="Aceitar todos os canais" />
      </div>

      {CANAIS.map(({ name, label }) => (
        <div key={name} className="border-t border-border first:border-t-0">
          <Chave ligado={ligados[name]} onChange={(v) => definir(name, v)} nome={name} rotulo={label} />
        </div>
      ))}

      {ligados.canal_telegram && (
        <div className="mb-2 rounded-xl border border-border bg-bg p-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] font-bold text-text-2">
              Seu @usuário ou ID numérico do Telegram
            </span>
            <input
              name="telegram_id"
              placeholder="@seuusuario ou 123456789"
              autoComplete="off"
              required
              className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
            />
          </label>
          <p className="mt-1.5 text-[11px] leading-snug text-text-3">
            Usamos só para enviar os alertas que você escolheu. Para receber, abra o nosso bot e
            toque em <b>Iniciar</b> quando ele for ativado; avisaremos por aqui.
          </p>
        </div>
      )}

      {erroTelegram && (
        <p className="mb-2 text-[12px] font-semibold text-danger">
          Informe um @usuário (5 a 32 letras, números ou _) ou o ID numérico do Telegram.
        </p>
      )}
    </div>
  );
}
