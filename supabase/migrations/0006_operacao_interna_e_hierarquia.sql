-- Converte a plataforma para operação exclusivamente interna.
-- Empresas permanecem como entidades cadastrais, sem usuários ou portal.

create type internal_role as enum ('superadmin', 'admin', 'operador');

alter table admin_users
  alter column perfil type internal_role
  using (
    case
      when perfil::text = 'superadmin' then 'superadmin'
      when perfil::text in ('operacoes', 'compliance') then 'admin'
      else 'operador'
    end
  )::internal_role;

alter table admin_users
  add column if not exists ativo boolean not null default true;

drop type admin_perfil;
alter type internal_role rename to admin_perfil;

-- Remove toda autorização empresarial. Operações internas usam o cliente
-- server-only após autenticação e autorização explícitas no servidor.
drop policy if exists companies_select_members on companies;
drop policy if exists companies_update_members on companies;
drop policy if exists companies_insert_authenticated on companies;
drop policy if exists jobs_select_own_company on jobs;
drop policy if exists jobs_insert_own_company on jobs;
drop policy if exists jobs_update_own_company on jobs;
drop policy if exists applications_select_company on applications;
drop policy if exists applications_update_company on applications;
drop policy if exists invites_select_company on invites;
drop policy if exists invites_write_company on invites;
drop policy if exists invites_update_own on invites;
drop policy if exists temp_work_select_related on temp_work;
drop policy if exists application_notes_select_company on application_notes;
drop policy if exists application_notes_insert_company on application_notes;
drop policy if exists company_members_select_own_company on company_members;

-- O candidato só pode se candidatar a vagas publicadas.
drop policy if exists applications_insert_own on applications;
create policy applications_insert_own_published_job on applications
  for insert with check (
    auth.uid() = candidate_id
    and exists (
      select 1 from jobs
      where jobs.id = applications.job_id and jobs.status = 'publicada'
    )
  );

-- O candidato pode consultar o contratante associado a uma vaga publicada,
-- sem ganhar permissão de alteração sobre empresas.
create policy companies_select_published_job on companies
  for select using (
    exists (
      select 1 from jobs
      where jobs.company_id = companies.id and jobs.status = 'publicada'
    )
  );

create policy temp_work_select_candidate on temp_work
  for select using (
    exists (
      select 1 from invites
      where invites.id = temp_work.invite_id
        and invites.candidate_id = auth.uid()
    )
  );

-- Mensagens enviadas por candidatos precisam pertencer a um processo próprio
-- e só podem ter como destinatário o responsável interno da vaga.
drop policy if exists messages_insert_participant on messages;
create policy messages_insert_candidate_process on messages
  for insert with check (
    auth.uid() = remetente_id
    and application_id is not null
    and invite_id is null
    and exists (
      select 1
      from applications
      join jobs on jobs.id = applications.job_id
      where applications.id = messages.application_id
        and applications.candidate_id = auth.uid()
        and jobs.responsavel_id = messages.destinatario_id
    )
  );

-- Elimina a estrutura de acesso empresarial depois da retirada das policies.
drop function if exists public.is_company_member(uuid);
drop table company_members;
