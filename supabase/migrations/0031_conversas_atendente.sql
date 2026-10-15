-- Dono da conversa (atendente): fila, assumir, devolver e transferir.
-- Aditiva. Sem atendente = conversa na fila. O sigilo entre operadores é
-- aplicado no servidor (o painel usa chave de serviço, a RLS não protege).

alter table conversations
  add column if not exists atendente_id uuid references auth.users (id) on delete set null,
  add column if not exists atribuida_em timestamptz;

create index if not exists conversations_atendente_idx
  on conversations (company_id, atendente_id);
