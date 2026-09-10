-- Banco de leads capturados na instalação do app (independente de virar
-- candidatura) — cadastro mínimo obrigatório: nome, e-mail, telefone, idade.

create table leads (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  email text not null,
  telefone text not null,
  idade smallint,
  origem text not null default 'app_install',
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index leads_created_at_idx on leads (created_at);
create index leads_email_idx on leads (email);

alter table leads enable row level security;

-- Cadastro de lead acontece antes de qualquer login (na instalação do
-- app) — precisa ser inserível por anônimo. Leitura só pelo painel admin
-- (service role); não expomos o banco de leads publicamente.
create policy leads_insert_all on leads
  for insert with check (true);
