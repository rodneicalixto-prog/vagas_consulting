import Link from "next/link";
import { requireInternalUser } from "@/lib/auth/internal";
import { obterEscopo, vagasVisiveis } from "@/lib/auth/escopo";
import { ListaValidacoes } from "./lista-validacoes";
import { AvisosValidacao } from "./avisos";

/** Fila geral: toda reprovação apontada pela IA que espera a decisão de uma pessoa. */
export default async function ValidacoesPage({ searchParams }: { searchParams: Promise<{ aviso?: string; erro?: string; todos?: string }> }) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const { aviso, erro, todos } = await searchParams;
  const escopo = await obterEscopo(user.id, role);
  // Carteira e sigilo: só as vagas que esta pessoa pode ver (vaga confidencial exige acesso).
  const jobIds = await vagasVisiveis(escopo);
  const incluir = todos === "1";

  return (
    <div className="h-full overflow-y-auto px-4 md:px-9 py-7">
      <h1 className="text-xl font-extrabold text-text">Validação de reprovações</h1>
      <p className="mt-1 mb-4 text-xs text-text-2">
        Casos em que a IA apontou &quot;não segue&quot;. Nenhum candidato é reprovado nem recebe resposta sem a sua decisão.
      </p>
      <div className="mb-4 flex gap-3 text-[12px] font-bold">
        <Link href="/admin/validacoes" className={incluir ? "text-text-2 underline" : "text-navy underline"}>
          Aguardando decisão
        </Link>
        <Link href="/admin/validacoes?todos=1" className={incluir ? "text-navy underline" : "text-text-2 underline"}>
          Incluir já decididos
        </Link>
      </div>
      <AvisosValidacao aviso={aviso} erro={erro} />
      <ListaValidacoes jobIds={jobIds} incluirDecididos={incluir} volta={incluir ? "/admin/validacoes?todos=1" : "/admin/validacoes"} mostrarVaga />
    </div>
  );
}
