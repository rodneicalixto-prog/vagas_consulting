export type Modalidade = "efetiva" | "pj" | "temporaria";

export const modalidadeLabel: Record<Modalidade, string> = {
  efetiva: "Efetiva",
  pj: "PJ",
  temporaria: "Temporária",
};

export const modalidadeTagClass: Record<Modalidade, string> = {
  efetiva: "bg-navy-bg text-navy",
  pj: "bg-gold-bg text-gold-3",
  temporaria: "bg-teal-bg text-teal",
};

export type Vaga = {
  id: string;
  titulo: string;
  empresa: string;
  local: string;
  modalidade: Modalidade;
  remuneracao: string;
  salvo?: boolean;
};

export const vagas: Vaga[] = [
  {
    id: "analista-rh-jr",
    titulo: "Analista de RH Jr.",
    empresa: "Grupo Altavia",
    local: "São Paulo, SP · Híbrido",
    modalidade: "efetiva",
    remuneracao: "R$ 3.200 – R$ 3.800",
  },
  {
    id: "designer-produto",
    titulo: "Designer de Produto",
    empresa: "Nortec Sistemas",
    local: "Remoto",
    modalidade: "pj",
    remuneracao: "R$ 90/hora · 20h semanais",
  },
  {
    id: "promotor-evento",
    titulo: "Promotor de Vendas — Evento",
    empresa: "Feira Home & Deco",
    local: "Expo Center, SP · 3 dias",
    modalidade: "temporaria",
    remuneracao: "R$ 160/dia + transporte",
  },
  {
    id: "assistente-administrativo",
    titulo: "Assistente Administrativo",
    empresa: "Comercial Vitória",
    local: "Osasco, SP · Presencial",
    modalidade: "efetiva",
    remuneracao: "R$ 2.100 + benefícios",
  },
];

export const vagaRegras: Record<
  string,
  {
    resumo: string;
    dados: { label: string; valor: string }[];
    atividades: string[];
    etapas: string;
    aceite: string;
  }
> = {
  "promotor-evento": {
    resumo:
      "Trabalho de período determinado, contratado pela Feira Home & Deco através da Vagas Consulting. Função: abordagem e demonstração de produtos no estande do evento.",
    dados: [
      { label: "Datas", valor: "18 a 20/set" },
      { label: "Turno", valor: "09h – 18h" },
      { label: "Valor", valor: "R$ 160/dia" },
      { label: "Adicionais", valor: "Transporte + refeição" },
      { label: "Vestimenta", valor: "Uniforme fornecido" },
      { label: "Supervisor", valor: "Camila Reis" },
    ],
    atividades: [
      "Abordagem ativa de visitantes e apresentação do produto.",
      "Boa comunicação; experiência prévia em eventos é diferencial, não obrigatória.",
      "Documento com foto no dia do check-in.",
    ],
    etapas:
      "Convite → aceite em até 24h → confirmação → check-in no local → execução → conclusão e avaliação. Resultado do convite em até 2 dias úteis.",
    aceite:
      "O aceite gera compromisso de comparecimento. Cancelamentos com menos de 24h de antecedência podem afetar futuras convocações. Em caso de imprevisto, avise pelo chat da vaga o quanto antes para viabilizar substituição.",
  },
  "analista-rh-jr": {
    resumo:
      "Oportunidade contínua (CLT), oferecida diretamente pelo Grupo Altavia. A contratação e suas condições serão formalizadas pela empresa responsável.",
    dados: [
      { label: "Regime", valor: "CLT" },
      { label: "Jornada", valor: "44h semanais" },
      { label: "Modelo", valor: "Híbrido — 3x/semana" },
      { label: "Salário", valor: "R$ 3.200 – R$ 3.800" },
      { label: "Benefícios", valor: "VR, VT, plano de saúde" },
      { label: "Local", valor: "São Paulo, SP" },
    ],
    atividades: [
      "Apoio em recrutamento, seleção e onboarding de novos colaboradores.",
      "Ensino superior em RH, Psicologia ou áreas correlatas (cursando ou completo).",
      "Experiência anterior em RH é desejável.",
    ],
    etapas:
      "Triagem → entrevista com RH → entrevista com gestor → proposta → contratação. Prazo estimado: 3 semanas.",
    aceite:
      "A proposta final é formalizada diretamente pela empresa contratante, com resumo do vínculo, remuneração e benefícios antes da confirmação.",
  },
  "designer-produto": {
    resumo:
      "Prestação de serviços por pessoa jurídica para a Nortec Sistemas. Leia escopo, autonomia, pagamentos e condições contratuais antes de avançar.",
    dados: [
      { label: "Escopo", valor: "Design de telas e design system" },
      { label: "Duração", valor: "6 meses, renovável" },
      { label: "Valor", valor: "R$ 90/hora" },
      { label: "Disponibilidade", valor: "20h semanais" },
      { label: "Equipamento", valor: "Fornecido pelo próprio PJ" },
      { label: "Local", valor: "Remoto" },
    ],
    atividades: [
      "Entregáveis definidos por sprint, com autonomia sobre a execução.",
      "Portfólio de produtos digitais (obrigatório).",
      "Nota fiscal mensal conforme escopo contratado.",
    ],
    etapas:
      "Análise de portfólio → briefing técnico → proposta comercial → contrato PJ. Prazo estimado: 2 semanas.",
    aceite:
      "Rescisão conforme cláusulas do contrato de prestação de serviços, sem vínculo empregatício.",
  },
  "assistente-administrativo": {
    resumo:
      "Oportunidade contínua (CLT), oferecida diretamente pela Comercial Vitória. A contratação e suas condições serão formalizadas pela empresa responsável.",
    dados: [
      { label: "Regime", valor: "CLT" },
      { label: "Jornada", valor: "44h semanais" },
      { label: "Modelo", valor: "Presencial" },
      { label: "Salário", valor: "R$ 2.100 + benefícios" },
      { label: "Benefícios", valor: "VR, VT" },
      { label: "Local", valor: "Osasco, SP" },
    ],
    atividades: [
      "Rotinas administrativas, arquivo e apoio a compras.",
      "Ensino médio completo; pacote Office básico.",
      "Experiência anterior é diferencial, não obrigatória.",
    ],
    etapas:
      "Triagem → entrevista → proposta → contratação. Prazo estimado: 2 semanas.",
    aceite:
      "A proposta final é formalizada diretamente pela empresa contratante.",
  },
};

