const TEXTO: Record<string, string> = {
  confirmar: "Reprovação confirmada. A candidatura foi encerrada: prepare a devolutiva em Devolutivas.",
  reverter: "Reprovação revertida. O candidato voltou ao processo.",
  pedir_dados: "Pedido registrado. O candidato segue em análise até chegar o dado.",
};

/** Resultado da decisão (vem pela URL: erro lançado chega sem texto ao navegador em produção). */
export function AvisosValidacao({ aviso, erro }: { aviso?: string; erro?: string }) {
  return (
    <>
      {aviso && TEXTO[aviso] && (
        <p role="status" className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-[12.5px] font-bold text-success">
          {TEXTO[aviso]}
        </p>
      )}
      {erro && (
        <p role="alert" className="mb-4 rounded-xl bg-danger-bg px-4 py-3 text-[12.5px] font-bold text-danger">
          Não foi possível salvar a decisão: {erro}
        </p>
      )}
    </>
  );
}
