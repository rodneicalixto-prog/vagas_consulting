# Schema do Backend

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** Schema do backend v1.6 · **Data:** 14/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


> Gerado a partir do schema **real** do Supabase (`tfipbxjslpxbaybpxsql`,
> `public`), consultado diretamente via `generate_typescript_types` e
> `execute_sql` em 28/09/2026 — não é uma cópia do documento de
> planejamento original, é o estado atual de produção.

## Entidades

| Tabela | Representa |
|---|---|
| `admin_users` | Conta da equipe interna (superadmin/admin/operador) |
| `app_install_events` | Evento de instalação do PWA |
| `application_notes` | Nota interna sobre uma candidatura |
| `applications` | Candidatura de um candidato a uma vaga |
| `audit_log` | Log de auditoria (ator, ação, antes/depois) |
| `companies` | Empresa cliente |
| `compromissos` | Agenda da equipe (entrevistas, compromissos) |
| `consents` | Consentimento LGPD por finalidade/canal |
| `invites` | Convite direto pra vaga temporária |
| `jobs` | Vaga (efetiva/PJ/temporária) |
| `leads` | Lead captado (Meta Ads ou app baixado) |
| `messages` | Mensagem candidato↔operação, vinculada a `application` OU `invite` (XOR) |
| `platform_settings` | Configuração key/value da plataforma |
| `privacy_requests` | Solicitação LGPD do titular (acesso, correção, exportação, revogação, eliminação, revisão de decisão) |
| `profiles` | Perfil do candidato (dados, currículo, experiências, blacklist) |
| `reports` | Denúncia (cobrança indevida, discriminação, assédio, dado falso, outro) |
| `service_engagements` | Contrato/engajamento de prestação de serviço (temporário) |
| `temp_work` | Execução do trabalho temporário (check-in/checkout, escala, ocorrência) |

## Campos e tipos por tabela

### `jobs`
`id uuid`, `company_id uuid → companies.id`, `titulo text`,
`modalidade enum(efetiva|pj|temporaria)`,
`modelo_trabalho enum(presencial|hibrido|remoto) null`,
`local text null`, `descricao text null`, `requisitos text null`,
`remuneracao_texto text null`, `regras jsonb`,
`status enum(rascunho|revisao|publicada|pausada|preenchida|encerrada|rejeitada|suspensa|arquivada)`,
`responsavel_id uuid null`, `publicada_em timestamptz null`,
`decidido_em timestamptz null`, `decidido_por uuid null`,
`motivo_decisao text null`,
**`expira_em timestamptz null`** ← adicionado nesta sessão (28/09/2026),
`created_at`, `updated_at`.
Índice: `jobs_expira_em_idx` (para o cron de arquivamento).

### `applications`
`id uuid`, `candidate_id uuid`, `job_id uuid → jobs.id`,
`status enum(recebida|triagem|entrevista|teste|proposta|contratado|rejeitada|desistente|expirada|reprovado_cliente)`,
`respostas jsonb`, `origem text null`, `created_at`, `updated_at`.

### `invites`
`id uuid`, `candidate_id uuid`, `job_id uuid → jobs.id`,
`status enum(ofertado|visualizado|aceito|recusado|confirmado|em_execucao|concluido|cancelado|ocorrencia)`,
`motivo text null`, `resposta_em timestamptz null`, `validade timestamptz null`.

### `profiles`
`id uuid (PK = auth.users.id)`, `nome_completo text`, `resumo text null`,
`titulo_profissional text null`, `telefone text null`, `cidade text null`,
`endereco text null`, `idade int null`, `disponibilidade text null`,
`nunca_trabalhou boolean`, `perfil_completo_pct int`,
`status_validacao text`, `validado_em/validado_por`,
`modalidades_desejadas enum[]`, `modelo_trabalho enum[]`,
`curriculo_url text null`, `experiencias_profissionais jsonb`,
`historico_terceirizadoras jsonb`,
`blacklisted boolean`, `blacklist_em/blacklist_motivo/blacklist_por`.

