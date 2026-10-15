-- Devolutiva ao candidato (agente de IA, passo 3I): rascunhos por candidatura.
-- Aditiva. RLS ligada e sem política pública: acesso só pelo servidor.
-- O índice parcial garante a regra de encerramento: uma única devolutiva
-- enviada por candidatura.

create table if not exists candidate_feedbacks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  tipo text not null check (tipo in ('aprovacao', 'generica', 'feedback')),
  canal text not null check (canal in ('whatsapp', 'email', 'ligacao')),
  texto text not null default '',
  dados jsonb not null default '{}'::jsonb,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada')),
  criado_por uuid references auth.users (id) on delete set null,
  enviada_por uuid references auth.users (id) on delete set null,
  enviada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidate_feedbacks_vaga_idx on candidate_feedbacks (job_id, application_id);

create unique index if not exists candidate_feedbacks_uma_enviada
  on candidate_feedbacks (application_id) where status = 'enviada';

alter table candidate_feedbacks enable row level security;
