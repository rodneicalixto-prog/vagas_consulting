-- Hunter H1 (docs/specs/HUNTER_PREPARACAO.md): prospects captados para uma vaga.
-- Aditiva. NÃO APLICADA: aplicar só com autorização do Rodnei no momento.
-- RLS ligada e sem política pública: acesso só pelo servidor (chave de serviço), atrás do escopo do operador.
--
-- LGPD: base legal = legítimo interesse (art. 7º, IX). Guarda o mínimo (perfil profissional, sem família,
-- endereço ou contatos no texto). Quem não responde é ANONIMIZADO em 30 dias: nome, contato e perfil somem;
-- ficam só os hashes do contato, para nunca mais importar nem abordar a mesma pessoa (opt-out permanente).

create table if not exists public.hunter_prospects (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  criado_por uuid references auth.users (id) on delete set null,
  fonte text not null check (fonte in ('vagascom', 'infojobs', 'linkedin', 'csv', 'manual', 'outra')),
  nome text not null default '',
  -- Telefone normalizado (só dígitos, com 55) e e-mail em minúsculas. Somem na anonimização.
  telefone text,
  email text,
  cidade text not null default '',
  perfil text not null default '',
  -- Hashes (sha256) do contato: permanecem após a anonimização.
  chave_tel text,
  chave_email text,
  estado text not null default 'novo' check (estado in (
    'novo', 'avaliado', 'mensagem_pronta', 'aprovado', 'enviado', 'clicou', 'candidatou',
    'respondeu', 'nao_contactar', 'descartado', 'expirado'
  )),
  fit text not null default 'nao_avaliado' check (fit in ('alto', 'medio', 'baixo', 'nao_avaliado')),
  pontuacao smallint check (pontuacao is null or pontuacao between 0 and 100),
  resultado jsonb,
  canal text check (canal is null or canal in ('whatsapp', 'email')),
  texto text not null default '',
  -- Link rastreado: /h/<token> (sem dado pessoal na URL).
  token text not null unique,
  aprovado_por uuid references auth.users (id) on delete set null,
  aprovado_em timestamptz,
  enviada_em timestamptz,
  clicou_em timestamptz,
  candidatou_em timestamptz,
  candidate_id uuid references auth.users (id) on delete set null,
  retencao_ate timestamptz not null,
  anonimizado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (anonimizado_em is not null or telefone is not null or email is not null)
);

-- Uma pessoa por vaga (por telefone ou por e-mail).
create unique index if not exists hunter_prospects_vaga_tel_unico
  on public.hunter_prospects (job_id, chave_tel) where chave_tel is not null;
create unique index if not exists hunter_prospects_vaga_email_unico
  on public.hunter_prospects (job_id, chave_email) where chave_email is not null;

-- Consulta global de opt-out e de "já abordado".
create index if not exists hunter_prospects_chave_tel_idx on public.hunter_prospects (chave_tel) where chave_tel is not null;
create index if not exists hunter_prospects_chave_email_idx on public.hunter_prospects (chave_email) where chave_email is not null;
create index if not exists hunter_prospects_vaga_estado_idx on public.hunter_prospects (job_id, estado);
create index if not exists hunter_prospects_retencao_idx on public.hunter_prospects (retencao_ate) where anonimizado_em is null;

alter table public.hunter_prospects enable row level security;