export type StatusProcesso =
  | "em_analise"
  | "entrevista"
  | "proposta"
  | "encerrado";

export const statusLabel: Record<StatusProcesso, string> = {
  em_analise: "Em análise",
  entrevista: "Entrevista",
  proposta: "Proposta",
  encerrado: "Encerrado",
};

export const statusPillClass: Record<StatusProcesso, string> = {
  em_analise: "bg-gold-bg text-gold-3",
  entrevista: "bg-navy-bg text-navy",
  proposta: "bg-success-bg text-success",
  encerrado: "bg-black/5 text-text-3",
};

export const statusProgress: Record<StatusProcesso, number> = {
  em_analise: 1,
  entrevista: 3,
  proposta: 4,
  encerrado: 5,
};

export type Processo = {
  vaga: string;
  empresa: string;
  status: StatusProcesso;
  detalhe: string;
  grupo: "andamento" | "encerrado";
};

export const processos: Processo[] = [
  {
    vaga: "Assistente Administrativo",
    empresa: "Comercial Vitória",
    status: "entrevista",
    detalhe: "Entrevista marcada para 14/set",
    grupo: "andamento",
  },
  {
    vaga: "Promotor de Vendas — Evento",
    empresa: "Feira Home & Deco",
    status: "em_analise",
    detalhe: "Candidatura enviada em 08/set",
    grupo: "andamento",
  },
  {
    vaga: "Analista de RH Jr.",
    empresa: "Grupo Altavia",
    status: "proposta",
    detalhe: "Proposta enviada — responder até 11/set",
    grupo: "andamento",
  },
  {
    vaga: "Recepcionista",
    empresa: "Clínica Bem Cuidar",
    status: "encerrado",
    detalhe: "Vaga preenchida por outro candidato",
    grupo: "encerrado",
  },
];

export type Conversa = {
  empresa: string;
  vaga: string;
  preview: string;
  hora: string;
  naoLida?: boolean;
  souEu?: boolean;
};

export const conversas: Conversa[] = [
  {
    empresa: "Comercial Vitória",
    vaga: "Assistente Administrativo",
    preview: "Sua entrevista foi confirmada para 14/09 às 15h.",
    hora: "09:40",
    naoLida: true,
  },
  {
    empresa: "Feira Home & Deco",
    vaga: "Promotor de Vendas — Evento",
    preview: "Ok, poderei confirmar o check-in às 8h30.",
    hora: "ontem",
    souEu: true,
  },
  {
    empresa: "Grupo Altavia",
    vaga: "Analista de RH Jr.",
    preview: "Enviamos uma proposta para você revisar.",
    hora: "ontem",
  },
  {
    empresa: "Clínica Bem Cuidar",
    vaga: "Recepcionista",
    preview: "Obrigado pelo seu interesse na vaga.",
    hora: "3 dias",
  },
];

export const perfilAtual = {
  nome: "Mariana Ferreira",
  titulo: "Analista de RH · São Paulo, SP",
  iniciais: "MF",
  progresso: 80,
};
