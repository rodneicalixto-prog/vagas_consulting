-- Entrevista (agente de IA, passo 3H): roteiro por vaga (versionado) e ficha
-- de parecer por candidatura. Aditiva. RLS ligada e sem política pública:
-- acesso só pelo servidor (chave de serviço), atrás do escopo do operador.

create table if not exists interview_scripts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  versao integer not null default 1,
  duracao_min smallint not null check (duracao_min in (30, 45, 60)),
  conteudo jsonb not null default '{}'::jsonb,
  criado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (job_id, versao)
);

create index if not exists interview_scripts_vaga_idx on interview_scripts (job_id, versao desc);

create table if not exists interview_scorecards (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  script_id uuid references interview_scripts (id) on delete set null,
  entrevistador_id uuid not null references auth.users (id) on delete cascade,
  itens jsonb not null default '[]'::jsonb,
  perguntas_extra jsonb not null default '[]'::jsonb,
  pontos_fortes text not null default '',
  pontos_atencao text not null default '',
  recomendacao text check (recomendacao in ('avancar', 'com_ressalva', 'nao_avancar')),
  motivo text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho', 'fechada')),
  fechada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, entrevistador_id)
);

create index if not exists interview_scorecards_vaga_idx on interview_scorecards (job_id, status);

alter table interview_scripts enable row level security;
alter table interview_scorecards enable row level security;
