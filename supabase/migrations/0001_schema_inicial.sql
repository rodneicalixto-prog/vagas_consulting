-- Schema inicial — Vagas Consulting
-- Cobre o backlog P0: identidade/acesso (auth.users nativo do Supabase),
-- perfil do candidato, empresas, vagas/regras, candidaturas/pipeline,
-- convites e execução de trabalho temporário, mensagens, consentimentos
-- (LGPD) e auditoria. Ver PROJETO.md seções 5, 6 e 7.3.

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────

create type modalidade_vaga as enum ('efetiva', 'pj', 'temporaria');

create type status_vaga as enum (
  'rascunho', 'revisao', 'publicada', 'pausada',
  'preenchida', 'encerrada', 'rejeitada', 'suspensa'
);

create type status_candidatura as enum (
  'recebida', 'triagem', 'entrevista', 'teste', 'proposta',
  'contratado', 'rejeitada', 'desistente', 'expirada'
);

create type status_empresa as enum (
  'rascunho', 'em_analise', 'ajustes', 'aprovada', 'suspensa', 'bloqueada'
);

create type status_convite_temp as enum (
  'ofertado', 'visualizado', 'aceito', 'recusado', 'confirmado',
  'em_execucao', 'concluido', 'cancelado', 'ocorrencia'
);

create type modelo_trabalho as enum ('presencial', 'hibrido', 'remoto');

-- ── Perfil do candidato (1:1 com auth.users) ───────────────────────

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_completo text not null,
  telefone text,
  cidade text,
  titulo_profissional text,
  resumo text,
  curriculo_url text,
  modelo_trabalho modelo_trabalho[] not null default '{}',
  modalidades_desejadas modalidade_vaga[] not null default '{}',
  disponibilidade text,
  perfil_completo_pct smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Empresas ─────────────────────────────────────────────────────────

