-- Linhas de WhatsApp por empresa e por operador (Spec: docs/specs/LINHAS_WHATSAPP.md).
-- Aditiva no uso: quem tem um número só continua igual (vira a linha padrão).
-- RLS ligada e sem política pública: acesso só pelo servidor.

create table if not exists whatsapp_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  instance text not null unique,
  apelido text not null,
  -- Preenchido = linha dedicada ao operador; nulo = linha compartilhada.
  operador_id uuid references auth.users (id) on delete set null,
  agente text not null default 'sugestao' check (agente in ('desligado', 'sugestao', 'automatico')),
  padrao boolean not null default false,
  ativa boolean not null default true,
  criado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists whatsapp_lines_padrao_unica
  on whatsapp_lines (company_id) where padrao;

-- Um operador, um número ativo por empresa.
create unique index if not exists whatsapp_lines_operador_unico
  on whatsapp_lines (company_id, operador_id) where operador_id is not null and ativa;

create index if not exists whatsapp_lines_empresa_idx on whatsapp_lines (company_id, ativa);

alter table whatsapp_lines enable row level security;

-- Limite comercial de números por empresa (aluguel); o superadmin ajusta.
alter table companies
  add column if not exists max_linhas_whatsapp integer not null default 1
    check (max_linhas_whatsapp between 1 and 50);

-- A conversa pertence a uma linha: o mesmo telefone pode ter uma por linha.
alter table conversations
  add column if not exists line_id uuid references whatsapp_lines (id) on delete set null;

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'conversations'::regclass and contype = 'u'
  loop
    execute format('alter table conversations drop constraint %I', c);
  end loop;
end $$;

create unique index if not exists conversations_linha_unica
  on conversations (company_id, canal, telefone_normalizado, coalesce(line_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists conversations_line_idx on conversations (line_id) where line_id is not null;

-- Migração: cada instância já cadastrada vira a linha padrão da empresa e
-- preserva o comportamento atual (agente automático, limitado pelo agente).
insert into whatsapp_lines (company_id, instance, apelido, padrao, agente)
select ic.company_id, ic.config ->> 'instance', 'Número da empresa', true, 'automatico'
from integration_credentials ic
where ic.escopo = 'empresa'
  and ic.provedor = 'evolution'
  and ic.company_id is not null
  and coalesce(ic.config ->> 'instance', '') <> ''
on conflict (instance) do nothing;

update conversations c
set line_id = l.id
from whatsapp_lines l
where l.company_id = c.company_id and l.padrao and c.line_id is null;
