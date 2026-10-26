-- Hunter (docs/specs/HUNTER_PREPARACAO.md): acesso às plataformas de emprego no cofre cifrado.
-- Aditiva: só amplia a lista de provedores aceitos. NÃO APLICADA: aplicar só com autorização do Rodnei.
-- O usuário e as opções ficam em `config` (não secreto); a senha ou chave de API fica em `segredo_cifrado`
-- (AES-256-GCM, cifrado na aplicação). Para senha, `ultimos4` fica nulo.

alter table public.integration_credentials
  drop constraint if exists integration_credentials_provedor_check;

alter table public.integration_credentials
  add constraint integration_credentials_provedor_check
  check (provedor in (
    'openai', 'anthropic', 'groq', 'resend', 'sms', 'telegram', 'evolution',
    'vagascom', 'infojobs', 'linkedin'
  ));
