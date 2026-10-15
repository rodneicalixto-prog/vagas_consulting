"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { enviarMensagemComEstado, type EstadoEnvio } from "./actions";

const inicial: EstadoEnvio = { erro: null, ok: false };

const LIMITE_BYTES = 4 * 1024 * 1024;
const LIMITE_GRAVACAO_S = 120;
const ACEITA =
  "image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.txt,audio/*,video/mp4";

const EMOJIS = [
  "😀", "😁", "😂", "🙂", "😉", "😊", "😍", "🤝", "🙏", "👍", "👏", "💪",
  "🎉", "✅", "❌", "⚠️", "📌", "📎", "📅", "⏰", "📞", "📍", "💼", "📄",
  "👋", "🤔", "😅", "😢", "🙌", "👀", "🔥", "⭐", "💡", "✨", "❤️", "👌",
];

function tamanhoLegivel(b: number): string {
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

function mmss(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Caixa de envio: texto, emoji, arquivo e áudio, com o motivo do bloqueio na tela. */
export function FormularioEnvio({
  conversationId,
  descadastrado,
  respondendo,
}: {
  conversationId: string;
  descadastrado: boolean;
  respondendo?: { id: string; resumo: string; limparHref: string } | null;
}) {
  const [estado, acao, pendente] = useActionState(enviarMensagemComEstado, inicial);
  const formRef = useRef<HTMLFormElement>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const [texto, setTexto] = useState("");
  const [anexo, setAnexo] = useState<{ nome: string; tamanho: number; audio: boolean } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [emojis, setEmojis] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);

  const gravadorRef = useRef<MediaRecorder | null>(null);
  const fluxoRef = useRef<MediaStream | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const relogioRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const descartarRef = useRef(false);

  // Mensagem enviada: limpa a caixa.
  useEffect(() => {
    if (estado.ok) {
      formRef.current?.reset();
      /* eslint-disable react-hooks/set-state-in-effect */
      setTexto("");
      setAnexo(null);
      setAviso(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [estado]);

  // Sair da tela com o microfone aberto: solta tudo.
  useEffect(() => {
    return () => {
      descartarRef.current = true;
      if (relogioRef.current) clearInterval(relogioRef.current);
      if (gravadorRef.current && gravadorRef.current.state !== "inactive") gravadorRef.current.stop();
      fluxoRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const colocarArquivo = (arq: File, audio: boolean) => {
    if (arq.size > LIMITE_BYTES) {
      setAviso(`O arquivo tem ${tamanhoLegivel(arq.size)}; o limite é 4 MB.`);
      return false;
    }
    const dt = new DataTransfer();
    dt.items.add(arq);
    if (arquivoRef.current) arquivoRef.current.files = dt.files;
    setAnexo({ nome: arq.name, tamanho: arq.size, audio });
    setAviso(null);
    return true;
  };

  const removerArquivo = () => {
    if (arquivoRef.current) arquivoRef.current.value = "";
    setAnexo(null);
    setAviso(null);
  };

  const aoEscolherArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0];
    if (!arq) return;
    if (!colocarArquivo(arq, false)) e.target.value = "";
  };

  const pararRelogio = () => {
    if (relogioRef.current) clearInterval(relogioRef.current);
    relogioRef.current = null;
  };

  const iniciarGravacao = async () => {
    setAviso(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAviso("Este navegador não grava áudio. Anexe um arquivo de áudio.");
      return;
    }
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      fluxoRef.current = fluxo;
      const tipos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = tipos.find((t) => MediaRecorder.isTypeSupported(t));
      const g = new MediaRecorder(fluxo, mimeType ? { mimeType } : undefined);
      gravadorRef.current = g;
      pedacosRef.current = [];
      descartarRef.current = false;

      g.ondataavailable = (ev) => {
        if (ev.data.size > 0) pedacosRef.current.push(ev.data);
      };
      g.onstop = () => {
        pararRelogio();
        fluxo.getTracks().forEach((t) => t.stop());
        setGravando(false);
        if (descartarRef.current || pedacosRef.current.length === 0) return;
        const tipo = (g.mimeType || mimeType || "audio/webm").split(";")[0];
        const ext = tipo.includes("mp4") ? "m4a" : "webm";
        const blob = new Blob(pedacosRef.current, { type: tipo });
        const arq = new File([blob], `audio-${Date.now()}.${ext}`, { type: tipo });
        colocarArquivo(arq, true);
      };

      g.start();
      setSegundos(0);
      setGravando(true);
      relogioRef.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= LIMITE_GRAVACAO_S && gravadorRef.current?.state === "recording") {
            gravadorRef.current.stop();
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setAviso("Não foi possível usar o microfone. Libere a permissão do navegador para este site.");
    }
  };

  const pararGravacao = (descartar: boolean) => {
    descartarRef.current = descartar;
    if (gravadorRef.current && gravadorRef.current.state !== "inactive") gravadorRef.current.stop();
  };

  const inserirEmoji = (emoji: string) => {
    const el = textoRef.current;
    const ini = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    const novo = texto.slice(0, ini) + emoji + texto.slice(fim);
    setTexto(novo.slice(0, 2000));
    setEmojis(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(ini + emoji.length, ini + emoji.length);
    });
  };

  const semConteudo = texto.trim().length === 0 && !anexo;
  const bloqueado = descadastrado;

  return (
    <form ref={formRef} action={acao} className="shrink-0 border-t border-border p-2.5">
      <input type="hidden" name="conversation_id" value={conversationId} />
      {respondendo && <input type="hidden" name="resposta_a" value={respondendo.id} />}
      <input
        ref={arquivoRef}
        type="file"
        name="arquivo"
        accept={ACEITA}
        onChange={aoEscolherArquivo}
        className="hidden"
        tabIndex={-1}
      />

      {(estado.erro || aviso) && (
        <p role="alert" className="mb-2 rounded-lg bg-danger-bg px-3 py-2 text-[12px] font-semibold text-danger">
          {estado.erro ?? aviso}
        </p>
      )}

      {respondendo && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border-l-4 border-navy bg-black/[0.04] px-3 py-1.5 text-[11.5px] text-text-2">
          <span className="min-w-0 truncate">
            <b className="text-text">Respondendo:</b> {respondendo.resumo}
          </span>
          <Link href={respondendo.limparHref} className="shrink-0 font-bold text-navy">
            ✕
          </Link>
        </div>
      )}

      {anexo && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-black/[0.05] px-3 py-1.5 text-[12px]">
          <span className="min-w-0 truncate font-semibold text-text">
            {anexo.audio ? "🎤 Áudio gravado" : `📎 ${anexo.nome}`}{" "}
            <span className="font-normal text-text-2">({tamanhoLegivel(anexo.tamanho)})</span>
          </span>
          <button type="button" onClick={removerArquivo} className="shrink-0 text-[12px] font-bold text-danger">
            Remover
          </button>
        </div>
      )}

      {gravando && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-[12px] font-bold text-red-700">
          <span>● Gravando {mmss(segundos)}</span>
          <span className="flex gap-3">
            <button type="button" onClick={() => pararGravacao(true)} className="text-text-2">
              Cancelar
            </button>
            <button type="button" onClick={() => pararGravacao(false)} className="text-navy">
              Concluir
            </button>
          </span>
        </div>
      )}

      {emojis && (
        <div className="mb-2 grid grid-cols-12 gap-0.5 rounded-lg border border-border bg-surface p-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => inserirEmoji(e)}
              className="rounded p-1 text-[17px] leading-none hover:bg-black/[0.06]"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex shrink-0 flex-col gap-1">
          <div className="flex gap-1">
            <button
              type="button"
              title="Anexar arquivo (até 4 MB)"
              aria-label="Anexar arquivo"
              disabled={bloqueado || gravando}
              onClick={() => arquivoRef.current?.click()}
              className="rounded-lg border border-border px-2 py-1.5 text-[14px] disabled:opacity-50"
            >
              📎
            </button>
            <button
              type="button"
              title="Emoji"
              aria-label="Emoji"
              disabled={bloqueado}
              onClick={() => setEmojis((v) => !v)}
              className="rounded-lg border border-border px-2 py-1.5 text-[14px] disabled:opacity-50"
            >
              😀
            </button>
            <button
              type="button"
              title="Gravar áudio"
              aria-label="Gravar áudio"
              disabled={bloqueado || gravando || !!anexo}
              onClick={iniciarGravacao}
              className="rounded-lg border border-border px-2 py-1.5 text-[14px] disabled:opacity-50"
            >
              🎤
            </button>
          </div>
        </div>
        <textarea
          ref={textoRef}
          name="texto"
          maxLength={2000}
          rows={2}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={bloqueado}
          placeholder={
            bloqueado
              ? "Envio bloqueado por descadastro."
              : anexo?.audio
                ? "Áudio não leva legenda."
                : anexo
                  ? "Legenda (opcional)"
                  : "Escreva a mensagem"
          }
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[13px] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={bloqueado || pendente || gravando || semConteudo || (!!anexo?.audio && texto.trim().length > 0)}
          className="shrink-0 rounded-lg bg-navy px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {pendente ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
