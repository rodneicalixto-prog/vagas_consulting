-- Agenda da equipe interna: compromissos por usuário (superadmin/admin/operador),
-- cobrindo entrevistas com candidatos e compromissos internos. Candidatos não têm
-- agenda própria nesta versão.

create table compromissos (
  id uuid primary key default gen_random_uuid(),
  responsavel_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null default 'interno' check (tipo in ('entrevista', 'interno')),
  titulo text not null,
  descricao text,
  application_id uuid references applications (id) on delete set null,
  inicio timestamptz not null,
  fim timestamptz,
  status text not null default 'agendado' check (status in ('agendado', 'concluido', 'cancelado')),
  criado_por uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compromissos_responsavel_inicio_idx on compromissos (responsavel_id, inicio);
create index compromissos_inicio_idx on compromissos (inicio);
create index compromissos_application_idx on compromissos (application_id);

alter table compromissos enable row level security;

-- Sem policy: acesso só via service role (createAdminClient), mesmo padrão já usado
-- em audit_log e service_engagements neste projeto — telas de agenda ficam
-- inteiramente dentro do painel admin, nunca acessadas pelo app do candidato.
