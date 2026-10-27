import Link from "next/link";
import { requireInternalUser } from "@/lib/auth/internal";
import { exigirVaga, obterEscopo } from "@/lib/auth/escopo";
import { createAdminClient } from "@/lib/supabase/admin";
import { ListaValidacoes } from "../../../validacoes/lista-validacoes";
import { AvisosValidacao } from "../../../validacoes/avisos";

/** Reprovações apontadas pela IA nesta vaga. O acesso à vaga já foi validado pelo layout. */
export default async function ValidacoesDaVagaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string; erro?: string; todos?: string }>;
}) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const { id } = await params;
  await exigirVaga(await obterEscopo(user.id, role), id);
  const { aviso, erro, todos } = await searchParams;
  const incluir = todos === "1";

  // Rede de segurança: eliminado pela triagem que não tem NENHUM caso na fila (falha ou dado antigo).
  // Esses candidatos não podem ficar reprovados sem passar por uma pessoa.
  const admin = createAdminClient();
  const [{ data: eliminados }, { data: casos }] = await Promise.all([
    admin.from("job_screenings").select("application_id").eq("job_id", id).eq("eliminado", true).limit(2000),
    admin.from("validacoes_reprovacao").select("application_id").eq("job_id", id).limit(5000),
  ]);
  const comCaso = new Set((casos ?? []).map((c) => c.application_id));
  const semCaso = (eliminados ?? []).filter((e) => !comCaso.has(e.application_id)).length;

  return (
    <div className="h-full overflow-y-auto px-4 md:px-9 py-6">
      <h1 className="text-xl font-extrabold text-text">Validação de reprovações</h1>
      <p className="mt-1 mb-4 text-xs text-text-2">
        A IA aponta, você decide. O candidato só recebe resposta depois da sua decisão.
      </p>
      {semCaso > 0 && (
        <p role="alert" className="mb-4 rounded-xl bg-danger-bg px-4 py-3 text-[12.5px] font-bold text-danger">
          {semCaso} candidato(s) foram eliminados pela triagem sem caso na fila. Eles não podem ficar reprovados sem a sua decisão:{" "}
          <Link href={`/admin/vagas/${id}/triagem`} className="underline">
            refaça a triagem desta vaga
          </Link>{" "}
          para abrir os casos.
        </p>
      )}
      <AvisosValidacao aviso={aviso} erro={erro} />
      <ListaValidacoes
        jobIds={[id]}
        incluirDecididos={incluir}
        volta={`/admin/vagas/${id}/validacoes${incluir ? "?todos=1" : ""}`}
        mostrarVaga={false}
      />
    </div>
  );
}
