-- Corrige recursão infinita na RLS de company_members.
--
-- A policy `company_members_select_own_company` consultava a própria
-- tabela `company_members` dentro do EXISTS, e o Postgres reaplica RLS
-- nessa subconsulta — gerando `42P17 infinite recursion detected in
-- policy for relation "company_members"` em toda leitura, inclusive a
-- checagem de acesso ao portal da empresa (que ficava sempre "sem
-- acesso" mesmo com o vínculo existindo).
--
-- Fix: função SECURITY DEFINER que consulta a tabela ignorando RLS
-- (roda com os privilégios do dono da função, não do chamador), quebrando
-- o ciclo.

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from company_members cm
    where cm.company_id = target_company_id and cm.user_id = auth.uid()
  );
$$;

-- Só usuários autenticados chamam a função (ela só responde algo útil
-- pra quem já tem auth.uid(); anon sempre receberia false, mas revogar
-- deixa isso explícito e resolve o aviso do linter de segurança).
revoke execute on function public.is_company_member(uuid) from public;
revoke execute on function public.is_company_member(uuid) from anon;
grant execute on function public.is_company_member(uuid) to authenticated;

drop policy if exists company_members_select_own_company on company_members;

create policy company_members_select_own_company on company_members
  for select using (public.is_company_member(company_id));
