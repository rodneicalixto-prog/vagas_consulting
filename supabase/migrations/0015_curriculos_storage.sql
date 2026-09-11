-- Bucket privado para os arquivos de currículo anexados pelo candidato.
-- Caminho de cada objeto: <user_id>/<timestamp>-<nome-do-arquivo>.

insert into storage.buckets (id, name, public)
values ('curriculos', 'curriculos', false)
on conflict (id) do nothing;

-- Candidato só sobe/lê/atualiza dentro da própria pasta (primeiro segmento do path = seu user_id).
create policy curriculos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'curriculos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy curriculos_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'curriculos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy curriculos_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'curriculos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leitura pelo painel admin acontece via service role (createAdminClient), que
-- ignora RLS por padrão — sem policy adicional necessária pra isso.
