/**
 * Ciclo de R&S de uma vaga: etapas, estado de cada uma e próximo passo.
 * Puro: sem banco nem rede. Spec: docs/specs/CENTRAL_DA_VAGA.md.
 */

export type ChaveEtapa =
  | "criterios"
  | "divulgacao"
  | "abordagem"
  | "hunter"
  | "triagem"
  | "validacoes"
  | "entrevista"
  | "testes"
  | "laudos"
  | "devolutivas"
  | "ofertas";

export type EstadoEtapa = "concluida" | "andamento" | "pendente" | "bloqueada" | "opcional";

export type ContagensVaga = {
  statusVaga: string;
  candidaturas: number;
  criteriosConfirmados: boolean;
  /** Critérios com bloqueio na verificação de qualidade (impede triagem e divulgação). */
  criteriosBloqueados: boolean;
  triados: number;
  /** Reprovações apontadas pela IA que esperam decisão de uma pessoa. */
  validacoesPendentes: number;
  fichasFechadas: number;
  testesAprovados: number;
  laudosAssinados: number;
  devolutivasEnviadas: number;
  ofertas: number;
  abordagens: number;
  /** Prospects captados pelo hunter (sem os já apagados). */
  prospects: number;
};

export type DefinicaoEtapa = {
  chave: ChaveEtapa;
  rotulo: string;
  /** Sufixo do caminho depois de `/admin/vagas/[id]`. */
  sufixo: string;
  descricao: string;
};

/** Ordem do ciclo. Abordagem fica ao lado: roda antes da triagem, para quem não se candidatou. */
export const ETAPAS: DefinicaoEtapa[] = [
  { chave: "criterios", rotulo: "Critérios", sufixo: "/criterios", descricao: "Define o que a vaga exige. Alimenta todas as outras etapas." },
  { chave: "divulgacao", rotulo: "Divulgação", sufixo: "/divulgacao", descricao: "Texto da vaga para cada canal." },
  { chave: "abordagem", rotulo: "Abordagem", sufixo: "/abordagem", descricao: "Mensagem para quem ainda não se candidatou." },
  { chave: "hunter", rotulo: "Hunter", sufixo: "/hunter", descricao: "Traz candidatos de fora da plataforma, avalia o perfil às cegas e prepara a mensagem." },
  { chave: "triagem", rotulo: "Triagem", sufixo: "/triagem", descricao: "Ranking de currículos com evidência por critério." },
  { chave: "validacoes", rotulo: "Validações", sufixo: "/validacoes", descricao: "Reprovações apontadas pela IA que esperam a sua decisão. O candidato só recebe resposta depois." },
  { chave: "entrevista", rotulo: "Entrevista", sufixo: "/entrevista", descricao: "Roteiro e ficha de cada candidato." },
  { chave: "testes", rotulo: "Testes", sufixo: "/testes", descricao: "Prova, case ou dinâmica." },
  { chave: "laudos", rotulo: "Laudos", sufixo: "/laudos", descricao: "Parecer final de cada candidato." },
  { chave: "devolutivas", rotulo: "Devolutivas", sufixo: "/devolutivas", descricao: "Retorno a quem participou." },
  { chave: "ofertas", rotulo: "Carta-oferta", sufixo: "/ofertas", descricao: "Proposta a quem foi aprovado." },
];

