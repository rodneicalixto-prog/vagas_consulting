-- Triagem de currículos (agente de IA, passo 3G): resultado por candidatura.
-- Aditiva. RLS ligada e sem política pública: acesso só pelo servidor
-- (chave de serviço), sempre atrás do escopo do operador.

create table if not exists job_screenings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  application_id uuid not null references applications (id) on delete cascade,
  candidate_id uuid not null references auth.users (id) on delete cascade,
  -- Resumo dos critérios usados; muda quando a vaga muda, e aí o resultado
  -- aparece como desatualizado.
  criterios_hash text not null,
  resultado jsonb not null default '{}'::jsonb,
  pontuacao smallint not null default 0 check (pontuacao between 0 and 100),
  eliminado boolean not null default false,
  criado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, application_id)
);

create index if not exists job_screenings_vaga_idx
  on job_screenings (job_id, pontuacao desc);

alter table job_screenings enable row level security;
