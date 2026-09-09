import { createClient } from "@/lib/supabase/server";

function iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default async function MensagensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: mensagens } = await supabase
    .from("messages")
    .select(
      "id, conteudo, created_at, lida, remetente_id, application_id, applications(jobs(titulo, companies(nome_fantasia, razao_social)))",
    )
    .or(`remetente_id.eq.${user!.id},destinatario_id.eq.${user!.id}`)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-3 pb-8 pt-6 md:pt-8">
      <h1 className="px-5 text-[19px] font-extrabold text-navy md:px-8">Mensagens</h1>

      {mensagens && mensagens.length > 0 ? (
        <div className="flex flex-col px-5 md:px-8">
          {mensagens.map((m, i) => {
            const empresa =
              m.applications?.jobs?.companies?.nome_fantasia ??
              m.applications?.jobs?.companies?.razao_social ??
              "Empresa";
            return (
              <div
                key={m.id}
                className={`flex items-center gap-3 py-3 ${
                  i !== mensagens.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-navy-bg text-sm font-extrabold text-navy">
                  {iniciais(empresa)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="truncate text-[13.5px] font-extrabold">{empresa}</h4>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] font-bold text-gold-3">
                    {m.applications?.jobs?.titulo}
                  </div>
                  <div
                    className={`mt-0.5 truncate text-xs ${
                      !m.lida && m.remetente_id !== user!.id ? "font-bold text-text" : "text-text-2"
                    }`}
                  >
                    {m.remetente_id === user!.id && "Você: "}
                    {m.conteudo}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="px-5 text-[12.5px] text-text-3 md:px-8">
          Nenhuma mensagem ainda. Conversas com empresas aparecem aqui quando
          um processo seletivo avança.
        </p>
      )}
    </div>
  );
}
