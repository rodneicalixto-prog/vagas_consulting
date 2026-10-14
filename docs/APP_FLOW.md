# Fluxo do App (App Flow)

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** Fluxo do app v1.3 · **Data:** 14/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


> Rascunho gerado a partir da árvore de rotas real em `src/app/`.

## Pontos de entrada

- Candidato: `/` (landing) → `/login` → `/onboarding` (primeiro uso) →
  `/inicio`.
- Admin/operação interna: `/admin/login` → `/admin` (dashboard).
- Lead externo (Meta Ads): não entra pelo app — cai direto na tabela
  `leads` via webhook, tratado pela operação interna.
- Instalação como PWA: `install-app-button.tsx` / `install-lead-capture.tsx`
  capturam o evento de instalação (`app_install_events`).

## Inventário de telas — área do candidato (`(app)`)

| Rota | Pra que serve | Dados que precisa |
|---|---|---|
| `/inicio` | Home do candidato | Perfil, vagas em destaque |
| `/vagas` | Lista/busca de vagas publicadas | `jobs` (status=publicada) |
| `/vagas/[id]` | Detalhe da vaga | `jobs`, `companies` |
| `/vagas/[id]/candidatura` | Formulário de candidatura | `jobs.regras`, respostas do candidato |
| `/processos` | Acompanhamento das candidaturas e atalho para convites | `applications`, `invites` |
| `/convites` | Lista de convites do candidato | `invites` |
| `/convites/[id]` | Detalhe, aceitar ou recusar convite | `invites`, `audit_log` |
| `/mensagens` | Chat candidato↔operação | `messages` |
| `/perfil` | Hub do perfil | `profiles` |
| `/perfil/dados-pessoais` | Dados pessoais | `profiles` (campos base) |
| `/perfil/documentos` | Upload de currículo + ação de IA | `curriculo_url`, Storage |
| `/perfil/preferencias-vaga` | Preferências de busca | `profiles` (modalidades, localização) |
| `/experiencias` | Experiências profissionais (fallback manual à IA) | `profiles.experiencias_profissionais` |
| `/termos` | Termos de uso / aceite | `consents` |
| `/onboarding` | Fluxo de primeiro acesso | — |

## Inventário de telas — painel admin (`/admin/(app)`)

| Rota | Pra que serve |
|---|---|
| `/admin` | Dashboard |
| `/admin/empresas` | Cadastro/validação de empresas |
| `/admin/vagas` | Cadastro/publicação de vagas (fluxo "solicitação → vaga real") |
| `/admin/candidatos` | Lista e ficha de candidatos |
| `/admin/candidatos/[id]` | Detalhe do candidato (experiências, histórico) |
| `/admin/leads` | Leads capturados (Meta Ads + app baixado) |
| `/admin/agenda` | Agenda unificada da equipe |
| `/admin/agenda/equipe` | Visão por membro da equipe |
| `/admin/prestacoes` | Pagamentos de temporários |
| `/admin/auditoria` | Log de auditoria + exportação (`/api/admin/auditoria/export`) |
| `/admin/blacklist` | Candidatos com restrição |
| `/admin/denuncias` | Moderação de denúncias |
| `/admin/lgpd` | Solicitações LGPD do titular |
| `/admin/estrategico` | Painel estratégico: KPIs de empresas cadastradas, instalações do app, leads, candidatos e contratações fechadas; séries dos últimos 70 dias (leads/candidatos), distribuição de candidaturas, vagas por modalidade e financeiro de prestações (confirmado em `src/app/admin/(app)/estrategico/page.tsx`, 14/10/2026) |
| `/admin/convites` | Criar, confirmar e cancelar convites para vaga temporária | `invites`, `audit_log` |
| `/admin/acesso` | Convite e gestão de contas administrativas |
| `/admin/acesso-negado` | Tela de acesso negado por papel |

## Jornada principal (candidato)

`/inicio` → busca em `/vagas` → `/vagas/[id]` (detalhe) →
`/vagas/[id]/candidatura` (preenche e envia) → estado de sucesso
(candidatura registrada, status inicial `recebida`) → acompanha em
`/processos`.

## Jornadas alternativas

- Candidato recebe convite direto pra temporário (`invites`) sem passar
  pelo fluxo de candidatura — aceita/recusa/confirma pelo próprio fluxo de
  `/processos` ou mensagens. **Decisão (Rodnei, 14/10/2026): o aceite de convite tem tela própria** — `/convites/[id]`, construída em 14/10/2026 (ver `docs/specs/CONVITE_ACEITE.md`).
- Candidato reprovado (`status = reprovado_cliente`) ou desistente —
  estado terminal, sem retomada automática.
- Admin corrige vaga em vez de publicar/encerrar (`acao: "corrigir"` em
  `DecideJobSchema`).

## Regras de navegação

- Middleware (`src/lib/supabase/middleware.ts`) bloqueia qualquer rota
  não-pública sem sessão, redirecionando pra `/login` (candidato) ou
  `/admin/login` (admin) conforme o prefixo da rota.
- Rotas públicas: `/`, `/login`, `/termos`, `/onboarding`, `/admin/login`,
  `/admin/acesso-negado`, `/api/webhooks/*`.
- Usuário logado que acessa `/login` é redirecionado pra `/inicio`.

## Estados vazios e bloqueados

- Sem internet: `offline.html` (fallback do service worker).
- Sem permissão administrativa: `/admin/acesso-negado`.
- **Inventário de estados vazios feito** — ver Anexo A de `UI_UX_BRIEFING.md` (14/10/2026).

## Primeiro uso

`/onboarding` cobre o fluxo inicial; aceite de termos tratado como
consentimento separado (`consents`, ver `TRD.md` → LGPD), não como
checkbox genérico.
