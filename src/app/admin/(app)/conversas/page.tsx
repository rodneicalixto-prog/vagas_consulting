import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireInternalUser } from "@/lib/auth/internal";
import { empresasParaFiltro, obterEscopo, podeVerEmpresa } from "@/lib/auth/escopo";
import { formatarTelefoneBR, linkWhatsApp } from "@/lib/whatsapp";
import { conversaVisivelParaOperador, rotuloAnexo, type TipoAnexo } from "@/lib/conversas";
import { AtualizarSozinho } from "./atualizar-sozinho";
import { BotaoCopiar } from "./botao-copiar";
import { CaixaSugestao } from "./caixa-sugestao";
import { FormularioEnvio } from "./formulario-envio";
import { assumirConversa, devolverConversa, transferirConversa } from "./actions";

// Envio de arquivo e áudio chama a Evolution e pode levar alguns segundos.
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FUSO = "America/Sao_Paulo";

/** Remove caracteres com significado na sintaxe de filtro do PostgREST. */
function limpar(v: string | undefined): string {
  return (v ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
}

/** Hora se for hoje; senão dd/MM. */
function quando(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const dia = (x: Date) => x.toLocaleDateString("pt-BR", { timeZone: FUSO });
  if (dia(d) === dia(new Date())) {
    return d.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" });
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AUTOR_LABEL: Record<string, string> = {
  candidato: "Candidato",
  operador: "Operador",
  ia: "Assistente",
  sistema: "Sistema",
};

const STATUS_LABEL: Record<string, string> = {
  enviada: "enviada",
  entregue: "entregue",
  lida: "lida",
  falhou: "falhou",
};

export default async function ConversasPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; filtro?: string; q?: string; r?: string }>;
}) {
  const { user, role } = await requireInternalUser("pipeline.manage");
  const sp = await searchParams;
  const admin = createAdminClient();
  const escopo = await obterEscopo(user.id, role);
  const q = limpar(sp.q);
  const soNaoLidas = sp.filtro === "nao-lidas";
  const soFila = sp.filtro === "fila";
  const abertaId = sp.c && UUID.test(sp.c) ? sp.c : null;

  // Conversa aberta: carregada pelo id e validada no servidor.
  let aberta: {
    id: string;
    company_id: string;
    telefone_normalizado: string;
    nome_contato: string | null;
    candidate_id: string | null;
    nao_lidas: number;
    atendente_id: string | null;
  } | null = null;
  if (abertaId) {
    const { data } = await admin
      .from("conversations")
      .select("id, company_id, telefone_normalizado, nome_contato, candidate_id, nao_lidas, atendente_id")
      .eq("id", abertaId)
      .maybeSingle();
    if (data) {
      if (!podeVerEmpresa(escopo, data.company_id)) redirect("/admin/acesso-negado");
      // Sigilo: operador só abre a própria conversa ou a fila de candidatos.
      if (role === "operador" && !conversaVisivelParaOperador(data, user.id)) redirect("/admin/acesso-negado");
      aberta = data;
      if (data.nao_lidas > 0) {
        await admin.from("conversations").update({ nao_lidas: 0 }).eq("id", data.id);
      }
    }
  }

  // Busca por nome: acha candidatos pelo nome e inclui as conversas deles.
  let idsPorNome: string[] = [];
  if (q) {
    const { data: achados } = await admin
      .from("profiles")
      .select("id")
      .ilike("nome_completo", `%${q}%`)
      .limit(100);
    idsPorNome = (achados ?? []).map((p) => p.id);
  }

  const semCarteira = !escopo.todos && escopo.empresas.length === 0;
  let lista: {
    id: string;
    company_id: string;
    telefone_normalizado: string;
    nome_contato: string | null;
    candidate_id: string | null;
    nao_lidas: number;
    ultima_msg_em: string | null;
    ultima_msg_previa: string | null;
    atendente_id: string | null;
  }[] = [];
  if (!semCarteira) {
    let consulta = admin
      .from("conversations")
      .select(
        "id, company_id, telefone_normalizado, nome_contato, candidate_id, nao_lidas, ultima_msg_em, ultima_msg_previa, atendente_id",
      )
      .order("ultima_msg_em", { ascending: false, nullsFirst: false })
      .limit(200);
    if (!escopo.todos) consulta = consulta.in("company_id", empresasParaFiltro(escopo));
    // Operador: só as suas conversas e a fila de candidatos (sigilo entre a equipe).
    if (role === "operador") {
      consulta = consulta.or(`atendente_id.eq.${user.id},and(atendente_id.is.null,candidate_id.not.is.null)`);
    }
    if (soNaoLidas) consulta = consulta.gt("nao_lidas", 0);
    if (soFila) consulta = consulta.is("atendente_id", null);
    if (q) {
      const digitos = q.replace(/\D/g, "");
      const partes = [`nome_contato.ilike.%${q}%`];
      if (digitos.length >= 3) partes.push(`telefone_normalizado.ilike.%${digitos}%`);
      if (idsPorNome.length > 0) partes.push(`candidate_id.in.(${idsPorNome.join(",")})`);
      consulta = consulta.or(partes.join(","));
    }
    const { data } = await consulta;
    lista = data ?? [];
  }

  // Nomes dos candidatos vinculados e das empresas (chip só se houver mais de uma).
  const candIds = [...new Set([...lista.map((c) => c.candidate_id), aberta?.candidate_id].filter(Boolean) as string[])];
  const empresaIds = [...new Set(lista.map((c) => c.company_id))];
  const [{ data: perfisNomes }, { data: empresas }] = await Promise.all([
    candIds.length
      ? admin.from("profiles").select("id, nome_completo").in("id", candIds)
      : Promise.resolve({ data: [] as { id: string; nome_completo: string | null }[] }),
    empresaIds.length
      ? admin.from("companies").select("id, nome_fantasia, razao_social").in("id", empresaIds)
      : Promise.resolve({ data: [] as { id: string; nome_fantasia: string | null; razao_social: string | null }[] }),
  ]);
  // Nomes dos atendentes (fila = sem atendente).
  const atendenteIds = [
    ...new Set([...lista.map((c) => c.atendente_id), aberta?.atendente_id].filter(Boolean) as string[]),
  ];
  const { data: atendentes } = atendenteIds.length
    ? await admin.from("admin_users").select("user_id, nome_exibicao").in("user_id", atendenteIds)
    : { data: [] as { user_id: string; nome_exibicao: string | null }[] };
  const nomeAtendente = new Map((atendentes ?? []).map((a) => [a.user_id, a.nome_exibicao || "Atendente"]));
  const ehGestao = role !== "operador";

  // Equipe da empresa, para a gestão transferir a conversa.
  let equipe: { id: string; nome: string }[] = [];
  if (ehGestao && aberta) {
    const { data: vinculos } = await admin
      .from("company_assignments")
      .select("user_id")
      .eq("company_id", aberta.company_id)
      .eq("ativo", true)
      .in("papel", ["operador", "admin_empresa"]);
    const ids = (vinculos ?? []).map((v) => v.user_id);
    if (ids.length > 0) {
      const { data: nomes } = await admin.from("admin_users").select("user_id, nome_exibicao").in("user_id", ids);
      equipe = (nomes ?? []).map((n) => ({ id: n.user_id, nome: n.nome_exibicao || "Operador" }));
    }
  }

  const nomePerfil = new Map((perfisNomes ?? []).map((p) => [p.id, p.nome_completo]));
  const nomeEmpresa = new Map(
    (empresas ?? []).map((e) => [e.id, e.nome_fantasia || e.razao_social || "Empresa"]),
  );
  const mostraEmpresa = empresaIds.length > 1;

  const nomeDe = (c: { candidate_id: string | null; nome_contato: string | null; telefone_normalizado: string }) =>
    (c.candidate_id ? nomePerfil.get(c.candidate_id) : null) ||
    c.nome_contato ||
    formatarTelefoneBR(c.telefone_normalizado);

  // Mensagens e descadastro da conversa aberta.
  let mensagens: {
    id: string;
    direcao: string;
    autor: string;
    texto: string;
    status: string;
    erro: string | null;
    created_at: string;
    tipo: string;
    anexo_path: string | null;
    anexo_nome: string | null;
    resposta_a: string | null;
  }[] = [];
  let descadastrado = false;
  let empresaDaAberta: string | null = null;
  if (aberta) {
    const [{ data: msgs }, { data: optOut }, { data: emp }] = await Promise.all([
      admin
        .from("conversation_messages")
        .select("id, direcao, autor, texto, status, erro, created_at, tipo, anexo_path, anexo_nome, resposta_a")
        .eq("conversation_id", aberta.id)
        .order("created_at", { ascending: false })
        .limit(300),
      admin
        .from("channel_opt_outs")
        .select("id")
        .eq("canal", "whatsapp")
        .eq("telefone_normalizado", aberta.telefone_normalizado)
        .or(`company_id.eq.${aberta.company_id},company_id.is.null`)
        .limit(1),
      admin.from("companies").select("nome_fantasia, razao_social").eq("id", aberta.company_id).maybeSingle(),
    ]);
    mensagens = msgs ?? []; // já em ordem decrescente: o mais novo fica embaixo (flex-col-reverse)
    descadastrado = (optOut ?? []).length > 0;
    empresaDaAberta = emp?.nome_fantasia || emp?.razao_social || null;
  }

  // Sugestão pendente do assistente: só o atendente da conversa vê.
  let sugestao: { id: string; rascunho: string; motivo_parada: string | null; fonte: string[] } | null = null;
  if (aberta && (aberta.atendente_id === user.id || aberta.atendente_id === null)) {
    const { data: s } = await admin
      .from("ai_suggestions")
      .select("id, rascunho, motivo_parada, fonte")
      .eq("conversation_id", aberta.id)
      .eq("estado", "pendente")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (s) {
      sugestao = {
        id: s.id,
        rascunho: s.rascunho,
        motivo_parada: s.motivo_parada,
        fonte: Array.isArray(s.fonte) ? (s.fonte as unknown[]).map(String) : [],
      };
    }
  }

  const href = (c?: string | null, filtro?: string | null, r?: string | null) => {
    const p = new URLSearchParams();
    if (c) p.set("c", c);
    if (filtro) p.set("filtro", filtro);
    if (q) p.set("q", q);
    if (r) p.set("r", r);
    const s = p.toString();
    return `/admin/conversas${s ? `?${s}` : ""}`;
  };

  // Mensagem que está sendo respondida (?r=): precisa ser da conversa aberta.
  const alvoResposta = sp.r && UUID.test(sp.r) ? mensagens.find((m) => m.id === sp.r) ?? null : null;
  const resumoDe = (m: { texto: string; tipo: string; anexo_nome: string | null }) =>
    m.tipo === "texto" ? m.texto.slice(0, 120) : rotuloAnexo(m.tipo as TipoAnexo, m.anexo_nome);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AtualizarSozinho />
      <div className={`shrink-0 px-4 md:px-9 pt-7 pb-3 ${aberta ? "hidden md:block" : ""}`}>
        <h1 className="text-xl font-extrabold text-text">Conversas</h1>
        <p className="mt-1 text-xs text-text-2">
          WhatsApp com candidatos. Só sai mensagem para quem respondeu, tem candidatura em andamento ou consentiu.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-0 px-0 md:grid-cols-[320px_1fr] md:px-9 md:pb-6">
        {/* Lista */}
        <aside
          className={`min-h-0 h-full flex-col overflow-hidden border-border bg-surface md:rounded-l-2xl md:border ${
            aberta ? "hidden md:flex" : "flex"
          }`}
        >
          <form className="flex gap-2 border-b border-border p-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Nome ou telefone"
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px]"
            />
            {soNaoLidas && <input type="hidden" name="filtro" value="nao-lidas" />}
            <button type="submit" className="rounded-lg bg-navy px-3 py-1.5 text-[12px] font-bold text-white">
              Buscar
            </button>
          </form>
          <div className="flex gap-1 border-b border-border px-2 py-1.5 text-[11px] font-bold">
            <Link
              href={href(aberta?.id, null)}
              className={`rounded-full px-2.5 py-1 ${!soNaoLidas ? "bg-navy text-white" : "text-text-2"}`}
            >
              Todas
            </Link>
            <Link
              href={href(aberta?.id, "nao-lidas")}
              className={`rounded-full px-2.5 py-1 ${soNaoLidas ? "bg-navy text-white" : "text-text-2"}`}
            >
              Não lidas
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {semCarteira && (
              <p className="px-3 py-4 text-xs text-text-2">
                Você ainda não tem empresas na carteira, então não há conversas para mostrar.
              </p>
            )}
            {!semCarteira && lista.length === 0 && (
              <p className="px-3 py-4 text-xs text-text-2">
                {q || soNaoLidas
                  ? "Nenhuma conversa com esse filtro."
                  : "Nenhuma conversa ainda. Use o botão Conversar em Contatos para iniciar uma."}
              </p>
            )}
            {lista.map((c) => {
              const ativa = aberta?.id === c.id;
              const naoLidas = ativa ? 0 : c.nao_lidas;
              return (
                <Link
                  key={c.id}
                  href={href(c.id, soNaoLidas ? "nao-lidas" : null)}
                  className={`block border-b border-border px-3 py-2 ${ativa ? "bg-navy/5" : "hover:bg-black/[0.03]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-[12.5px] ${naoLidas > 0 ? "font-extrabold" : "font-bold"} text-text`}>
                      {nomeDe(c)}
                    </span>
                    <span className="shrink-0 text-[10px] text-text-3">{quando(c.ultima_msg_em)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[11.5px] text-text-2">
                      {!c.atendente_id
                        ? "● Fila · "
                        : c.atendente_id === user.id
                          ? ""
                          : `${nomeAtendente.get(c.atendente_id) ?? "Outro"} · `}
                      {c.ultima_msg_previa ?? "Sem mensagens"}
                    </span>
                    {naoLidas > 0 && (
                      <span className="shrink-0 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                        {naoLidas}
                      </span>
                    )}
                  </div>
                  {mostraEmpresa && (
                    <span className="mt-1 inline-block max-w-full truncate rounded bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-bold text-text-2">
                      {nomeEmpresa.get(c.company_id) ?? "Empresa"}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Conversa */}
        <section
          className={`min-h-0 h-full flex-col overflow-hidden border-border bg-surface md:rounded-r-2xl md:border md:border-l-0 ${
            aberta ? "flex" : "hidden md:flex"
          }`}
        >
          {!aberta ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-text-2">
              {abertaId
                ? "Conversa não encontrada."
                : "Selecione uma conversa à esquerda para ver as mensagens."}
            </div>
          ) : (
            <>
              <header className="shrink-0 border-b border-border px-4 py-2.5">
                <Link href={href(null, soNaoLidas ? "nao-lidas" : null)} className="text-[11px] font-bold text-navy md:hidden">
                  ← Conversas
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[14px] font-extrabold text-text">{nomeDe(aberta)}</span>
                  {(() => {
                    const wa = linkWhatsApp(aberta.telefone_normalizado);
                    const tel = formatarTelefoneBR(aberta.telefone_normalizado);
                    return wa ? (
                      <a href={wa} target="_blank" rel="noreferrer" className="text-[12px] font-bold text-success underline">
                        {tel}
                      </a>
                    ) : (
                      <span className="text-[12px] text-text-2">{tel}</span>
                    );
                  })()}
                  {aberta.candidate_id && (
                    <Link href={`/admin/candidatos/${aberta.candidate_id}`} className="text-[12px] font-bold text-navy underline">
                      Ver candidato
                    </Link>
                  )}
                  {mostraEmpresa && empresaDaAberta && (
                    <span className="rounded bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-bold text-text-2">
                      {empresaDaAberta}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px]">
                  {!aberta.atendente_id ? (
                    <span className="rounded bg-gold-bg px-2 py-0.5 font-bold text-gold-3">Na fila · sem atendente</span>
                  ) : aberta.atendente_id === user.id ? (
                    <span className="rounded bg-success-bg px-2 py-0.5 font-bold text-success">Você está atendendo</span>
                  ) : (
                    <span className="rounded bg-navy-bg px-2 py-0.5 font-bold text-navy">
                      Em atendimento: {nomeAtendente.get(aberta.atendente_id) ?? "outra pessoa"}
                    </span>
                  )}
                  {(!aberta.atendente_id || (ehGestao && aberta.atendente_id !== user.id)) && (
                    <form action={assumirConversa}>
                      <input type="hidden" name="conversation_id" value={aberta.id} />
                      <button className="rounded-lg bg-navy px-3 py-1 font-bold text-white">
                        {aberta.atendente_id ? "Assumir (retomar)" : "Assumir conversa"}
                      </button>
                    </form>
                  )}
                  {aberta.atendente_id && (aberta.atendente_id === user.id || ehGestao) && (
                    <form action={devolverConversa}>
                      <input type="hidden" name="conversation_id" value={aberta.id} />
                      <button className="rounded-lg border border-border px-3 py-1 font-bold text-text-2">
                        Devolver à fila
                      </button>
                    </form>
                  )}
                  {ehGestao && equipe.length > 0 && (
                    <form action={transferirConversa} className="flex items-center gap-1">
                      <input type="hidden" name="conversation_id" value={aberta.id} />
                      <select
                        name="para_user_id"
                        defaultValue=""
                        required
                        className="rounded-lg border border-border bg-surface px-2 py-1"
                      >
                        <option value="" disabled>
                          Transferir para…
                        </option>
                        {equipe.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-lg border border-border px-3 py-1 font-bold text-text-2">Transferir</button>
                    </form>
                  )}
                </div>
                {descadastrado && (
                  <p className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11.5px] font-bold text-red-700">
                    Esta pessoa pediu para não receber mensagens (descadastro). O envio está bloqueado.
                  </p>
                )}
              </header>

              <div className="flex min-h-0 flex-1 flex-col-reverse gap-1.5 overflow-y-auto px-4 py-3">
                {mensagens.length === 0 && (
                  <p className="m-auto text-xs text-text-2">Nenhuma mensagem nesta conversa ainda.</p>
                )}
                {mensagens.map((m) => {
                  const saida = m.direcao === "saida";
                  const citada = m.resposta_a ? mensagens.find((x) => x.id === m.resposta_a) : null;
                  const urlAnexo = m.anexo_path ? `/api/admin/conversas/anexo/${m.id}` : null;
                  // Legenda só aparece se for texto de verdade (não o rótulo automático).
                  const legenda =
                    m.tipo === "texto" || m.texto === rotuloAnexo(m.tipo as TipoAnexo, m.anexo_nome) ? null : m.texto;
                  return (
                    <div key={m.id} className={`flex ${saida ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[12.5px] ${
                          saida ? "bg-navy text-white" : "bg-black/[0.06] text-text"
                        } ${m.status === "falhou" ? "ring-1 ring-red-400" : ""}`}
                      >
                        {m.resposta_a && (
                          <p
                            className={`mb-1 truncate rounded border-l-2 px-2 py-1 text-[11px] ${
                              saida ? "border-white/60 bg-white/10 text-white/80" : "border-navy bg-black/[0.05] text-text-2"
                            }`}
                          >
                            {citada ? resumoDe(citada) : "Mensagem anterior"}
                          </p>
                        )}
                        {m.tipo === "texto" && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
                        {m.tipo !== "texto" && urlAnexo && (
                          <div className="space-y-1">
                            {m.tipo === "imagem" && (
                              <a href={urlAnexo} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={urlAnexo}
                                  alt="Imagem recebida"
                                  loading="lazy"
                                  className="max-h-64 max-w-full rounded-lg"
                                />
                              </a>
                            )}
                            {m.tipo === "audio" && <audio controls preload="none" src={urlAnexo} className="max-w-full" />}
                            {m.tipo === "video" && (
                              <video controls preload="none" src={urlAnexo} className="max-h-64 max-w-full rounded-lg" />
                            )}
                            {m.tipo === "documento" && (
                              <a href={urlAnexo} className="font-bold underline">
                                📎 {m.anexo_nome ?? "Documento"}
                              </a>
                            )}
                            {legenda && <p className="whitespace-pre-wrap break-words">{legenda}</p>}
                          </div>
                        )}
                        {m.tipo !== "texto" && !urlAnexo && (
                          <p className="break-words italic opacity-80">
                            {m.texto} <span className="not-italic">(arquivo indisponível)</span>
                          </p>
                        )}
                        <p className={`mt-0.5 text-[10px] ${saida ? "text-white/70" : "text-text-3"}`}>
                          {AUTOR_LABEL[m.autor] ?? m.autor} · {dataHora(m.created_at)}
                          {saida && ` · ${STATUS_LABEL[m.status] ?? m.status}`}
                        </p>
                        {m.autor !== "sistema" && (
                          <p className={`mt-0.5 flex gap-3 text-[10.5px] ${saida ? "text-white/80" : "text-text-2"}`}>
                            <Link
                              href={href(aberta.id, soNaoLidas ? "nao-lidas" : null, m.id)}
                              className="font-bold underline-offset-2 hover:underline"
                            >
                              Responder
                            </Link>
                            {m.tipo === "texto" && <BotaoCopiar texto={m.texto} />}
                          </p>
                        )}
                        {m.status === "falhou" && (
                          <p className="mt-0.5 text-[10.5px] font-bold text-red-200">
                            Falhou{m.erro ? `: ${m.erro}` : "."}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {sugestao && (
                <CaixaSugestao
                  key={sugestao.id}
                  id={sugestao.id}
                  rascunho={sugestao.rascunho}
                  motivo={sugestao.motivo_parada}
                  fonte={sugestao.fonte}
                  conversationId={aberta.id}
                  somenteLeitura={aberta.atendente_id !== user.id}
                />
              )}
              <FormularioEnvio
                conversationId={aberta.id}
                descadastrado={descadastrado}
                semAtendente={aberta.atendente_id !== user.id}
                respondendo={
                  alvoResposta
                    ? {
                        id: alvoResposta.id,
                        resumo: resumoDe(alvoResposta),
                        limparHref: href(aberta.id, soNaoLidas ? "nao-lidas" : null),
                      }
                    : null
                }
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
