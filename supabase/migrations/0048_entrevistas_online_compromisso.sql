-- Liga a entrevista online ao compromisso da agenda, criado quando o candidato confirma.
-- Permite cancelar o compromisso se a proposta for substituída ou recusada.

alter table public.entrevistas_online
  add column compromisso_id uuid references public.compromissos(id) on delete set null;
