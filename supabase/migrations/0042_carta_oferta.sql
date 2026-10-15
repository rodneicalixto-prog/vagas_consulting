-- Carta-oferta (agente de IA, passo 3P): documento por candidatura, montado no
-- código a partir do que a pessoa informou. Aditiva. RLS ligada e sem política
-- pública: acesso só pelo servidor. Carta enviada é imutável (nova versão).

create table if not exists offer_letters (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  versao integer not null default 1,
  dados jsonb not null default '{}'::jsonb,
  texto text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'aceita', 'recusada')),
  validade date,
  criado_por uuid not null references auth.users (id) on delete cascade,
  enviada_por uuid references auth.users (id) on delete set null,
  enviada_em timestamptz,
  resposta_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, versao)
);

create index if not exists offer_letters_vaga_idx on offer_letters (job_id, status);

alter table offer_letters enable row level security;
