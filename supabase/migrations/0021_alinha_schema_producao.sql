-- Alinha o repositório com o schema real de produção.
--
-- Achado do teste de restauração (14/10/2026): estas colunas existem em
-- produção (aplicadas em 09/09/2026 como migrations avulsas
-- `profiles_add_idade` e `leads_add_geolocalizacao`), mas não estavam em
-- nenhuma migration do repositório. Reconstruir o banco só com as migrations
-- deixava o schema incompleto e a restauração de `profiles` falhava com
-- PGRST204 ("Could not find the 'idade' column").
--
-- Idempotente: em produção é um no-op.

alter table profiles add column if not exists idade smallint;

alter table leads add column if not exists latitude numeric;
alter table leads add column if not exists longitude numeric;
