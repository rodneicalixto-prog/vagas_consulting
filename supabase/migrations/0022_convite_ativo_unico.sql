-- Garante no banco que um candidato não tenha dois convites ativos para a
-- mesma vaga (a checagem na aplicação sozinha não é atômica: duplo clique ou
-- dois operadores ao mesmo tempo passavam). Achado do code review de
-- 14/10/2026.
--
-- "Ativo" = ainda ocupa a vaga: ofertado, visualizado, aceito, confirmado ou
-- em_execucao. Recusado, cancelado, concluído e ocorrência liberam novo convite.

create unique index if not exists invites_ativo_unico
  on invites (candidate_id, job_id)
  where status in ('ofertado', 'visualizado', 'aceito', 'confirmado', 'em_execucao');
