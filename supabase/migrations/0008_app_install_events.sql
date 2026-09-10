-- Rastreio de instalações da PWA (Add to Home Screen), pra medir
-- aceitação de mercado. O app ainda não está em loja de aplicativos —
-- se um dia for empacotado como app nativo, o número de downloads reais
-- vem do App Store Connect / Play Console, não precisa de tabela.

create table app_install_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  plataforma text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index app_install_events_created_at_idx on app_install_events (created_at);

alter table app_install_events enable row level security;

-- Qualquer um (mesmo anônimo, se algum dia o evento disparar antes do
-- login) pode registrar uma instalação; leitura só pelo painel admin
-- (service role).
create policy app_install_events_insert_all on app_install_events
  for insert with check (true);
