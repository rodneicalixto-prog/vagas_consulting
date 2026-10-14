-- Auto-arquivamento de vagas expiradas — parte 1: enum, coluna e índice.
--
-- IMPORTANTE: o Postgres recusa usar um valor de enum recém-criado na mesma
-- transação (55P04 "unsafe use of new value"). Por isso a função que usa
-- 'arquivada' fica em outra migration (0019). Em produção estas duas partes
-- foram aplicadas em 28/09/2026 como `auto_arquivamento_vagas_enum_e_coluna`
-- e `auto_arquivamento_vagas_funcao`.

alter type status_vaga add value if not exists 'arquivada';

alter table jobs add column if not exists expira_em timestamptz;

create index if not exists jobs_expira_em_idx on jobs (expira_em);
