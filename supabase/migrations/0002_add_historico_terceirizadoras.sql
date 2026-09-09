-- Pergunta obrigatória (mas NÃO eliminatória) no cadastro do candidato:
-- se já trabalhou em alguma de um conjunto específico de empresas
-- terceirizadoras e, se sim, em que período/ano.

alter table profiles
  add column historico_terceirizadoras jsonb not null default '[]'::jsonb;

comment on column profiles.historico_terceirizadoras is
  'Histórico declarado pelo candidato de trabalho em empresas terceirizadoras específicas. Não eliminatório. Array de {empresa, periodo, liderDireto}.';
