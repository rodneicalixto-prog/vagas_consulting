# Schema do Backend

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** Schema do backend v1.8 · **Data:** 15/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


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
| `entrevistas_online` | Entrevista online proposta pela equipe (data, link https, status proposta/confirmada/recusada/substituida), com o compromisso da agenda ligado (`compromisso_id`). Migrations 0047 e 0048. |
| `invites` | Convite direto para vaga publicada (temporária, PJ ou efetiva) |
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

### Migration 0031 — dono da conversa (15/10/2026, aplicada)

`conversations.atendente_id` (referência a `auth.users`, `on delete set null`),
`conversations.atribuida_em` e índice `(company_id, atendente_id)`.

### Migration 0032, agente de IA (APLICADA em 15/10/2026)

Tabelas `ai_agents`, `ai_knowledge_notes`, `ai_suggestions` e `ai_agent_runs`,
todas com RLS ligada e sem política pública. Campos em
`specs/AGENTE_IA_FASE3.md` §4. Só será aplicada no passo 3A.

### Migration 0033 — vaga estruturada (15/10/2026, aplicada)

`jobs.criterios` (jsonb, padrão `{}`): rotina, obrigatórios, eliminatórios,
desejáveis, comportamentais, senioridade, anos de experiência, diferencial e
data da confirmação. Aditiva; `regras` continua sendo o texto ao candidato.

## Atualização v1.7 (15/10/2026) — migrations 0034 a 0043 (todas aplicadas)

Todas aditivas, com RLS ligada e sem política pública (acesso só pelo servidor,
sempre atrás do escopo do operador).

| Migration | Tabela ou mudança | Para quê |
|---|---|---|
| `0034_triagem_curriculos` | `job_screenings` (job, candidatura, hash dos critérios, resultado, pontuação, eliminado) | Triagem 3G; único por vaga e candidatura |
| `0035_roteiro_ficha_entrevista` | `interview_scripts` (versionado por vaga), `interview_scorecards` (ficha por entrevistador) | Roteiro e ficha 3H |
| `0036_testes_dinamicas` | `assessments`, `assessment_results` (nota 1 a 4 por candidatura) | Testes e dinâmicas 3J |
| `0037_laudos_candidato` | `candidate_reports` (versão, modo, conteúdo, recomendação, assinatura) | Laudo 3L; assinado é imutável |
| `0038_devolutivas` | `candidate_feedbacks`; índice único parcial: uma `enviada` por candidatura | Devolutiva 3I |
| `0039_indicadores_rs` | `recruitment_goals`, `recruitment_monthly`, `recruitment_action_plans` | Indicadores 3M |
| `0040_abordagem_ativa` | `outreach_drafts`; único por vaga e contato | Abordagem 3K; perfil colado nunca gravado |
| `0041_abordagem_verificacoes` | `outreach_drafts.verificacoes` | Verificação guardada com o rascunho |
| `0042_carta_oferta` | `offer_letters` (versão, dados, texto, validade, envio e resposta) | Carta-oferta 3P |
| `0043_base_confiabilidade` | `ai_knowledge_notes.valida_ate`, `dono_id` | Validade e dono das notas |

Sem migration: vaga estruturada (já em `0033`), divulgação 3N, áudio do gestor,
recuperação de notas, exportação em Word.

Dado novo em coluna existente: `applications.origem` passa a receber
`divulgacao_<canal>` (linkedin, instagram, whatsapp, portal, comunidade,
interna, indicacao) a partir do marcador `?o=` do link; o valor antigo
`app_candidato` continua para quem chega sem marcador.

### Migrations 0044 e 0045 — linhas de WhatsApp (15/10/2026, aplicadas)

| Mudança | Para quê |
|---|---|
| `whatsapp_lines` (instância única, apelido, operador, agente, padrão, ativa) | um ou mais números por empresa, compartilhados ou dedicados |
| `companies.max_linhas_whatsapp` (1 a 50, padrão 1) | limite comercial de números |
| `conversations.line_id` e índice único `(company_id, canal, telefone, line_id)` com `NULLS NOT DISTINCT` | uma conversa por telefone e por linha |
| Carga | cada instância cadastrada em Integrações virou a linha padrão da empresa |

A `0044` trocou a unicidade por um índice com expressão, que não aceita o
`upsert`; a `0045` a corrigiu para um índice sobre colunas.

