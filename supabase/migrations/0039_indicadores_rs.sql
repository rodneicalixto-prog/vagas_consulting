-- Indicadores de R&S (agente de IA, passo 3M): metas por empresa, números
-- manuais do mês e plano de ação. Aditiva. RLS ligada e sem política
-- pública: acesso só pelo servidor, sempre atrás do escopo do operador.

create table if not exists recruitment_goals (
  company_id uuid primary key references companies (id) on delete cascade,
  metas jsonb not null default '{}'::jsonb,
  atualizado_por uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists recruitment_monthly (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  -- Primeiro dia do mês.
  periodo date not null,
  valores jsonb not null default '{}'::jsonb,
  atualizado_por uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (company_id, periodo)
);

create table if not exists recruitment_action_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  periodo date not null,
  indicador text not null,
  valor_texto text not null default '',
  meta_texto text not null default '',
  causa text not null default '',
  acao text not null,
  responsavel text not null,
  prazo date not null,
  estado text not null default 'aberta' check (estado in ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  o_que_funcionou text not null default '',
  criado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recruitment_action_plans_idx
  on recruitment_action_plans (company_id, periodo, estado);

alter table recruitment_goals enable row level security;
alter table recruitment_monthly enable row level security;
alter table recruitment_action_plans enable row level security;
