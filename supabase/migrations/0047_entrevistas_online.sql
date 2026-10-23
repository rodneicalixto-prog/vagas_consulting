-- Entrevista online: a equipe propõe data e link; o candidato confirma ou recusa.
-- Escrita só pelo servidor (service role). O candidato só lê as próprias entrevistas.

create table public.entrevistas_online (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  data_hora timestamptz not null,
  link text not null check (link like 'https://%'),
  status text not null default 'proposta'
    check (status in ('proposta','confirmada','recusada','substituida')),
  criada_por uuid not null,
  respondida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No máximo uma entrevista ativa (proposta ou confirmada) por candidatura.
create unique index entrevistas_online_ativa_unica
  on public.entrevistas_online (application_id)
  where status in ('proposta','confirmada');

alter table public.entrevistas_online enable row level security;

create policy entrevistas_online_select_candidato on public.entrevistas_online
  for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.id = application_id and a.candidate_id = auth.uid()
  ));
