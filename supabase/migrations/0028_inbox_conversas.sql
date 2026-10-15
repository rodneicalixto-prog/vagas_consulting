-- Inbox de conversas (Fase B da comunicação): WhatsApp via Evolution.
-- Spec: docs/specs/COMUNICACAO_OMNICANAL.md §5-§6. Aditiva: tabelas novas e vazias.
-- Só o servidor acessa (chave de serviço); RLS ligada, sem política pública.

-- Uma conversa por telefone por empresa (a empresa usa o número/instância dela).
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  canal text not null default 'whatsapp' check (canal in ('whatsapp')),
  telefone_normalizado text not null,
  nome_contato text,
  candidate_id uuid references profiles (id) on delete set null,
  status text not null default 'aberta' check (status in ('aberta', 'encerrada')),
  nao_lidas integer not null default 0 check (nao_lidas >= 0),
  ultima_msg_em timestamptz,
  ultima_msg_previa text,
  created_at timestamptz not null default now(),
  unique (company_id, canal, telefone_normalizado)
);

create index if not exists conversations_empresa_recente_idx
  on conversations (company_id, ultima_msg_em desc nulls last);

create index if not exists conversations_candidato_idx
  on conversations (candidate_id) where candidate_id is not null;

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  direcao text not null check (direcao in ('entrada', 'saida')),
  autor text not null check (autor in ('candidato', 'operador', 'ia', 'sistema')),
  autor_id uuid references auth.users (id) on delete set null,
  texto text not null,
  provedor_msg_id text,
  status text not null default 'recebida' check (status in ('recebida', 'enviada', 'entregue', 'lida', 'falhou')),
  erro text,
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_thread_idx
  on conversation_messages (conversation_id, created_at);

-- Idempotência do webhook: a mesma mensagem do provedor entra uma única vez.
create unique index if not exists conversation_messages_provedor_unico
  on conversation_messages (conversation_id, provedor_msg_id)
  where provedor_msg_id is not null;

-- Descadastro imediato (SAIR/PARAR). company_id nulo vale para todas as empresas.
create table if not exists channel_opt_outs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies (id) on delete cascade,
  canal text not null default 'whatsapp',
  telefone_normalizado text not null,
  motivo text,
  created_at timestamptz not null default now()
);

create unique index if not exists channel_opt_outs_unico
  on channel_opt_outs (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), canal, telefone_normalizado);

alter table conversations enable row level security;
alter table conversation_messages enable row level security;
alter table channel_opt_outs enable row level security;
