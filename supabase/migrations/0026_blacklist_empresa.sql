-- Black list por empresa (admin da empresa cadastra os candidatos problemáticos).
-- Spec: docs/specs/ADMIN_DA_EMPRESA.md §12. Aditiva: tabela nova, vazia.
--
-- Vale só para a empresa que cadastrou: bloqueia candidatura às vagas dela e
-- convite dela. A black list global (profiles.blacklisted) segue existindo,
-- da plataforma, e é independente.
--
-- Pode bloquear quem já é cadastrado (candidate_id) ou uma pessoa ainda não
-- cadastrada (telefone normalizado), para valer assim que ela se candidatar.

create table if not exists company_blacklist (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  candidate_id uuid references profiles (id) on delete cascade,
  nome_informado text,
  telefone_normalizado text,
  motivo text not null,
  ativo boolean not null default true,
  criado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  removido_por uuid references auth.users (id) on delete set null,
  removido_em timestamptz,
  check (candidate_id is not null or telefone_normalizado is not null)
);

-- Um bloqueio ativo por pessoa por empresa.
create unique index if not exists company_blacklist_candidato_unico
  on company_blacklist (company_id, candidate_id)
  where candidate_id is not null and ativo;

create unique index if not exists company_blacklist_telefone_unico
  on company_blacklist (company_id, telefone_normalizado)
  where telefone_normalizado is not null and ativo;

create index if not exists company_blacklist_empresa_idx
  on company_blacklist (company_id) where ativo;

-- Só o servidor acessa (chave de serviço); sem política pública.
alter table company_blacklist enable row level security;
