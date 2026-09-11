-- Corrige messages_vinculo_check pra exigir exatamente um vinculo
-- (application_id XOR invite_id), fechando a pendencia da secao 5.1 do
-- PROJETO.md. A versao anterior (0001) so exigia "pelo menos um",
-- aceitando os dois preenchidos ao mesmo tempo em inserts feitos com
-- service_role (que ignoram a policy de RLS do candidato).

alter table messages
  drop constraint if exists messages_vinculo_check;

alter table messages
  add constraint messages_vinculo_check
  check (num_nonnulls(application_id, invite_id) = 1);
