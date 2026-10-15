-- Anexos e respostas no inbox (WhatsApp): imagem, documento, áudio e vídeo.
-- Aditiva. Arquivos ficam em bucket privado; só o servidor (chave de serviço)
-- gera links temporários, depois de validar o escopo da empresa.

alter table conversation_messages
  add column if not exists tipo text not null default 'texto'
    check (tipo in ('texto', 'imagem', 'documento', 'audio', 'video')),
  add column if not exists anexo_path text,
  add column if not exists anexo_nome text,
  add column if not exists anexo_mime text,
  add column if not exists anexo_tamanho integer check (anexo_tamanho is null or anexo_tamanho >= 0),
  add column if not exists resposta_a uuid references conversation_messages (id) on delete set null;

create index if not exists conversation_messages_resposta_idx
  on conversation_messages (resposta_a) where resposta_a is not null;

-- Bucket privado, sem políticas: nenhum acesso direto do navegador.
insert into storage.buckets (id, name, public, file_size_limit)
values ('conversas-anexos', 'conversas-anexos', false, 16777216)
on conflict (id) do nothing;
