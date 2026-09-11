-- Atribuição de campanha para leads captados via anúncios (Meta/LinkedIn),
-- aditivo — não altera o uso atual de `origem` (ex. 'app_install').

alter table leads
  add column plataforma_origem text,
  add column campanha_id text,
  add column anuncio_id text,
  add column formulario_id text;

comment on column leads.plataforma_origem is
  'meta | linkedin | app_install | null (origem desconhecida/legado)';
