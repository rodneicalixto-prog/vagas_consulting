-- Abordagem ativa (agente de IA, passo 3K): rascunhos por vaga, com lembrete
-- de follow-up. O perfil colado NUNCA é gravado: só o texto gerado e um
-- trecho curto que o sustenta, apagados ao encerrar. Aditiva. RLS ligada e
-- sem política pública: acesso só pelo servidor.

create table if not exists outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs (id) on delete cascade,
  criado_por uuid not null references auth.users (id) on delete cascade,
  -- Identificação mínima do contato (nome), para não repetir a abordagem.
  contato text not null,
  contato_chave text not null,
  canal text not null check (canal in ('linkedin_nota', 'linkedin_inmail', 'email', 'ligacao')),
  tom text not null default 'formal' check (tom in ('formal', 'descontraido')),
  angulo text not null default '',
  trecho_perfil text not null default '',
  assuntos jsonb not null default '[]'::jsonb,
  texto text not null default '',
  followups jsonb not null default '[]'::jsonb,
  estado text not null default 'rascunho'
    check (estado in ('rascunho', 'enviada', 'respondeu', 'nao_contactar', 'encerrada')),
  followups_feitos smallint not null default 0 check (followups_feitos between 0 and 2),
  enviada_em timestamptz,
  proximo_followup_em timestamptz,
  encerrada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_drafts_vaga_idx on outreach_drafts (job_id, estado);
create index if not exists outreach_drafts_lembrete_idx on outreach_drafts (criado_por, proximo_followup_em)
  where estado = 'enviada';

-- Só uma abordagem viva por contato e vaga; encerrado não reabre sozinho.
create unique index if not exists outreach_drafts_um_por_contato
  on outreach_drafts (job_id, contato_chave);

alter table outreach_drafts enable row level security;
