-- Dados de exemplo (empresa aprovada + 4 vagas publicadas) pra popular o app
-- em desenvolvimento. Nomes fictícios, sem relação com empresas reais.

with nova_empresa as (
  insert into companies (razao_social, nome_fantasia, cnpj, status, segmento)
  values ('Grupo Altavia Serviços Ltda', 'Grupo Altavia', '12.345.678/0001-90', 'aprovada', 'RH e Serviços')
  returning id
)
insert into jobs (company_id, titulo, modalidade, status, local, modelo_trabalho, remuneracao_texto, descricao, requisitos, regras, publicada_em)
select id, 'Analista de RH Jr.', 'efetiva'::modalidade_vaga, 'publicada'::status_vaga, 'São Paulo, SP', 'hibrido'::modelo_trabalho, 'R$ 3.200 – R$ 3.800',
  'Vaga efetiva CLT no time de RH, apoiando recrutamento, seleção e onboarding.',
  'Ensino superior em RH, Psicologia ou áreas correlatas.',
  '{
    "resumo": "Oportunidade contínua (CLT), oferecida diretamente pelo Grupo Altavia. A contratação e suas condições serão formalizadas pela empresa responsável.",
    "dados": [
      {"label": "Regime", "valor": "CLT"},
      {"label": "Jornada", "valor": "44h semanais"},
      {"label": "Modelo", "valor": "Híbrido — 3x/semana"},
      {"label": "Salário", "valor": "R$ 3.200 – R$ 3.800"},
      {"label": "Benefícios", "valor": "VR, VT, plano de saúde"},
      {"label": "Local", "valor": "São Paulo, SP"}
    ],
    "atividades": [
      "Apoio em recrutamento, seleção e onboarding de novos colaboradores.",
      "Ensino superior em RH, Psicologia ou áreas correlatas (cursando ou completo).",
      "Experiência anterior em RH é desejável."
    ],
    "etapas": "Triagem → entrevista com RH → entrevista com gestor → proposta → contratação. Prazo estimado: 3 semanas.",
    "aceite": "A proposta final é formalizada diretamente pela empresa contratante, com resumo do vínculo, remuneração e benefícios antes da confirmação."
  }'::jsonb,
  now()
from nova_empresa
union all
select id, 'Designer de Produto', 'pj'::modalidade_vaga, 'publicada'::status_vaga, 'Remoto', 'remoto'::modelo_trabalho, 'R$ 90/hora · 20h semanais',
  'Prestação de serviços PJ para design de telas e design system.',
  'Portfólio de produtos digitais.',
  '{
    "resumo": "Prestação de serviços por pessoa jurídica para o Grupo Altavia. Leia escopo, autonomia, pagamentos e condições contratuais antes de avançar.",
    "dados": [
      {"label": "Escopo", "valor": "Design de telas e design system"},
      {"label": "Duração", "valor": "6 meses, renovável"},
      {"label": "Valor", "valor": "R$ 90/hora"},
      {"label": "Disponibilidade", "valor": "20h semanais"},
      {"label": "Equipamento", "valor": "Fornecido pelo próprio PJ"},
      {"label": "Local", "valor": "Remoto"}
    ],
    "atividades": [
      "Entregáveis definidos por sprint, com autonomia sobre a execução.",
      "Portfólio de produtos digitais (obrigatório).",
      "Nota fiscal mensal conforme escopo contratado."
    ],
    "etapas": "Análise de portfólio → briefing técnico → proposta comercial → contrato PJ. Prazo estimado: 2 semanas.",
    "aceite": "Rescisão conforme cláusulas do contrato de prestação de serviços, sem vínculo empregatício."
  }'::jsonb,
  now()
from nova_empresa
union all
select id, 'Promotor de Vendas — Evento', 'temporaria'::modalidade_vaga, 'publicada'::status_vaga, 'Expo Center, SP · 3 dias', 'presencial'::modelo_trabalho, 'R$ 160/dia + transporte',
  'Trabalho temporário de 3 dias em feira de eventos.',
  'Boa comunicação; experiência em eventos é diferencial.',
  '{
    "resumo": "Trabalho de período determinado, contratado pela Feira Home & Deco através do Grupo Altavia. Função: abordagem e demonstração de produtos no estande do evento.",
    "dados": [
      {"label": "Datas", "valor": "18 a 20/set"},
      {"label": "Turno", "valor": "09h – 18h"},
      {"label": "Valor", "valor": "R$ 160/dia"},
      {"label": "Adicionais", "valor": "Transporte + refeição"},
      {"label": "Vestimenta", "valor": "Uniforme fornecido"},
      {"label": "Supervisor", "valor": "Camila Reis"}
    ],
    "atividades": [
      "Abordagem ativa de visitantes e apresentação do produto.",
      "Boa comunicação; experiência prévia em eventos é diferencial, não obrigatória.",
      "Documento com foto no dia do check-in."
    ],
    "etapas": "Convite → aceite em até 24h → confirmação → check-in no local → execução → conclusão e avaliação. Resultado do convite em até 2 dias úteis.",
    "aceite": "O aceite gera compromisso de comparecimento. Cancelamentos com menos de 24h de antecedência podem afetar futuras convocações. Em caso de imprevisto, avise pelo chat da vaga o quanto antes para viabilizar substituição."
  }'::jsonb,
  now()
from nova_empresa
union all
select id, 'Assistente Administrativo', 'efetiva'::modalidade_vaga, 'publicada'::status_vaga, 'Osasco, SP · Presencial', 'presencial'::modelo_trabalho, 'R$ 2.100 + benefícios',
  'Rotinas administrativas, arquivo e apoio a compras.',
  'Ensino médio completo; pacote Office básico.',
  '{
    "resumo": "Oportunidade contínua (CLT), oferecida diretamente pelo Grupo Altavia. A contratação e suas condições serão formalizadas pela empresa responsável.",
    "dados": [
      {"label": "Regime", "valor": "CLT"},
      {"label": "Jornada", "valor": "44h semanais"},
      {"label": "Modelo", "valor": "Presencial"},
      {"label": "Salário", "valor": "R$ 2.100 + benefícios"},
      {"label": "Benefícios", "valor": "VR, VT"},
      {"label": "Local", "valor": "Osasco, SP"}
    ],
    "atividades": [
      "Rotinas administrativas, arquivo e apoio a compras.",
      "Ensino médio completo; pacote Office básico.",
      "Experiência anterior é diferencial, não obrigatória."
    ],
    "etapas": "Triagem → entrevista → proposta → contratação. Prazo estimado: 2 semanas.",
    "aceite": "A proposta final é formalizada diretamente pela empresa contratante."
  }'::jsonb,
  now()
from nova_empresa;
