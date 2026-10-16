-- Assistente da plataforma "Ajuda Vagas Consulting" (Spec: docs/specs/ASSISTENTE_PLATAFORMA.md).
-- Aditiva. RLS ligada e sem política pública: acesso só pelo servidor.
-- Guarda a pergunta ANONIMIZADA por 90 dias, o papel, a tela e se foi útil.

create table if not exists help_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  papel text not null,
  rota text not null default '',
  pergunta text not null,
  pedacos jsonb not null default '[]'::jsonb,
  sem_resposta boolean not null default false,
  util boolean,
  created_at timestamptz not null default now()
);

create index if not exists help_questions_usuario_dia_idx on help_questions (user_id, created_at desc);
create index if not exists help_questions_lacunas_idx on help_questions (created_at desc) where sem_resposta or util = false;

alter table help_questions enable row level security;

-- O superadmin liga e desliga o assistente.
alter table ai_agents add column if not exists ajuda_ativa boolean not null default true;
