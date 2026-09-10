-- Distingue reprovacao pela empresa contratante (depois de entrevista/
-- proposta) da reprovacao generica interna ("rejeitada" continua valendo
-- pra triagem/testes internos que nunca chegam a empresa).

alter type status_candidatura add value if not exists 'reprovado_cliente';
