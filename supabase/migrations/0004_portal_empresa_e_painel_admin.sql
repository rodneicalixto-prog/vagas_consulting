-- Portal da empresa e Painel administrativo — Vagas Consulting
--
-- Decisão de produto (registrada em PROJETO.md, seção 7, itens 2 e 4):
-- a empresa NUNCA publica vaga diretamente. Ela envia uma solicitação
-- (status 'rascunho'/'revisao'); só a equipe interna da Vagas Consulting
-- (admin_users, via service role) pode cadastrar/publicar de fato.
--
-- Este arquivo:
-- 1. Corrige a RLS de `jobs` para impedir que a empresa se autopublique.
-- 2. Adiciona rastreio de decisão em `jobs` e `companies`.
-- 3. Cria `admin_users` (perfis do painel: superadmin/operações/
--    compliance/suporte/financeiro).
-- 4. Cria `privacy_requests` (solicitações LGPD do titular) e `reports`
--    (denúncias) e `application_notes` (notas internas do pipeline).

-- ── Corrige RLS de jobs: empresa nunca publica sozinha ─────────────────

drop policy if exists jobs_write_own_company on jobs;

create policy jobs_insert_own_company on jobs
  for insert with check (
    status in ('rascunho', 'revisao')
    and exists (
      select 1 from company_members cm
      where cm.company_id = jobs.company_id and cm.user_id = auth.uid()
    )
  );

create policy jobs_update_own_company on jobs
  for update using (
    status in ('rascunho', 'revisao')
    and exists (
      select 1 from company_members cm
      where cm.company_id = jobs.company_id and cm.user_id = auth.uid()
    )
  )
  with check (
    status in ('rascunho', 'revisao')
    and exists (
      select 1 from company_members cm
      where cm.company_id = jobs.company_id and cm.user_id = auth.uid()
    )
  );

-- Publicar, rejeitar, suspender, encerrar etc. só acontece via service
-- role (rotas do painel admin), que ignora RLS — por isso nenhuma policy
-- cobre esses status para company_members.

alter table jobs
  add column if not exists motivo_decisao text,
  add column if not exists decidido_por uuid references auth.users (id),
  add column if not exists decidido_em timestamptz;

alter table companies
  add column if not exists motivo_decisao text,
  add column if not exists decidido_por uuid references auth.users (id),
  add column if not exists decidido_em timestamptz;

-- ── Usuários administrativos (painel interno) ──────────────────────────

create type admin_perfil as enum (
  'superadmin', 'operacoes', 'compliance', 'suporte', 'financeiro'
);

create table admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  perfil admin_perfil not null,
  nome_exibicao text,
  mfa_ativo boolean not null default false,
  created_at timestamptz not null default now()
);

alter table admin_users enable row level security;

-- Um admin autenticado consegue ler o próprio registro (usado pelo
-- layout do painel para checar acesso e perfil sem precisar de service
-- role). Não há policy de insert/update pública — só service role
-- cadastra novos admins.
create policy admin_users_select_own on admin_users
  for select using (auth.uid() = user_id);

-- ── Solicitações LGPD (acesso, correção, exportação, revogação,
--    eliminação, revisão de decisão automatizada) ─────────────────────

create type tipo_solicitacao_lgpd as enum (
  'acesso', 'correcao', 'exportacao', 'revogacao', 'eliminacao',
  'revisao_decisao'
);

create type status_solicitacao_lgpd as enum (
  'aberta', 'em_atendimento', 'atendida', 'recusada'
);

create table privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo tipo_solicitacao_lgpd not null,
  status status_solicitacao_lgpd not null default 'aberta',
  origem text,
  resposta text,
  atendido_por uuid references auth.users (id),
  created_at timestamptz not null default now(),
  atendido_em timestamptz
);

create index privacy_requests_user_id_idx on privacy_requests (user_id);
create index privacy_requests_status_idx on privacy_requests (status);

alter table privacy_requests enable row level security;

create policy privacy_requests_select_own on privacy_requests
  for select using (auth.uid() = user_id);
create policy privacy_requests_insert_own on privacy_requests
  for insert with check (auth.uid() = user_id);
-- Atendimento (mudar status/resposta) só via service role no painel admin.

-- ── Denúncias e incidentes ──────────────────────────────────────────────

create type tipo_denuncia as enum (
  'cobranca_indevida', 'discriminacao', 'assedio', 'dado_falso', 'outro'
);

create type status_denuncia as enum (
  'aberta', 'em_analise', 'resolvida', 'improcedente'
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  denunciante_id uuid references auth.users (id),
  alvo_tipo text not null,
  alvo_id uuid,
  tipo tipo_denuncia not null,
  descricao text,
  status status_denuncia not null default 'aberta',
  resolvido_por uuid references auth.users (id),
  resolucao text,
  created_at timestamptz not null default now(),
  resolvido_em timestamptz
);

create index reports_status_idx on reports (status);
create index reports_alvo_idx on reports (alvo_tipo, alvo_id);

alter table reports enable row level security;

create policy reports_insert_authenticated on reports
  for insert with check (auth.uid() is not null);
create policy reports_select_own on reports
  for select using (auth.uid() = denunciante_id);
-- Fila e resolução de denúncias: só via service role no painel admin.

-- ── Notas internas no pipeline de candidatos ───────────────────────────

create table application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  autor_id uuid not null references auth.users (id),
  nota text not null,
  created_at timestamptz not null default now()
);

create index application_notes_application_id_idx on application_notes (application_id);

alter table application_notes enable row level security;

-- Só a empresa dona da vaga (via application → job → company_members) lê
-- e escreve notas internas; o candidato nunca vê essa tabela.
create policy application_notes_select_company on application_notes
  for select using (
    exists (
      select 1 from applications a
      join jobs j on j.id = a.job_id
      join company_members cm on cm.company_id = j.company_id
      where a.id = application_notes.application_id and cm.user_id = auth.uid()
    )
  );
create policy application_notes_insert_company on application_notes
  for insert with check (
    auth.uid() = autor_id
    and exists (
      select 1 from applications a
      join jobs j on j.id = a.job_id
      join company_members cm on cm.company_id = j.company_id
      where a.id = application_notes.application_id and cm.user_id = auth.uid()
    )
  );
