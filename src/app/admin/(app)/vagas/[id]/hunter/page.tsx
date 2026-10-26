import { notFound } from "next/navigation";
import { requireInternalUser } from "@/lib/auth/internal";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitButton } from "@/components/form-buttons";
import { normalizarCriterios } from "@/lib/vaga-estruturada";
import { bloqueiosDaTriagem, type ResultadoTriagem } from "@/lib/triagem";
import { normalizarRegras } from "@/lib/regras-vaga";
import { linkWhatsApp, formatarTelefoneBR } from "@/lib/whatsapp";
import {
  DIAS_RETENCAO,
  FONTES,
  ROTULO_ESTADO,
  ROTULO_FONTE,
  dentroDaJanela,
  temBloqueio,
  verificarMensagem,
  type CanalHunter,
  type EstadoProspect,
  type Fit,
  type FonteHunter,
} from "@/lib/hunter";
import { linkRastreado, restanteHoje } from "@/lib/hunter-servidor";
import {
  aprovarMensagens,
  avaliarProspects,
  descartarProspect,
  editarMensagem,
  gerarMensagens,
  importarProspects,
  marcarEnviado,
  registrarSaida,
} from "./actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPO = "w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-navy";
const BTN = "rounded-xl bg-navy px-4 py-2 text-[12.5px] font-bold text-white";
const BTN2 = "rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-bold text-navy";

const COR_FIT: Record<Fit, string> = {
  alto: "bg-success-bg text-success",
  medio: "bg-gold-bg text-gold-3",
  baixo: "bg-danger-bg text-danger",
  nao_avaliado: "bg-black/5 text-text-3",
};
const ROTULO_FIT: Record<Fit, string> = { alto: "Alto encaixe", medio: "Encaixe médio", baixo: "Baixo encaixe", nao_avaliado: "Não avaliado" };

type Q = Record<string, string | undefined>;

function Avisos({ q }: { q: Q }) {
  const itens: { texto: string; erro?: boolean }[] = [];
  if (q.erro) itens.push({ texto: q.erro, erro: true });
  if (q.importados !== undefined)
    itens.push({
      texto: `Importados: ${q.importados}. Já estavam na vaga: ${q.repetidos ?? 0}. Pediram para não ser contactados: ${q.bloqueados ?? 0}. Sem contato válido: ${q.ignorados ?? 0}.${q.truncada ? " A planilha passou do limite e foi cortada." : ""}`,
    });
  if (q.avaliados !== undefined) itens.push({ texto: `Avaliados: ${q.avaliados}. Falhas: ${q.falhas ?? 0}. Rode de novo para os próximos.` });
  if (q.geradas !== undefined) itens.push({ texto: `Mensagens geradas: ${q.geradas}. Sem o contato do canal escolhido: ${q.semContato ?? 0}.` });
  if (q.aprovadas !== undefined)
    itens.push({ texto: `Aprovadas: ${q.aprovadas}. Barradas pela verificação ou por pedido de saída: ${q.barradas ?? 0}. Fora do teto de hoje: ${q.foraDoTeto ?? 0}.` });
  if (q.enviado) itens.push({ texto: `Envio registrado. A contagem de ${DIAS_RETENCAO} dias começou.` });
  if (q.saida) itens.push({ texto: "Pedido de saída registrado: os dados foram apagados e o contato está bloqueado." });
  if (q.editada) itens.push({ texto: "Mensagem atualizada. A verificação roda de novo ao aprovar." });
  return (
    <>
      {itens.map((i, k) => (
        <p
          key={k}
          role={i.erro ? "alert" : "status"}
          className={`mb-3 rounded-xl px-4 py-3 text-[12.5px] font-bold ${i.erro ? "bg-danger-bg text-danger" : "bg-success-bg text-success"}`}
        >
          {i.texto}
        </p>
      ))}
    </>
  );
}

