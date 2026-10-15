-- Correção da 0044: a unicidade da conversa por linha passa a ser um índice
-- sobre colunas (NULLS NOT DISTINCT), para o upsert por
-- (company_id, canal, telefone_normalizado, line_id) funcionar. O índice com
-- expressão da 0044 não pode ser alvo de ON CONFLICT.

drop index if exists conversations_linha_unica;

create unique index if not exists conversations_linha_unica
  on conversations (company_id, canal, telefone_normalizado, line_id) nulls not distinct;
