-- Base de conhecimento confiável (agente de IA): validade e dono por nota.
-- Aditiva. Nota vencida deixa de entrar no contexto do agente.

alter table ai_knowledge_notes
  add column if not exists valida_ate date,
  add column if not exists dono_id uuid references auth.users (id) on delete set null;

create index if not exists ai_knowledge_notes_validade_idx
  on ai_knowledge_notes (company_id, valida_ate)
  where status = 'aprovada';