### `companies`
`id uuid`, `razao_social text`, `nome_fantasia text null`, `cnpj text null`,
`site text null`, `segmento text null`, `endereco text null`,
`status enum(rascunho|em_analise|ajustes|aprovada|suspensa|bloqueada)`,
`decidido_em/decidido_por/motivo_decisao`.

### `messages`
`id uuid`, `remetente_id uuid`, `destinatario_id uuid`, `conteudo text`,
`lida boolean`, `application_id uuid null → applications.id`,
`invite_id uuid null → invites.id` — **constraint XOR**: exatamente um dos
dois deve estar preenchido (migration `0017`).

### `leads`
`id uuid`, `nome_completo text`, `email text`, `telefone text`,
`idade int null`, `latitude/longitude float null`, `origem text`,
`plataforma_origem text null`, `campanha_id/anuncio_id/formulario_id text null`,
`user_id uuid null`.

### `admin_users`
`user_id uuid (PK = auth.users.id)`, `perfil enum(superadmin|admin|operador)`,
`nome_exibicao text null`, `telefone text null`, `ativo boolean`,
`mfa_ativo boolean` — **campo existe, sem fluxo de enrollment real (ver
TRD.md)**.

### `audit_log`
`id uuid`, `ator_id uuid null`, `acao text`, `objeto_tipo text`,
`objeto_id uuid null`, `antes jsonb null`, `depois jsonb null`,
`ip text null`, `created_at`.

### `service_engagements` / `temp_work`
Controle de prestação de serviço temporário: modalidade, período,
periodicidade de pagamento, `status_pagamento enum(pendente|pago|parcial|atrasado)`,
escala (`jsonb`), check-in/checkout, ocorrência.

### `consents` / `privacy_requests`
`consents`: `user_id`, `finalidade`, `canal null`, `estado`,
`versao_texto null`, `origem null` — consentimento **por canal**, conforme
exigência LGPD documentada no `00-mapa-mestre.md`.
`privacy_requests`: `user_id`, `tipo enum(acesso|correcao|exportacao|revogacao|eliminacao|revisao_decisao)`,
`status enum(aberta|em_atendimento|atendida|recusada)`, `resposta null`,
`atendido_em/atendido_por`.

## Relacionamentos

- `jobs.company_id → companies.id` (N:1)
- `applications.job_id → jobs.id` (N:1); `application_notes.application_id
  → applications.id` (N:1)
- `invites.job_id → jobs.id` (N:1)
- `messages.application_id → applications.id` OU `messages.invite_id →
  invites.id` (XOR, nunca os dois)
- `compromissos.application_id → applications.id` (N:1, nullable)
- `service_engagements.{application_id, company_id, job_id}` → respectivas
  tabelas
- `temp_work.invite_id → invites.id`

## Dono de cada registro

- `profiles`, `consents`, `privacy_requests`, `applications` (via
  `candidate_id`) pertencem ao candidato (`auth.users.id`).
- `companies`, `jobs` pertencem à operação (cadastrados por
  `admin_users`), não por uma conta de empresa — reforça a decisão já
  registrada no `PROJETO.md`: **empresa não publica vaga, só solicita**.

## Fluxo de autenticação

Supabase Auth, e-mail/senha. **Sem recuperação de senha e sem MFA
implementados** (ver `TRD.md`). Sessão em cookies via `@supabase/ssr`,
refresh no middleware.

## Regras de autorização

