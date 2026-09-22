-- Auto-arquivamento de vagas expiradas
-- Adiciona campo de expiração e novo status para arquivo automático

-- Adicionar novo status 'arquivada' ao enum status_vaga
alter type status_vaga add value 'arquivada';

-- Adicionar coluna expira_em
alter table jobs add column expira_em timestamptz;

-- Índice pra queries de expiração
create index jobs_expira_em_idx on jobs (expira_em);

-- Função pra arquivar vagas expiradas
create or replace function arquivo_automatico_vagas()
returns table (id uuid, titulo text, status_novo status_vaga)
language sql
as $$
  with arquivadas as (
    update jobs
    set
      status = 'arquivada'::status_vaga,
      updated_at = now()
    where
      status = 'publicada'
      and expira_em is not null
      and expira_em <= now()
    returning jobs.id, jobs.titulo, jobs.status
  )
  select * from arquivadas;
$$;

-- Comentário pra referência
comment on function arquivo_automatico_vagas() is
  'Arquiva todas as vagas publicadas cuja data de expiração já passou.
   Chamada por: Edge Function Vercel em /api/cron/archive-jobs ou manualmente.
   Uso: SELECT * FROM arquivo_automatico_vagas();';
