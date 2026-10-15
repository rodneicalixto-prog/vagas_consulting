-- Laudo do candidato (agente de IA, passo 3L): documento versionado por
-- candidatura, imutável depois de assinado. Aditiva. RLS ligada e sem
-- política pública: acesso só pelo servidor (chave de serviço).

create table if not exists candidate_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  versao integer not null default 1,
  modo text not null check (modo in ('fatos', 'recomendacao')),
  -- Quadro, fontes, listas e resumo no momento da geração.
  conteudo jsonb not null default '{}'::jsonb,
  -- Só no modo recomendacao; preenchida pela pessoa.
  recomendacao jsonb,
  status text not null default 'rascunho' check (status in ('rascunho', 'assinado')),
  criado_por uuid references auth.users (id) on delete set null,
  assinado_por uuid references auth.users (id) on delete set null,
  assinado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (application_id, versao)
);

create index if not exists candidate_reports_vaga_idx on candidate_reports (job_id, application_id, versao desc);

alter table candidate_reports enable row level security;
