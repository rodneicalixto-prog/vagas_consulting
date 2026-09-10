-- Banco de candidatos (validação), controle de prestação de serviço
-- (todas as modalidades) e configurações da plataforma — Painel Admin
--
-- Fecha/avança itens 6, 8 e 10 da seção 7 do PROJETO.md.

-- ── Contato do membro da equipe ─────────────────────────────────────────

alter table admin_users
  add column if not exists telefone text;

-- ── Validação de candidatos (aprovado/reprovado) ────────────────────────

alter table profiles
  add column if not exists status_validacao text not null default 'pendente',
  add column if not exists validado_por uuid references auth.users (id),
  add column if not exists validado_em timestamptz;

alter table profiles
  add constraint profiles_status_validacao_check
  check (status_validacao in ('pendente', 'aprovado', 'reprovado'));

-- ── Controle de prestação de serviço (todas as modalidades) ────────────

create type status_pagamento_servico as enum (
  'pendente', 'pago', 'parcial', 'atrasado'
);

create table service_engagements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications (id) on delete set null,
  job_id uuid not null references jobs (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  candidate_id uuid not null references auth.users (id) on delete cascade,
  modalidade modalidade_vaga not null,
  data_inicio date not null,
  data_fim date,
  valor numeric,
  periodicidade text,
  status_pagamento status_pagamento_servico not null default 'pendente',
  observacoes text,
  criado_por uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_engagements_company_id_idx on service_engagements (company_id);
create index service_engagements_candidate_id_idx on service_engagements (candidate_id);
create index service_engagements_status_pagamento_idx on service_engagements (status_pagamento);

alter table service_engagements enable row level security;
-- Sem policy pública — controle interno da Vagas Consulting, só o painel
-- admin (service role) lê/escreve, mesmo padrão de audit_log.

-- ── Configurações da plataforma (ex.: telefone de suporte) ──────────────

create table platform_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table platform_settings enable row level security;

-- Leitura pública (qualquer autenticado, inclusive candidato, precisa ver
-- o telefone de suporte); escrita só via service role no painel admin.
create policy platform_settings_select_all on platform_settings
  for select using (true);
