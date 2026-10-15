-- Abordagem ativa (3K): resultado da verificação guardado com o rascunho,
-- já que o perfil colado nunca é persistido. Aditiva.

alter table outreach_drafts
  add column if not exists verificacoes jsonb not null default '[]'::jsonb;
