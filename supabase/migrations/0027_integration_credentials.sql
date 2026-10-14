-- Integrações (Fase A): cofre de credenciais cifradas por plataforma/empresa.
-- Spec: docs/specs/COMUNICACAO_OMNICANAL.md (§4, §6) e INTEGRACOES.md.
-- Aditiva: tabela nova, vazia. O segredo é cifrado na aplicação (AES-256-GCM)
-- antes de chegar aqui; o banco nunca vê a chave em texto puro.

create table if not exists integration_credentials (
  id uuid primary key default gen_random_uuid(),
  escopo text not null check (escopo in ('plataforma', 'empresa')),
  company_id uuid references companies (id) on delete cascade,
  provedor text not null check (
    provedor in ('openai', 'anthropic', 'groq', 'resend', 'sms', 'telegram', 'evolution')
  ),
  -- Segredo cifrado ("v1:iv:tag:ciphertext", base64). Nulo só para a
  -- instância Evolution da empresa, que usa a chave da plataforma.
  segredo_cifrado text,
  ultimos4 text,
  -- Dados não secretos: URL da Evolution, nome da instância, remetente etc.
  config jsonb not null default '{}'::jsonb,
  teto_mensal_usd numeric(10, 2) check (teto_mensal_usd is null or teto_mensal_usd >= 0),
  ativo boolean not null default true,
  status text not null default 'nao_testada' check (status in ('nao_testada', 'ok', 'erro')),
  status_msg text,
  testado_em timestamptz,
  criado_por uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((escopo = 'plataforma' and company_id is null) or (escopo = 'empresa' and company_id is not null))
);

-- Uma credencial por provedor na plataforma e uma por provedor por empresa.
create unique index if not exists integration_credentials_plataforma_unico
  on integration_credentials (provedor) where escopo = 'plataforma';

create unique index if not exists integration_credentials_empresa_unico
  on integration_credentials (company_id, provedor) where escopo = 'empresa';

alter table integration_credentials enable row level security;
-- Sem política: só o servidor (chave de serviço) acessa.