Estado do banco em 15/10/2026: migrations aplicadas até a `0045`. A
`whatsapp_lines` tem RLS ligada e sem política pública, como as demais.

### Migration 0046 — assistente de ajuda (15/10/2026, aplicada)

`help_questions` (pergunta anonimizada, papel, tela, pedaços usados, sem
resposta, útil; RLS ligada, sem política pública; retenção de 90 dias) e
`ai_agents.ajuda_ativa` (padrão ligado).

### Migrations 0047 e 0048 — entrevista online (23/10/2026, aplicadas)

`entrevistas_online`: proposta da equipe (data_hora com fuso de Brasília, link https, status `proposta`, `confirmada`, `recusada` ou `substituida`, `criada_por`, `respondida_em`, `compromisso_id`). Índice único parcial: uma entrevista ativa (proposta ou confirmada) por candidatura. RLS ligada: o candidato só lê as entrevistas das próprias candidaturas; a escrita é feita pelo servidor (service role). A migration 0048 adiciona `compromisso_id`, ligando a entrevista ao compromisso da agenda criado na confirmação.

Estado do banco em 23/10/2026: migrations aplicadas até a `0048`.

## Migration 0049 — valores, regras por vaga e fila de validação (26/10/2026, NÃO aplicada)

Spec: `docs/specs/AVALIACAO_IA_GANCHOS.md` §3A e §3B. Aditiva; RLS ligada e sem política pública (acesso só pelo servidor).

| Objeto | O que guarda |
|---|---|
| `jobs.regras_ia` (jsonb, padrão `{}`) | Regras da IA na vaga: modo (`texto`/`voz`/`humano`), cortes, pesos, perguntas, gatilhos de escalada, horário, tom, instruções, `versao`, `confirmado_em` |
| `company_values` | Valores da empresa para o fit cultural: nome, descrição, comportamentos e perguntas (jsonb), peso 1–5, corte 0–100, ativo. Única por (empresa, nome) |
| `validacoes_reprovacao` | Caso em que a IA apontou "não segue": `etapa` (`triagem`/`entrevista_ia`/`competencias`), `status` (`aguardando`/`confirmada`/`revertida`/`aguardando_dados`), `motivo` (jsonb: critério, eliminatório, evidência, notas, confiança, o que mudaria, análise, justificativa incompleta, hash dos critérios), `prazo_em` (72 h), decisão, observação, versão das regras. Índice único parcial: um caso ativo por candidatura e etapa |

**Ordem de publicação:** aplicar a migration **antes** do deploy do código. Sem a tabela, a triagem não consegue abrir o caso e desfaz a triagem daquele candidato (nunca deixa reprovado sem validação).

## Migration 0050 — plataformas de emprego no cofre (26/10/2026, NÃO aplicada)

Spec: `docs/specs/HUNTER_PREPARACAO.md` §0. Aditiva: amplia o check de `integration_credentials.provedor` com `vagascom`, `infojobs` e `linkedin`. Usuário, tipo de acesso, plano e a marca de uso automático ficam em `config` (não secreto); a senha ou chave de API fica em `segredo_cifrado` (AES-256-GCM). Para senha, `ultimos4` fica nulo. Sem tabela nova.

## Migration 0051 — prospects do hunter (26/10/2026, NÃO aplicada)

Spec: `docs/specs/HUNTER_PREPARACAO.md`. Aditiva; RLS ligada e sem política pública. Tabela `hunter_prospects`: prospect por vaga, com `fonte`, `estado`, `fit`, `pontuacao`, `resultado` (avaliação às cegas), `canal`, `texto` (mensagem), `token` (link rastreado `/h/<token>`), carimbos de aprovação, envio, clique e candidatura, `retencao_ate` (30 dias) e `anonimizado_em`. Telefone e e-mail ficam em texto até a anonimização; os hashes `chave_tel` e `chave_email` **permanecem** para nunca reimportar nem reabordar. Índices únicos por vaga e telefone ou e-mail.

## Migration 0052 — origem do candidato (26/10/2026, NÃO aplicada)

Spec: `docs/specs/ORIGEM_PDF_E_VAGAS_INCLUSIVAS.md`. Aditiva: `profiles.origem_canal`, `origem_detalhe` e `origem_em` (primeiro toque). Perfis antigos ficam nulos ("não informado"). **Ordem de publicação:** aplicar `0051` e `0052` **antes** do deploy do código.
