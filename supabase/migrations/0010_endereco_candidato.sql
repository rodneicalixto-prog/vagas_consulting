-- Endereco completo do candidato, agora obrigatorio no onboarding e usado
-- como fallback de "formulario de solicitacao de emprego" quando nao ha
-- curriculo anexado (upload de curriculo ainda nao implementado).

alter table profiles
  add column if not exists endereco text;
