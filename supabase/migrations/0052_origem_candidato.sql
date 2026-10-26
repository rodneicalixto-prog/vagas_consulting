-- Origem do candidato: por qual canal chegou ao app (primeiro toque). Aditiva.
-- NÃO APLICADA: aplicar só com autorização do Rodnei no momento.
-- `applications.origem` (por qual canal chegou a cada vaga) já existe e não muda.
-- Perfis antigos ficam sem origem (aparecem como "não informado"): nada é inventado.

alter table public.profiles
  add column if not exists origem_canal text,
  add column if not exists origem_detalhe text not null default '',
  add column if not exists origem_em timestamptz;

create index if not exists profiles_origem_canal_idx on public.profiles (origem_canal) where origem_canal is not null;