RLS habilitado. Recursão em política de `company_members` corrigida
(migration `0005`, isolando checagem numa função `SECURITY DEFINER`
`is_company_member` — padrão a seguir pra qualquer política "membro vê
membro do mesmo grupo"). `service_role` só usada server-side, sempre
depois de confirmar papel admin via cliente RLS-respeitoso
(`src/lib/supabase/admin.ts`).

## Validação de dados

Via Zod (`src/lib/validation/schemas.ts`) nas 4+ server actions
principais: empresas, vagas, candidatura, perfil, acesso administrativo.
**Achado nesta sessão**: `schemas.ts` usa a API `errorMap` do Zod 3, que foi
descontinuada no Zod 4 (o projeto está em `zod@4.6.2`) — `tsc --noEmit`
confirma erro de tipo real em 5 pontos do arquivo. Isso não impede o app de
rodar em runtime hoje (validação ainda funciona, só a mensagem de erro
customizada pode não ser aplicada como esperado), mas **quebra o
`next build` com type-check estrito** — é um dos itens da lista de
correções pendentes.

## Retenção e exclusão

Tratado via `privacy_requests` (tipo `eliminacao`) e campo `blacklisted`
em `profiles` (soft — não é exclusão de dados). **Sem política de retenção e sem job de limpeza** (Rodnei, 14/10/2026: não há job). Decisão de política adiada.

## Migração e dados iniciais

18 migrations em `supabase/migrations/`, aplicadas sequencialmente.
`0003_seed_dados_exemplo.sql` populou dados de exemplo (não confirmado se
ainda ativo em produção ou se foi limpo — **Confirmado em produção em 14/10/2026:** 1 empresa, 1 vaga (publicada), 2 perfis e nenhuma empresa com nome de seed — o seed de exemplo foi limpo).

## Carteira por atendente (v1.4, 14/10/2026)

### `company_assignments` (nova, migration `0023`)
`id uuid`, `company_id uuid → companies.id`, `user_id uuid → auth.users.id`,
`ativo boolean default true`, `acessa_confidenciais boolean default false`,
`criado_por uuid null`, `created_at`. **Único** `(company_id, user_id)`.
Sem política RLS para usuário comum (acesso só pelo servidor).

### `jobs` (alteração)
`confidencial boolean not null default false`.

### Regras
- Operador lê vaga/empresa/candidato/convite apenas se `company_id` ∈
  atribuições ativas; confidencial exige `acessa_confidenciais = true`.
- Desativar a atribuição corta o acesso sem apagar histórico.
- Alterações de atribuição e de `confidencial` vão para `audit_log`.
- Retenção: sem mudança.

## Atualização v1.5 (14/10/2026)

Sem migration nova desde a `0023` (`jobs.confidencial` e
`company_assignments`, aplicada em produção). O histórico de etapas da
candidatura vem de `audit_log` (`candidatura_status_alterado`); novas ações
auditadas: `carteira_atribuida`, `carteira_removida`,
`carteira_confidenciais_liberadas/revogadas`, `convite_vencido_encerrado`,
`vaga_marcada/desmarcada_confidencial`.

## Atualização v1.6 (15/10/2026) — migrations 0024 a 0028 (todas aplicadas)

| Migration | Conteúdo |
|---|---|
| `0024_admin_empresa` | `companies.max_operadores` (padrão 4), `company_assignments.papel`, índice de um admin por empresa, gatilho do limite |
| `0025_consents_identificador` | `consents.identificador` (@usuário/ID do Telegram) |
| `0026_blacklist_empresa` | `company_blacklist` (por candidato ou telefone normalizado) |
| `0027_integration_credentials` | `integration_credentials` (segredo cifrado, escopo plataforma/empresa) |
| `0028_inbox_conversas` | `conversations`, `conversation_messages`, `channel_opt_outs` |

Todas com RLS ligada e sem política pública (acesso só pelo servidor).
Pendência: a `0021` (alinha schema) segue não aplicada (no-op documentado).

### Migration 0030 — anexos no inbox (15/10/2026)

`conversation_messages` ganha `tipo` (texto, imagem, documento, audio, video),
`anexo_path`, `anexo_nome`, `anexo_mime`, `anexo_tamanho` e `resposta_a`
(auto-referência, `on delete set null`). Bucket privado `conversas-anexos`
(16 MB), sem políticas: acesso só pelo servidor com chave de serviço.
