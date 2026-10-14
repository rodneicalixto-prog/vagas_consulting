-- Identificador do canal no consentimento (ex.: @usuário ou ID do Telegram).
-- Aditiva: nulo para todos os registros atuais. A RLS por dono do
-- consentimento já cobre a coluna nova.
alter table consents
  add column if not exists identificador text;

comment on column consents.identificador is
  'Endereço do canal informado pelo titular ao conceder o consentimento (ex.: @usuario do Telegram). Dado pessoal: tratar com a mesma finalidade do canal.';