export type EtapaCalculada = DefinicaoEtapa & {
  estado: EstadoEtapa;
  /** Frase curta com o número que importa. */
  resumo: string;
  /** Quando bloqueada: o que falta. */
  motivo: string | null;
  /** Onde resolver o que falta (sufixo de caminho); ausente se não houver bloqueio. */
  resolverEm: ChaveEtapa | null;
  /** Texto do botão principal do cartão. */
  acao: string;
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function calcularEtapas(c: ContagensVaga): EtapaCalculada[] {
  const criteriosOk = c.criteriosConfirmados && !c.criteriosBloqueados;
  const falta = {
    criterios: "Confirme os critérios da vaga primeiro.",
    candidatos: "Ainda não há candidatos nesta vaga.",
    triagem: "Faça a triagem primeiro.",
    ficha: "Feche ao menos uma ficha de entrevista primeiro.",
    laudo: "Assine ao menos um laudo primeiro.",
  };

  const e = (
    chave: ChaveEtapa,
    estado: EstadoEtapa,
    resumo: string,
    acao: string,
    bloqueio?: { motivo: string; resolverEm: ChaveEtapa },
  ): EtapaCalculada => {
    const def = ETAPAS.find((x) => x.chave === chave)!;
    return { ...def, estado, resumo, acao, motivo: bloqueio?.motivo ?? null, resolverEm: bloqueio?.resolverEm ?? null };
  };

  const criterios = c.criteriosBloqueados
    ? e("criterios", "pendente", "Há itens que bloqueiam a publicação.", "Corrigir critérios")
    : c.criteriosConfirmados
      ? e("criterios", "concluida", "Confirmados.", "Rever critérios")
      : e("criterios", "pendente", "Ainda não confirmados.", "Definir critérios");

  const divulgacao = !criteriosOk
    ? e("divulgacao", "bloqueada", "Depende dos critérios.", "Ir para critérios", { motivo: falta.criterios, resolverEm: "criterios" })
    : c.statusVaga === "publicada"
      ? e("divulgacao", "concluida", "Vaga publicada.", "Gerar novo texto")
      : e("divulgacao", "pendente", "Vaga ainda não publicada.", "Gerar divulgação");

  const abordagem = !criteriosOk
    ? e("abordagem", "bloqueada", "Depende dos critérios.", "Ir para critérios", { motivo: falta.criterios, resolverEm: "criterios" })
    : c.abordagens > 0
      ? e("abordagem", "opcional", plural(c.abordagens, "abordagem", "abordagens"), "Ver abordagens")
      : e("abordagem", "opcional", "Use se faltar candidato.", "Criar abordagem");

  const hunter = !criteriosOk
    ? e("hunter", "bloqueada", "Depende dos critérios.", "Ir para critérios", { motivo: falta.criterios, resolverEm: "criterios" })
    : c.prospects > 0
      ? e("hunter", "opcional", plural(c.prospects, "prospect", "prospects"), "Abrir hunter")
      : e("hunter", "opcional", "Traga candidatos de fora da plataforma.", "Abrir hunter");

  const triagem = !criteriosOk
    ? e("triagem", "bloqueada", "Depende dos critérios.", "Ir para critérios", { motivo: falta.criterios, resolverEm: "criterios" })
    : c.candidaturas === 0
      ? e("triagem", "pendente", "Sem candidatos ainda.", "Abrir triagem")
      : c.triados >= c.candidaturas
        ? e("triagem", "concluida", `${c.triados} de ${c.candidaturas} triados.`, "Ver ranking")
        : e("triagem", "andamento", `${c.triados} de ${plural(c.candidaturas, "candidato", "candidatos")} triados.`, "Triar candidatos");

  const validacoes = c.validacoesPendentes > 0
    ? e("validacoes", "pendente", `${plural(c.validacoesPendentes, "caso aguarda", "casos aguardam")} a sua decisão.`, "Decidir agora")
    : e("validacoes", "opcional", "Nenhuma reprovação aguardando.", "Ver histórico");

  const entrevista = c.triados === 0
    ? e("entrevista", "bloqueada", "Depende da triagem.", "Ir para triagem", { motivo: falta.triagem, resolverEm: "triagem" })
    : c.fichasFechadas === 0
      ? e("entrevista", "pendente", "Nenhuma ficha fechada.", "Abrir roteiro")
      : c.fichasFechadas >= c.triados
        ? e("entrevista", "concluida", plural(c.fichasFechadas, "ficha fechada", "fichas fechadas"), "Ver fichas")
        : e("entrevista", "andamento", plural(c.fichasFechadas, "ficha fechada", "fichas fechadas"), "Continuar entrevistas");

  const testes = c.testesAprovados > 0
    ? e("testes", "concluida", plural(c.testesAprovados, "instrumento aprovado", "instrumentos aprovados"), "Ver testes")
    : e("testes", "opcional", "Use quando a vaga pedir prova ou dinâmica.", "Criar teste");

  const laudos = c.fichasFechadas === 0
    ? e("laudos", "bloqueada", "Depende da entrevista.", "Ir para entrevista", { motivo: falta.ficha, resolverEm: "entrevista" })
    : c.laudosAssinados === 0
      ? e("laudos", "pendente", "Nenhum laudo assinado.", "Abrir laudos")
      : c.laudosAssinados >= c.fichasFechadas
        ? e("laudos", "concluida", plural(c.laudosAssinados, "laudo assinado", "laudos assinados"), "Ver laudos")
        : e("laudos", "andamento", plural(c.laudosAssinados, "laudo assinado", "laudos assinados"), "Continuar laudos");

  const devolutivas = c.laudosAssinados === 0
    ? e("devolutivas", "bloqueada", "Depende do laudo.", "Ir para laudos", { motivo: falta.laudo, resolverEm: "laudos" })
    : c.devolutivasEnviadas === 0
      ? e("devolutivas", "pendente", "Nenhuma devolutiva enviada.", "Preparar devolutivas")
      : c.devolutivasEnviadas >= c.laudosAssinados
        ? e("devolutivas", "concluida", plural(c.devolutivasEnviadas, "enviada", "enviadas"), "Ver devolutivas")
        : e("devolutivas", "andamento", plural(c.devolutivasEnviadas, "enviada", "enviadas"), "Continuar devolutivas");

  const ofertas = c.laudosAssinados === 0
    ? e("ofertas", "bloqueada", "Depende do laudo.", "Ir para laudos", { motivo: falta.laudo, resolverEm: "laudos" })
    : c.ofertas > 0
      ? e("ofertas", "opcional", plural(c.ofertas, "carta", "cartas"), "Ver cartas")
      : e("ofertas", "opcional", "Para quem foi aprovado.", "Montar carta");

  return [criterios, divulgacao, abordagem, hunter, triagem, validacoes, entrevista, testes, laudos, devolutivas, ofertas];
}

/** Primeira etapa do caminho principal que ainda pede ação. `null` quando o ciclo está completo. */
export function proximoPasso(etapas: EtapaCalculada[], c?: Pick<ContagensVaga, "candidaturas">): EtapaCalculada | null {
  // Validação vem primeiro: há prazo (72 h) e o candidato fica sem resposta até a pessoa decidir.
  const principal: ChaveEtapa[] = ["validacoes", "criterios", "divulgacao", "triagem", "entrevista", "laudos", "devolutivas"];
  const por = (chave: ChaveEtapa) => etapas.find((x) => x.chave === chave);
  for (const chave of principal) {
    const et = por(chave);
    if (!et || (et.estado !== "pendente" && et.estado !== "andamento")) continue;
    // Triagem sem ninguém para triar: o que move o ciclo é atrair candidatos.
    if (chave === "triagem" && c && c.candidaturas === 0) {
      const alvo = por("hunter") ?? por("abordagem");
      return alvo ? { ...alvo, resumo: "Sem candidatos ainda: traga pessoas pelo hunter ou crie uma abordagem.", acao: "Buscar candidatos" } : et;
    }
    return et;
  }
  return null;
}

/** Caminho completo de uma etapa. */
export function caminhoEtapa(jobId: string, chave: ChaveEtapa): string {
  const def = ETAPAS.find((x) => x.chave === chave)!;
  return `/admin/vagas/${jobId}${def.sufixo}`;
}

/** Vizinhas na ordem do ciclo (a abordagem fica de fora da sequência linear). */
export function vizinhas(chaveAtual: ChaveEtapa | null): { anterior: ChaveEtapa | null; proxima: ChaveEtapa | null } {
  const linear = ETAPAS.filter((x) => x.chave !== "abordagem" && x.chave !== "hunter").map((x) => x.chave);
  if (chaveAtual === null) return { anterior: null, proxima: linear[0] };
  const i = linear.indexOf(chaveAtual);
  // A abordagem e o hunter rodam entre a divulgação e a triagem.
  if (i === -1) return { anterior: "divulgacao", proxima: "triagem" };
  return { anterior: i > 0 ? linear[i - 1] : null, proxima: i < linear.length - 1 ? linear[i + 1] : null };
}

/** Qual etapa uma rota representa (ou `null` para a Central). */
export function etapaDaRota(jobId: string, pathname: string): ChaveEtapa | null {
  const base = `/admin/vagas/${jobId}`;
  if (!pathname.startsWith(base)) return null;
  const resto = pathname.slice(base.length);
  const achada = ETAPAS.find((x) => resto === x.sufixo || resto.startsWith(`${x.sufixo}/`));
  return achada ? achada.chave : null;
}
