-- Admin da empresa e limite de operadores (Fase 1).
-- Spec: docs/specs/ADMIN_DA_EMPRESA.md (v0.1, decisões E1-E9).
-- Aditiva: com os padrões abaixo nada muda para quem já usa a plataforma.
--
-- Decisão de modelagem: o admin da empresa NÃO é um valor novo do enum
-- admin_perfil (alterar enum exige migration separada e é difícil de
-- desfazer). Ele é um usuário de perfil `operador` com uma atribuição ativa
-- de `papel = 'admin_empresa'` na empresa dele (uma pessoa, uma empresa).

-- Limite total de operadores da empresa (E1). Padrão 4; só o superadmin altera.
alter table companies
  add column if not exists max_operadores integer not null default 4
  check (max_operadores >= 0);

-- Papel da pessoa na empresa.
alter table company_assignments
  add column if not exists papel text not null default 'operador'
  check (papel in ('operador', 'admin_empresa'));

-- E6: um admin administra uma única empresa.
create unique index if not exists company_assignments_admin_unico
  on company_assignments (user_id)
  where papel = 'admin_empresa' and ativo;

-- Trava no banco: nunca passar do limite de operadores ativos da empresa,
-- mesmo com dois convites simultâneos (a empresa é bloqueada durante a
-- conferência). Admin da empresa não conta no limite.
create or replace function public.checa_limite_operadores()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  limite integer;
  em_uso integer;
begin
  if new.papel <> 'operador' or new.ativo is not true then
    return new;
  end if;

  select max_operadores into limite
    from companies where id = new.company_id for update;

  select count(*) into em_uso
    from company_assignments
   where company_id = new.company_id
     and papel = 'operador'
     and ativo
     and id <> new.id;

  if limite is not null and em_uso >= limite then
    raise exception 'limite_operadores_excedido'
      using errcode = 'P0001',
            hint = 'A empresa atingiu o limite de operadores ativos.';
  end if;

  return new;
end;
$$;

drop trigger if exists company_assignments_limite on company_assignments;
create trigger company_assignments_limite
  before insert or update on company_assignments
  for each row execute function public.checa_limite_operadores();
