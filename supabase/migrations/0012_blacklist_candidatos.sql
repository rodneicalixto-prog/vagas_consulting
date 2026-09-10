-- Black list de candidatos: quem nao honrou compromisso (nao apareceu,
-- desistiu sem aviso etc.) e a Vagas Consulting nao quer mais considerar
-- pra nenhuma vaga.

alter table profiles
  add column if not exists blacklisted boolean not null default false,
  add column if not exists blacklist_motivo text,
  add column if not exists blacklist_em timestamptz,
  add column if not exists blacklist_por uuid references auth.users(id);
