"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { consultarLinha, desconectarLinha, religarWebhookDaLinha, salvarLinha, type EstadoLinha, type EstadoPainel } from "./actions";

const campo = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";
const COR: Record<string, string> = {
  conectada: "bg-success-bg text-success",
  conectando: "bg-gold-bg text-gold-3",
  desconectada: "bg-danger-bg text-danger",
  desconhecido: "bg-navy-bg text-text-2",
};

export type OpcaoOperador = { id: string; nome: string };

/** Estado, QR code (com atualização) e ações de conexão de uma linha. */
export function PainelConexao({
  lineId,
  estadoInicial,
  numeroInicial,
}: {
  lineId: string;
  estadoInicial: string;
  numeroInicial: string | null;
}) {
  const [info, setInfo] = useState<EstadoPainel>({
    erro: null,
    estado: estadoInicial,
    rotulo: "",
    numero: numeroInicial,
    qr: null,
    codigo: null,
  });
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ultimoQr = useRef(0);

  const atualizar = useCallback(
    async (comQr: boolean) => {
      const r = await consultarLinha(lineId, comQr);
      setInfo((a) => ({ ...r, qr: comQr ? r.qr : a.qr }));
      if (r.estado === "conectada") setAberto(false);
      return r;
    },
    [lineId],
  );

  // Com o QR aberto: confere o estado a cada 4 s e troca o QR a cada 20 s.
  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    const id = setInterval(async () => {
      if (!ativo) return;
      const agora = Date.now();
      const precisaQr = agora - ultimoQr.current > 20_000;
      if (precisaQr) ultimoQr.current = agora;
      await atualizar(precisaQr);
    }, 4_000);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [aberto, atualizar]);

  const abrir = async () => {
    setMsg(null);
    setOcupado(true);
    ultimoQr.current = Date.now();
    const r = await atualizar(true);
    setOcupado(false);
    if (r.estado === "conectada") setMsg("Este número já está conectado.");
    else setAberto(true);
  };

  const desconectar = async () => {
    if (!window.confirm("Desconectar este número do WhatsApp? Será preciso ler o QR code de novo.")) return;
    setOcupado(true);
    const r = await desconectarLinha(lineId);
    setMsg(r.ok ? "Número desconectado." : r.erro);
    await atualizar(false);
    setOcupado(false);
  };

  const religar = async () => {
    setOcupado(true);
    const r = await religarWebhookDaLinha(lineId);
    setMsg(r.ok ? "Webhook ligado de novo." : r.erro);
    setOcupado(false);
  };

  const rotulo = info.rotulo || ({ conectada: "Conectada", conectando: "Aguardando o QR code", desconectada: "Desconectada" } as Record<string, string>)[info.estado] || "Estado desconhecido";

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
        <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${COR[info.estado] ?? COR.desconhecido}`}>{rotulo}</span>
        {info.numero && <span className="font-bold text-text">+{info.numero}</span>}
        {info.erro && <span className="text-danger">{info.erro}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {info.estado !== "conectada" && (
          <button type="button" onClick={abrir} disabled={ocupado} className="rounded-xl bg-navy px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-60">
            {aberto ? "Atualizar QR code" : "Mostrar QR code"}
          </button>
        )}
        <button type="button" onClick={() => atualizar(false)} disabled={ocupado} className="rounded-xl border border-border bg-surface px-3 py-1.5 text-[12px] font-bold text-navy">
          Atualizar estado
        </button>
        {info.estado === "conectada" && (
          <button type="button" onClick={desconectar} disabled={ocupado} className="rounded-xl border border-border bg-surface px-3 py-1.5 text-[12px] font-bold text-danger">
            Desconectar
          </button>
        )}
        <button type="button" onClick={religar} disabled={ocupado} className="rounded-xl border border-border bg-surface px-3 py-1.5 text-[12px] font-bold text-navy">
          Religar o recebimento
        </button>
      </div>
      {msg && <p className="text-[12px] font-semibold text-text-2">{msg}</p>}
      {aberto && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          {info.qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.qr} alt="QR code para conectar o WhatsApp" width={240} height={240} className="mx-auto rounded-lg bg-white p-2" />
          ) : (
            <p className="text-center text-[12.5px] text-text-2">Gerando o QR code...</p>
          )}
          <ol className="mx-auto mt-3 max-w-sm list-decimal pl-5 text-[12px] text-text-2">
            <li>No celular, abra o WhatsApp.</li>
            <li>Toque em Aparelhos conectados e em Conectar um aparelho.</li>
            <li>Aponte a câmera para este código.</li>
          </ol>
          {info.codigo && <p className="mt-2 text-center text-[12px] text-text-2">Ou use o código: <b>{info.codigo}</b></p>}
          <p className="mt-2 text-center text-[11px] text-text-3">O código troca sozinho a cada poucos segundos.</p>
        </div>
      )}
    </div>
  );
}

const ini: EstadoLinha = { erro: null, ok: false, id: null };

export function FormEditarLinha({
  lineId,
  apelido,
  operadorId,
  agente,
  ativa,
  operadores,
}: {
  lineId: string;
  apelido: string;
  operadorId: string | null;
  agente: string;
  ativa: boolean;
  operadores: OpcaoOperador[];
}) {
  const [e, acao, env] = useActionState(salvarLinha, ini);
  return (
    <form action={acao} className="grid gap-3 md:grid-cols-4">
      <input type="hidden" name="line_id" value={lineId} />
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Apelido</span>
        <input name="apelido" defaultValue={apelido} className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Operador dono do número</span>
        <select name="operador_id" defaultValue={operadorId ?? ""} className={campo}>
          <option value="">Compartilhado (fila da empresa)</option>
          {operadores.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px] font-bold text-text-2">Agente de IA</span>
        <select name="agente" defaultValue={agente} className={campo}>
          <option value="desligado">Desligado</option>
          <option value="sugestao">Só sugestão (a pessoa envia)</option>
          <option value="automatico">Atende sozinho (se o agente permitir)</option>
        </select>
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-[12.5px] font-bold text-text">
        <input type="checkbox" name="ativa" value="sim" defaultChecked={ativa} /> Ativa
      </label>
      <label className="flex items-center gap-2 text-[12px] text-text-2 md:col-span-4">
        <input type="checkbox" name="transferir" value="sim" />
        Ao trocar o operador, passar também as conversas que já têm dono neste número para ele
      </label>
      <div className="md:col-span-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={env} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-navy disabled:opacity-60">
          Salvar
        </button>
        {e.erro && <span role="alert" className="text-[12px] font-semibold text-danger">{e.erro}</span>}
        {e.ok && <span className="text-[12px] font-semibold text-success">Salvo. {e.info ?? ""}</span>}
      </div>
    </form>
  );
}
