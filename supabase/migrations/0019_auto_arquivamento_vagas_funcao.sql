-- Auto-arquivamento de vagas expiradas — parte 2: função.
-- Depende de 0018 já aplicada (o valor 'arquivada' precisa estar commitado).

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

comment on function arquivo_automatico_vagas() is
  'Arquiva todas as vagas publicadas cuja data de expiração já passou.
   Chamada por: /api/cron/archive-jobs (Vercel Cron) ou manualmente.
   Uso: SELECT * FROM arquivo_automatico_vagas();';
