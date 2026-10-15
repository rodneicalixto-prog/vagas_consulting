-- Vaga estruturada (agente de IA, passo 3O): critérios em campos.
-- Aditiva: não altera dados existentes. `regras` segue sendo o conteúdo
-- mostrado ao candidato; `criterios` é o que alimenta divulgação, triagem,
-- roteiro, testes e laudo.

alter table jobs
  add column if not exists criterios jsonb not null default '{}'::jsonb;
