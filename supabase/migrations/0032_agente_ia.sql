-- Agente de IA (Fase 3, passo 3A): agente por empresa, base de conhecimento,
-- sugestões e registro de execuções. Aditiva. RLS ligada e sem política
-- pública: o acesso é só pelo servidor (chave de serviço).

create table if not exists ai_agents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies (id) on delete cascade,
  nome text not null default 'Assistente',
  ativo boolean not null default false,
  nivel_autonomia smallint not null default 0 check (nivel_autonomia between 0 and 3),
  provedor text not null default 'groq' check (provedor in ('groq', 'openai', 'anthropic')),
  modelo text,
  tom text not null default 'formal',
  roteiro text not null default '',
  teto_mensal_usd numeric(10, 2) not null default 100 check (teto_mensal_usd >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_knowledge_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  tipo text not null check (tipo in ('politica', 'roteiro', 'faq', 'vaga', 'licao')),
  titulo text not null,
  corpo_md text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho', 'aprovada', 'arquivada')),
  versao integer not null default 1,
  origem text not null default 'manual' check (origem in ('manual', 'aprendizado')),
  criado_por uuid references auth.users (id) on delete set null,
  aprovada_por uuid references auth.users (id) on delete set null,
  aprovada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_knowledge_notes_empresa_idx
  on ai_knowledge_notes (company_id, status, tipo);

create table if not exists ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  message_id uuid references conversation_messages (id) on delete set null,
  agent_id uuid not null references ai_agents (id) on delete cascade,
  rascunho text not null,
  fonte jsonb not null default '[]'::jsonb,
  motivo_parada text,
  estado text not null default 'pendente'
    check (estado in ('pendente', 'usada', 'editada', 'descartada', 'expirada')),
  texto_final text,
  decidida_por uuid references auth.users (id) on delete set null,
  decidida_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ai_suggestions_conversa_idx
  on ai_suggestions (conversation_id, created_at desc);

create table if not exists ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references ai_agents (id) on delete cascade,
  conversation_id uuid references conversations (id) on delete set null,
  suggestion_id uuid references ai_suggestions (id) on delete set null,
  provedor text not null,
  modelo text,
  tokens_in integer,
  tokens_out integer,
  custo_usd numeric(12, 6),
  latencia_ms integer,
  motivo_parada text,
  created_at timestamptz not null default now()
);

create index if not exists ai_agent_runs_agente_idx
  on ai_agent_runs (agent_id, created_at desc);

alter table ai_agents enable row level security;
alter table ai_knowledge_notes enable row level security;
alter table ai_suggestions enable row level security;
alter table ai_agent_runs enable row level security;
