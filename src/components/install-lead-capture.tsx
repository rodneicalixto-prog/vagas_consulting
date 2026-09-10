"use client";

import { useActionState, useEffect, useState } from "react";
import { registrarInstalacao, registrarLead, type RegistrarLeadState } from "@/app/track-install-action";

const initialState: RegistrarLeadState = { error: null };

/**
 * Detecta a instalação da PWA (evento "appinstalled" — só dispara em
 * navegadores/plataformas com suporte, ex.: Chrome/Edge/Android; iOS
 * Safari não dispara isso) e pede um cadastro mínimo obrigatório (nome,
 * e-mail, telefone, idade) independente do candidato chegar a se
 * candidatar a alguma vaga. Também registra o evento bruto de instalação
 * para contagem de aceitação de mercado, mesmo se o formulário for
 * fechado sem preencher.
 */
export function InstallLeadCapture() {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, pending] = useActionState(registrarLead, initialState);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsStatus, setCoordsStatus] = useState<"idle" | "pedindo" | "negado" | "ok">("idle");

  const pedirLocalizacao = () => {
    if (!navigator.geolocation) {
      setCoordsStatus("negado");
      return;
    }
    setCoordsStatus("pedindo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCoordsStatus("ok");
      },
      () => setCoordsStatus("negado"),
      { timeout: 8000 },
    );
  };

  useEffect(() => {
    const onInstalled = () => {
      const plataforma = /android/i.test(navigator.userAgent)
        ? "android"
        : /iphone|ipad/i.test(navigator.userAgent)
          ? "ios"
          : "desktop";
      registrarInstalacao(plataforma, navigator.userAgent);
      setShowForm(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  if (!showForm) return null;
  if (state.ok) {
    return (
      <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="modal w-full max-w-sm rounded-2xl bg-surface p-6 text-center">
          <p className="text-sm font-bold text-text">Cadastro recebido — obrigado!</p>
          <button
            onClick={() => setShowForm(false)}
            className="mt-4 w-full rounded-xl bg-gold py-3 text-[13px] font-extrabold text-[#1c1508]"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form action={formAction} className="modal flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-surface p-6">
        <h2 className="text-[15px] font-extrabold text-text">Bem-vindo(a) ao Vagas Consulting</h2>
        <p className="-mt-1 text-[12px] text-text-2">
          Complete seu cadastro para continuar — leva menos de 1 minuto.
        </p>
        <input
          name="nome_completo"
          required
          placeholder="Nome completo"
          className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm"
        />
        <div className="grid grid-cols-2 gap-2.5">
          <input
            name="telefone"
            required
            placeholder="Telefone"
            className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm"
          />
          <input
            name="idade"
            type="number"
            min={14}
            max={100}
            placeholder="Idade"
            className="rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm"
          />
        </div>

        <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
        <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
        {coordsStatus === "ok" ? (
          <p className="text-[11px] font-semibold text-success">Localização compartilhada — obrigado!</p>
        ) : (
          <button
            type="button"
            onClick={pedirLocalizacao}
            disabled={coordsStatus === "pedindo"}
            className="rounded-lg border border-border bg-bg py-2 text-[11.5px] font-bold text-text-2"
          >
            {coordsStatus === "pedindo"
              ? "Aguardando permissão..."
              : coordsStatus === "negado"
                ? "Não foi possível obter — tudo bem, seguir sem localização"
                : "Compartilhar minha localização (opcional)"}
          </button>
        )}

        {state.error && <p className="text-[12px] font-semibold text-danger">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-xl bg-gold py-3 text-[13.5px] font-extrabold text-[#1c1508] disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Confirmar cadastro"}
        </button>
      </form>
    </div>
  );
}
