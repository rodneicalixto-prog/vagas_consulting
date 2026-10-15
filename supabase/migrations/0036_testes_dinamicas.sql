-- Testes e dinâmicas (agente de IA, passo 3J): instrumentos por vaga e notas
-- por candidatura. Aditiva. RLS ligada e sem política pública: acesso só
-- pelo servidor (chave de serviço), atrás do escopo do operador.

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  tipo text not null check (tipo in ('tecnica', 'portugues', 'raciocinio', 'case', 'dinamica')),
  competencia text not null,
  titulo text not null default '',
  conteudo jsonb not null default '{}'::jsonb,
  status text not null default 'rascunho' check (status in ('rascunho', 'aprovado', 'arquivado')),
  criado_por uuid references auth.users (id) on delete set null,
  aprovado_por uuid references auth.users (id) on delete set null,
  aprovado_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists assessments_vaga_idx on assessments (job_id, created_at desc);

create table if not exists assessment_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  avaliador_id uuid not null references auth.users (id) on delete cascade,
  competencia text not null,
  nota smallint not null check (nota between 1 and 4),
  evidencia text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, application_id, avaliador_id)
);

create index if not exists assessment_results_vaga_idx on assessment_results (job_id, application_id);

alter table assessments enable row level security;
alter table assessment_results enable row level security;
