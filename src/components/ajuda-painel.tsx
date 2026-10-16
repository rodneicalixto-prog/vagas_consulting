"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { avaliarResposta, perguntarAjuda, type RespostaAjuda } from "@/app/admin/(app)/ajuda/actions";
import { sugestoesDaRota } from "@/lib/ajuda";

/** Botão Ajuda e painel de perguntas sobre o funcionamento da plataforma. */
export function AjudaPainel() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [feita, setFeita] = useState("");
  const [r, setR] = useState<RespostaAjuda | null>(null);
  const [avaliou, setAvaliou] = useState<boolean | null>(null);
  const [pendente, iniciar] = useTransition();

  const enviar = (texto: string) => {
    const t = texto.trim();
    if (t.length < 4 || pendente) return;
    setFeita(t);
    setAvaliou(null);
    iniciar(async () => {
      setR(await perguntarAjuda(t, pathname));
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-navy px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-lg print:hidden"
      >
        {aberto ? "Fechar ajuda" : "Ajuda"}
      </button>

      {aberto && (
        <section
          aria-label="Ajuda Vagas Consulting"
          className="fixed bottom-16 right-4 z-40 flex max-h-[75vh] w-[min(380px,calc(100vw-2rem))] flex-col rounded-2xl border border-border bg-surface shadow-xl print:hidden"
        >
          <header className="border-b border-border px-4 py-3">
            <div className="text-[13px] font-extrabold text-text">Ajuda Vagas Consulting</div>
            <p className="text-[11px] text-text-3">
              Dúvidas de funcionamento. Não consulta candidatos nem executa ações. Não escreva dados pessoais.
            </p>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[12.5px]">
            {!r && !pendente && (
              <div className="grid gap-2">
                <p className="text-text-2">Pergunte, por exemplo:</p>
                {sugestoesDaRota(pathname).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setPergunta(s);
                      enviar(s);
                    }}
                    className="rounded-xl border border-border bg-bg px-3 py-2 text-left text-[12px] font-semibold text-navy"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {feita && (
              <p className="mb-2 rounded-xl bg-navy-bg px-3 py-2 font-semibold text-text">{feita}</p>
            )}
            {pendente && <p className="text-text-2">Procurando no manual...</p>}

            {r && !pendente && (
              <div className="grid gap-3">
                {r.erro ? (
                  <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 font-semibold text-danger">{r.erro}</p>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed text-text">{r.resposta}</p>
                    {r.aviso && <p className="rounded-xl bg-gold-bg px-3 py-2 text-[11.5px] font-semibold text-gold-3">{r.aviso}</p>}
                    {r.fontes.length > 0 && (
                      <details className="rounded-xl border border-border bg-bg">
                        <summary className="cursor-pointer px-3 py-2 text-[11.5px] font-bold text-navy">
                          Ver os trechos do manual usados ({r.fontes.length})
                        </summary>
                        <ul className="grid gap-2 border-t border-border p-3">
                          {r.fontes.map((f) => (
                            <li key={f.id}>
                              <div className="text-[10.5px] font-bold uppercase text-text-3">{f.capitulo} · {f.titulo}</div>
                              <p className="mt-0.5 whitespace-pre-wrap text-[11.5px] text-text-2">{f.texto}</p>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {r.id && (
                      <div className="flex items-center gap-2 text-[11.5px] text-text-3">
                        <span>Ajudou?</span>
                        {[true, false].map((v) => (
                          <button
                            key={String(v)}
                            type="button"
                            disabled={avaliou !== null}
                            onClick={async () => {
                              setAvaliou(v);
                              await avaliarResposta(r.id as string, v);
                            }}
                            className={`rounded-lg border border-border px-2 py-1 font-bold ${
                              avaliou === v ? "bg-navy text-white" : "bg-surface text-text-2"
                            }`}
                          >
                            {v ? "Sim" : "Não"}
                          </button>
                        ))}
                        {avaliou !== null && <span>Obrigado.</span>}
                        {r.restantes !== null && <span className="ml-auto">{r.restantes} restantes hoje</span>}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(pergunta);
              setPergunta("");
            }}
          >
            <input
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              maxLength={400}
              placeholder="Escreva sua dúvida"
              className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-[12.5px]"
            />
            <button
              type="submit"
              disabled={pendente || pergunta.trim().length < 4}
              className="rounded-xl bg-navy px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60"
            >
              Enviar
            </button>
          </form>
        </section>
      )}
    </>
  );
}