create table companies (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  cnpj text unique,
  endereco text,
  site text,
  segmento text,
  status status_empresa not null default 'rascunho',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel text not null default 'recrutador',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

-- ── Vagas ────────────────────────────────────────────────────────────

create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  titulo text not null,
  modalidade modalidade_vaga not null,
  status status_vaga not null default 'rascunho',
  local text,
  modelo_trabalho modelo_trabalho,
  remuneracao_texto text,
  descricao text,
  requisitos text,
  -- Campos específicos por modalidade (datas, turno, escopo, benefícios,
  -- etapas, regras de aceite/cancelamento — ver seção 6 do PROJETO.md),
  -- guardados como JSON pra não travar o schema em cada variação.
  regras jsonb not null default '{}',
  responsavel_id uuid references auth.users (id),
  publicada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_company_id_idx on jobs (company_id);
create index jobs_status_idx on jobs (status);
create index jobs_modalidade_idx on jobs (modalidade);

-- ── Candidaturas ─────────────────────────────────────────────────────

create table applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  candidate_id uuid not null references auth.users (id) on delete cascade,
  status status_candidatura not null default 'recebida',
  respostas jsonb not null default '{}',
  origem text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create index applications_job_id_idx on applications (job_id);
create index applications_candidate_id_idx on applications (candidate_id);

-- ── Convites (principalmente vagas temporárias) ─────────────────────

create table invites (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  candidate_id uuid not null references auth.users (id) on delete cascade,
  status status_convite_temp not null default 'ofertado',
  validade timestamptz,
  resposta_em timestamptz,
  motivo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invites_job_id_idx on invites (job_id);
create index invites_candidate_id_idx on invites (candidate_id);

-- ── Execução de trabalho temporário ─────────────────────────────────

create table temp_work (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references invites (id) on delete cascade,
  escala jsonb not null default '{}',
  checkin_em timestamptz,
  checkout_em timestamptz,
  conclusao_em timestamptz,
  ocorrencia text,
  aprovado_por uuid references auth.users (id),
  valor_texto text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Mensagens ────────────────────────────────────────────────────────

create table messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications (id) on delete cascade,
  invite_id uuid references invites (id) on delete cascade,
  remetente_id uuid not null references auth.users (id),
  destinatario_id uuid not null references auth.users (id),
  conteudo text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now(),
  constraint messages_vinculo_check check (
    application_id is not null or invite_id is not null
  )
);

create index messages_application_id_idx on messages (application_id);
create index messages_invite_id_idx on messages (invite_id);

-- ── Consentimentos (LGPD) ────────────────────────────────────────────

create table consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  finalidade text not null,
  canal text,
  estado text not null default 'concedido',
  versao_texto text,
  origem text,
  created_at timestamptz not null default now()
);

create index consents_user_id_idx on consents (user_id);

-- ── Auditoria ────────────────────────────────────────────────────────

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  ator_id uuid references auth.users (id),
  acao text not null,
  objeto_tipo text not null,
  objeto_id uuid,
  antes jsonb,
  depois jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index audit_log_objeto_idx on audit_log (objeto_tipo, objeto_id);

-- ── Row Level Security ───────────────────────────────────────────────

alter table profiles enable row level security;
alter table companies enable row level security;
alter table company_members enable row level security;
alter table jobs enable row level security;
alter table applications enable row level security;
alter table invites enable row level security;
alter table temp_work enable row level security;
alter table messages enable row level security;
alter table consents enable row level security;
alter table audit_log enable row level security;

-- profiles: candidato só vê/edita o próprio perfil
create policy profiles_select_own on profiles
  for select using (auth.uid() = id);
create policy profiles_update_own on profiles
  for update using (auth.uid() = id);
create policy profiles_insert_own on profiles
  for insert with check (auth.uid() = id);

-- companies: membros veem/editam a própria empresa; vagas publicadas
-- expõem só o necessário via view futura, não a tabela companies inteira
create policy companies_select_members on companies
  for select using (
    exists (
      select 1 from company_members cm
      where cm.company_id = companies.id and cm.user_id = auth.uid()
    )
  );
create policy companies_update_members on companies
  for update using (
    exists (
      select 1 from company_members cm
      where cm.company_id = companies.id and cm.user_id = auth.uid()
    )
  );
create policy companies_insert_authenticated on companies
  for insert with check (auth.uid() is not null);

-- company_members: membro vê os colegas da própria empresa
create policy company_members_select_own_company on company_members
  for select using (
    exists (
      select 1 from company_members cm
      where cm.company_id = company_members.company_id and cm.user_id = auth.uid()
    )
  );

-- jobs: qualquer pessoa autenticada vê vagas publicadas; membros da
-- empresa veem e gerenciam todas as vagas (qualquer status) da própria empresa
create policy jobs_select_published on jobs
  for select using (status = 'publicada');
create policy jobs_select_own_company on jobs
  for select using (
    exists (
      select 1 from company_members cm
      where cm.company_id = jobs.company_id and cm.user_id = auth.uid()
    )
  );
create policy jobs_write_own_company on jobs
  for all using (
    exists (
      select 1 from company_members cm
      where cm.company_id = jobs.company_id and cm.user_id = auth.uid()
    )
  );

-- applications: candidato vê/cria as próprias; empresa vê as da sua vaga
create policy applications_select_own on applications
  for select using (auth.uid() = candidate_id);
create policy applications_insert_own on applications
  for insert with check (auth.uid() = candidate_id);
create policy applications_select_company on applications
  for select using (
    exists (
      select 1 from jobs j
      join company_members cm on cm.company_id = j.company_id
      where j.id = applications.job_id and cm.user_id = auth.uid()
    )
  );
create policy applications_update_company on applications
  for update using (
    exists (
      select 1 from jobs j
      join company_members cm on cm.company_id = j.company_id
      where j.id = applications.job_id and cm.user_id = auth.uid()
    )
  );

-- invites: mesmo padrão de applications
create policy invites_select_own on invites
  for select using (auth.uid() = candidate_id);
create policy invites_update_own on invites
  for update using (auth.uid() = candidate_id);
create policy invites_select_company on invites
  for select using (
    exists (
      select 1 from jobs j
      join company_members cm on cm.company_id = j.company_id
      where j.id = invites.job_id and cm.user_id = auth.uid()
    )
  );
create policy invites_write_company on invites
  for insert with check (
    exists (
      select 1 from jobs j
      join company_members cm on cm.company_id = j.company_id
      where j.id = invites.job_id and cm.user_id = auth.uid()
    )
  );

-- temp_work: acesso via o convite relacionado
create policy temp_work_select_related on temp_work
  for select using (
    exists (
      select 1 from invites i
      where i.id = temp_work.invite_id and i.candidate_id = auth.uid()
    )
    or exists (
      select 1 from invites i
      join jobs j on j.id = i.job_id
      join company_members cm on cm.company_id = j.company_id
      where i.id = temp_work.invite_id and cm.user_id = auth.uid()
    )
  );

-- messages: só participantes da conversa
create policy messages_select_participant on messages
  for select using (auth.uid() = remetente_id or auth.uid() = destinatario_id);
create policy messages_insert_participant on messages
  for insert with check (auth.uid() = remetente_id);

-- consents: usuário só mexe nos próprios
create policy consents_select_own on consents
  for select using (auth.uid() = user_id);
create policy consents_insert_own on consents
  for insert with check (auth.uid() = user_id);

-- audit_log: sem acesso via API pública (só service role, sem policy de select/insert)
