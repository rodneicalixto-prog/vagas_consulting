-- Avaliação por IA, passo 1 (docs/specs/AVALIACAO_IA_GANCHOS.md §3A e §3B). Aditiva.
-- NÃO APLICADA: aplicar só com autorização do Rodnei no momento.
-- RLS ligada e sem política pública: acesso só pelo servidor (chave de serviço),
-- atrás do escopo do operador.

-- 1) Regras da IA por vaga (modo de entrevista, cortes, perguntas, gatilhos...).
alter table public.jobs
  add column if not exists regras_ia jsonb not null default '{}'::jsonb;

-- 2) Valores da empresa para o fit cultural. Pode ficar vazia: sem valores,
--    a dimensão cultura aparece como "não avaliado".
create table if not exists public.company_values (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  descricao text not null default '',
  -- Comportamentos observáveis que provam o valor, e perguntas de entrevista.
  comportamentos jsonb not null default '[]'::jsonb,
  perguntas jsonb not null default '[]'::jsonb,
  peso smallint not null default 1 check (peso between 1 and 5),
  corte smallint not null default 70 check (corte between 0 and 100),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, nome)
);

create index if not exists company_values_empresa_idx on public.company_values (company_id) where ativo;

-- 3) Fila de validação humana de reprovação. A IA identifica "não segue" e NÃO
--    responde ao candidato: o caso espera aqui a decisão da pessoa.
create table if not exists public.validacoes_reprovacao (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  candidate_id uuid not null references auth.users (id) on delete cascade,
  etapa text not null check (etapa in ('triagem', 'entrevista_ia', 'competencias')),
  status text not null default 'aguardando'
    check (status in ('aguardando', 'confirmada', 'revertida', 'aguardando_dados')),
  -- criterio, eliminatorio, evidencia, notas, confianca, o_que_mudaria, analise, criterios_hash
  motivo jsonb not null,
  prazo_em timestamptz not null,
  alertada_em timestamptz,
  decidido_por uuid references auth.users (id) on delete set null,
  decidido_em timestamptz,
  observacao text not null default '',
  regras_versao integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Um caso ativo por candidatura e etapa.
create unique index if not exists validacoes_reprovacao_ativa_unica
  on public.validacoes_reprovacao (application_id, etapa)
  where status in ('aguardando', 'aguardando_dados');

create index if not exists validacoes_reprovacao_fila_idx
  on public.validacoes_reprovacao (job_id, status, prazo_em);

alter table public.company_values enable row level security;
alter table public.validacoes_reprovacao enable row level security;
