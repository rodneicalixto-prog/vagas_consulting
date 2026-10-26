"use client";

/**
 * Exportar PDF: abre a impressão do navegador, onde "Salvar como PDF" gera o arquivo.
 * Sem biblioteca nova: o que está na tela é o que sai no papel (o menu e os botões somem na impressão).
 */
export function BotaoPdf({ rotulo = "Exportar PDF", nomeDoArquivo }: { rotulo?: string; nomeDoArquivo?: string }) {
  return (
    <button
      type="button"
      title="Abre a impressão; escolha “Salvar como PDF”"
      onClick={() => {
        // O nome sugerido para o arquivo é o título da página.
        const antes = document.title;
        if (nomeDoArquivo) document.title = nomeDoArquivo;
        window.print();
        document.title = antes;
      }}
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[11.5px] font-bold text-navy hover:border-navy print:hidden"
    >
      {rotulo}
    </button>
  );
}

/** Cabeçalho que só aparece no papel: título, quando foi gerado e de onde. */
export function CabecalhoImpressao({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <div className="mb-4 hidden border-b border-border pb-3 print:block">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-text-3">SOS Vagas · Vagas Consulting</p>
      <p className="text-lg font-extrabold text-text">{titulo}</p>
      <p className="text-[11px] text-text-2">
        {subtitulo ? `${subtitulo} · ` : ""}
        gerado em {new Date().toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
