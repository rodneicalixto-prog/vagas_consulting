-- Carteira por atendente e vagas confidenciais (Fase 1).
-- Spec: docs/specs/CARTEIRA_ATENDENTE.md (v0.3). Aditiva: com os padrões
-- abaixo nada fica confidencial e nada fica atribuído, então o comportamento
-- atual não muda até alguém usar a tela Carteira.

-- Vaga sigilosa: oculta do operador comum e anônima para o candidato.
alter table jobs
  add column if not exists confidencial boolean not null default false;

-- Quem atende qual empresa. N:N; `ativo` liga/desliga sem apagar histórico;
-- `acessa_confidenciais` marca o operador de confiança.
create table if not exists company_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ativo boolean not null default true,
  acessa_confidenciais boolean not null default false,
  criado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists company_assignments_user_idx
  on company_assignments (user_id) where ativo;

-- Só o servidor acessa (como audit_log): RLS ligado e nenhuma política.
alter table company_assignments enable row level security;
