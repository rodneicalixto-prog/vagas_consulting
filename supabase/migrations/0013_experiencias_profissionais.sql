-- Historico profissional do candidato (curriculo/experiencias), obrigatorio
-- depois do onboarding antes de usar o resto do app. Estrutura de campo
-- baseada em modelo padrao de formulario de solicitacao de emprego:
-- empresa, cargo, periodo, motivo de saida.

alter table profiles
  add column if not exists experiencias_profissionais jsonb not null default '[]'::jsonb,
  add column if not exists nunca_trabalhou boolean not null default false;
