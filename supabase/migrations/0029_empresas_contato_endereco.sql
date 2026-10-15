-- Cadastro completo da empresa: telefone, endereço estruturado e responsável.
-- Aditiva: colunas novas, todas opcionais. `endereco` (texto) continua e passa
-- a ser montado a partir dos campos estruturados.

alter table companies
  add column if not exists telefone text,
  add column if not exists email_contato text,
  add column if not exists cep text,
  add column if not exists logradouro text,
  add column if not exists numero text,
  add column if not exists complemento text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists uf text check (uf is null or uf ~ '^[A-Z]{2}$'),
  add column if not exists responsavel_nome text,
  add column if not exists responsavel_cargo text,
  add column if not exists responsavel_telefone text,
  add column if not exists responsavel_email text;