/** Hunter: prospects da vaga. A IA avalia às cegas; a pessoa aprova e envia pelo número dedicado. */
export default async function HunterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Q> }) {
  await requireInternalUser("pipeline.manage");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const q = await searchParams;

  const admin = createAdminClient();
  const { data: vaga } = await admin
    .from("jobs")
    .select("id, titulo, confidencial, criterios, regras_ia, companies(nome_fantasia, razao_social)")
    .eq("id", id)
    .maybeSingle();
  if (!vaga) notFound();
  const emp = Array.isArray(vaga.companies) ? vaga.companies[0] : vaga.companies;
  const nomeEmpresa = emp?.nome_fantasia || emp?.razao_social || null;
  const criterios = normalizarCriterios(vaga.criterios);
  const pendenciasCriterios = bloqueiosDaTriagem(criterios);
  const regras = normalizarRegras(vaga.regras_ia);

  const { data: prospects } = await admin
    .from("hunter_prospects")
    .select("id, fonte, nome, telefone, email, cidade, estado, fit, pontuacao, resultado, canal, texto, token, enviada_em, anonimizado_em, created_at")
    .eq("job_id", id)
    .order("created_at", { ascending: false })
    .limit(300);
  const lista = prospects ?? [];
  const ativos = lista.filter((p) => !p.anonimizado_em);
  const novos = ativos.filter((p) => p.estado === "novo").length;
  const avaliadosAlto = ativos.filter((p) => p.estado === "avaliado" && p.fit === "alto").length;
  const prontas = ativos.filter((p) => p.estado === "mensagem_pronta").length;
  const aprovadas = ativos.filter((p) => p.estado === "aprovado").length;

  const hoje = await restanteHoje();
  const naJanela = dentroDaJanela(new Date(), regras.horario_inicio, regras.horario_fim);

  return (
    <div className="h-full overflow-y-auto px-4 md:px-9 py-6">
      <h1 className="text-xl font-extrabold text-text">Hunter</h1>
      <p className="mt-1 text-xs text-text-2">
        {vaga.titulo}. A IA avalia o perfil às cegas contra os critérios; você aprova a mensagem e envia pelo número dedicado. Nada sai sozinho.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">WhatsApp hoje</p>
          <p className="mt-1 text-lg font-extrabold text-text">
            {hoje.enviados} de {hoje.teto}
          </p>
          <p className="text-[11.5px] text-text-2">Restam {hoje.restante} (teto diário da linha dedicada).</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">Janela de contato</p>
          <p className="mt-1 text-lg font-extrabold text-text">
            {regras.horario_inicio || "08:00"} às {regras.horario_fim || "20:00"}
          </p>
          <p className={`text-[11.5px] font-bold ${naJanela ? "text-success" : "text-danger"}`}>{naJanela ? "Dentro da janela agora." : "Fora da janela agora: não envie."}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-text-3">Dados dos prospects</p>
          <p className="mt-1 text-lg font-extrabold text-text">{DIAS_RETENCAO} dias</p>
          <p className="text-[11.5px] text-text-2">Quem não responder tem os dados apagados. Pedido de saída apaga na hora.</p>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-navy-bg px-4 py-3 text-[12px] text-text-2">
        <b className="text-text">LGPD.</b> Use só contatos de fonte permitida: exportação do seu plano ou candidato cadastrado. A mensagem diz quem somos, de onde veio
        o dado e como sair (&quot;responda SAIR&quot;). {vaga.confidencial ? "Vaga sigilosa: a mensagem não cita a empresa." : ""}
      </p>

      <div className="mt-4">
        <Avisos q={q} />
      </div>

      {pendenciasCriterios.length > 0 && (
        <p role="alert" className="mb-4 rounded-xl bg-gold-bg px-4 py-3 text-[12.5px] font-bold text-gold-3">
          Para avaliar, ajuste os critérios da vaga: {pendenciasCriterios.join(" ")}
        </p>
      )}

      <section className="mt-2 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-extrabold text-text">1. Trazer prospects</h2>
        <form action={importarProspects} className="mt-3 grid gap-3">
          <input type="hidden" name="job_id" value={id} />
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">De onde vêm os dados</span>
            <select name="fonte" defaultValue="csv" className={CAMPO}>
              {FONTES.map((f) => (
                <option key={f} value={f}>
                  {ROTULO_FONTE[f]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold text-text-2">
              Planilha: cole aqui o conteúdo do CSV (até 200 linhas). Cabeçalho com telefone e/ou e-mail, por exemplo: nome;telefone;email;cargo;resumo
            </span>
            <textarea name="planilha" rows={5} className={`${CAMPO} font-mono text-[12px]`} placeholder={"nome;telefone;email;cargo;resumo\nAna Souza;(11) 99999-8888;ana@mail.com;Analista de Logística;8 anos em expedição e WMS"} />
          </label>
          <details>
            <summary className="cursor-pointer text-[11.5px] font-bold text-navy">Ou cadastrar uma pessoa só</summary>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <input name="nome" placeholder="Nome" className={CAMPO} />
              <input name="telefone" placeholder="Telefone com DDD" className={CAMPO} />
              <input name="email" placeholder="E-mail" className={CAMPO} />
              <input name="cidade" placeholder="Cidade" className={CAMPO} />
              <input name="cargo" placeholder="Cargo atual" className={`${CAMPO} md:col-span-2`} />
              <textarea name="perfil" rows={3} placeholder="Resumo profissional (sem dados de família, endereço ou contato)" className={`${CAMPO} md:col-span-2`} />
            </div>
          </details>
          <div>
            <SubmitButton pendingLabel="Importando..." className={BTN}>
              Importar
            </SubmitButton>
          </div>
        </form>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-extrabold text-text">2. Avaliar e preparar as mensagens</h2>
        <div className="mt-3 flex flex-wrap items-start gap-3">
          <form action={avaliarProspects}>
            <input type="hidden" name="job_id" value={id} />
            <SubmitButton pendingLabel="Avaliando..." disabled={novos === 0 || pendenciasCriterios.length > 0} className={`${BTN} disabled:opacity-40`}>
              Avaliar às cegas ({novos} novos)
            </SubmitButton>
          </form>
          <form action={gerarMensagens} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="job_id" value={id} />
            <select name="canal" className="rounded-xl border border-border bg-bg px-3 py-2 text-[12.5px]" defaultValue="whatsapp">
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
            </select>
            <label className="flex items-center gap-1 text-[11.5px] text-text-2">
              <input type="checkbox" name="incluir_medio" value="sim" /> incluir encaixe médio
            </label>
            <SubmitButton pendingLabel="Gerando..." disabled={avaliadosAlto === 0} className={`${BTN} disabled:opacity-40`}>
              Gerar mensagens ({avaliadosAlto} com alto encaixe)
            </SubmitButton>
          </form>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-text">3. Aprovar e enviar</h2>
          <form id="form-aprovar" action={aprovarMensagens}>
            <input type="hidden" name="job_id" value={id} />
            <SubmitButton pendingLabel="Aprovando..." disabled={prontas === 0} className={`${BTN} disabled:opacity-40`}>
              Aprovar as marcadas ({prontas} prontas)
            </SubmitButton>
          </form>
        </div>
        <p className="mt-1 text-[11.5px] text-text-2">
          Aprovadas: {aprovadas}. Para enviar, use o botão &quot;Abrir no WhatsApp&quot; no celular ou computador do número dedicado e depois marque como enviado.
        </p>

        {ativos.length === 0 ? (
          <p className="mt-4 rounded-xl bg-bg px-4 py-6 text-center text-[12.5px] text-text-2">Nenhum prospect ainda. Comece pelo passo 1.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {ativos.map((p) => {
              const estado = p.estado as EstadoProspect;
              const fit = p.fit as Fit;
              const canal = (p.canal === "email" ? "email" : "whatsapp") as CanalHunter;
              const verificacoes =
                p.texto && (estado === "mensagem_pronta" || estado === "aprovado")
                  ? verificarMensagem(p.texto, { canal, vagaSigilosa: !!vaga.confidencial, nomeEmpresa, link: linkRastreado(p.token) })
                  : [];
              const resumo = (p.resultado as ResultadoTriagem | null)?.resumo ?? "";
              const wa = linkWhatsApp(p.telefone, p.texto);
              return (
                <li key={p.id} className="rounded-xl border border-border bg-bg/50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {estado === "mensagem_pronta" && (
                      <input type="checkbox" name="ids" value={p.id} form="form-aprovar" aria-label={`Aprovar ${p.nome || "prospect"}`} disabled={temBloqueio(verificacoes)} />
                    )}
                    <b className="text-[13px] text-text">{p.nome || "Sem nome"}</b>
                    <span className="text-[11px] text-text-3">{ROTULO_FONTE[p.fonte as FonteHunter] ?? p.fonte}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${COR_FIT[fit]}`}>
                      {ROTULO_FIT[fit]}
                      {p.pontuacao !== null ? ` · ${p.pontuacao}` : ""}
                    </span>
                    <span className="rounded-full bg-navy-bg px-2 py-0.5 text-[10px] font-extrabold text-navy">{ROTULO_ESTADO[estado]}</span>
                    <span className="ml-auto text-[11px] text-text-3">
                      {p.telefone ? formatarTelefoneBR(p.telefone) : ""}
                      {p.telefone && p.email ? " · " : ""}
                      {p.email ?? ""}
                    </span>
                  </div>
                  {resumo && <p className="mt-1 text-[12px] text-text-2">{resumo}</p>}

                  {verificacoes.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {verificacoes.map((v) => (
                        <li
                          key={v.id}
                          title={v.mensagem}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${v.nivel === "ok" ? "bg-success-bg text-success" : v.nivel === "aviso" ? "bg-gold-bg text-gold-3" : "bg-danger-bg text-danger"}`}
                        >
                          {v.nivel === "ok" ? "OK" : v.nivel === "aviso" ? "Aviso" : "Bloqueia"}: {v.mensagem}
                        </li>
                      ))}
                    </ul>
                  )}

                  {estado === "mensagem_pronta" && (
                    <form action={editarMensagem} className="mt-2 grid gap-2">
                      <input type="hidden" name="job_id" value={id} />
                      <input type="hidden" name="id" value={p.id} />
                      <textarea name="texto" rows={6} defaultValue={p.texto} className={`${CAMPO} text-[12px]`} />
                      <div>
                        <SubmitButton pendingLabel="Salvando..." className={BTN2}>
                          Salvar texto
                        </SubmitButton>
                      </div>
                    </form>
                  )}

                  {estado === "aprovado" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {canal === "whatsapp" && wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-success px-3 py-1.5 text-[11.5px] font-bold text-white">
                          Abrir no WhatsApp
                        </a>
                      )}
                      {canal === "email" && p.email && (
                        <a
                          href={`mailto:${p.email}?subject=${encodeURIComponent(p.texto.split("\n")[0].replace(/^Assunto:\s*/, ""))}&body=${encodeURIComponent(p.texto.split("\n").slice(2).join("\n"))}`}
                          className="rounded-lg bg-success px-3 py-1.5 text-[11.5px] font-bold text-white"
                        >
                          Abrir no e-mail
                        </a>
                      )}
                      <form action={marcarEnviado}>
                        <input type="hidden" name="job_id" value={id} />
                        <input type="hidden" name="id" value={p.id} />
                        <SubmitButton pendingLabel="Registrando..." className={BTN2}>
                          Marcar como enviado
                        </SubmitButton>
                      </form>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {["novo", "avaliado", "mensagem_pronta", "aprovado"].includes(estado) && (
                      <form action={descartarProspect}>
                        <input type="hidden" name="job_id" value={id} />
                        <input type="hidden" name="id" value={p.id} />
                        <SubmitButton pendingLabel="..." className="text-[11px] font-bold text-text-3 underline">
                          Descartar
                        </SubmitButton>
                      </form>
                    )}
                    <form action={registrarSaida}>
                      <input type="hidden" name="job_id" value={id} />
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton pendingLabel="..." className="text-[11px] font-bold text-danger underline">
                        Pediu para sair (apagar e bloquear)
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
