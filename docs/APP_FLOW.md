# Fluxo do App (App Flow)

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** Fluxo do app v1.7 · **Data:** 15/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


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

## Operador: escopo da carteira (v1.4, 14/10/2026)

- `/admin` para **operador** mostra só empresas, vagas, candidatos, convites e
  indicadores da carteira ativa. Admin/superadmin veem tudo.
- Vaga criada por operador nasce em **rascunho**; só admin/superadmin publicam.
- `Prestações`, `Leads`, `Black list`, `Denúncias`, `LGPD`, `Auditoria`,
  `Acesso` e `Estratégico`: não aparecem para operador.
- **Carteira** (superadmin): atribuir, ativar e desativar operadores por
  empresa; marcar operador de confiança.
- Vaga **confidencial**: oculta do operador comum; candidato vê "Empresa
  confidencial" até a etapa de entrevista.
- Acesso a registro fora da carteira → "Acesso não autorizado" + auditoria.

## Regras de entrada do candidato (atualizado em 14/10/2026)

- Conta **sem perfil** (ex.: criada por convite ou de administrador) que
  abre qualquer tela do candidato é levada a `/onboarding`, que cria o perfil.
- Telas de edição de perfil que não conseguem gravar (perfil inexistente)
  também levam ao `/onboarding`, em vez de fingir que salvaram.
- Em `/vagas/[id]`: com convite pendente para a vaga o botão é
  **Responder convite** (`/convites/[id]`); sem convite é **Candidatar-se**.
- Em `/perfil/documentos` sem arquivo há duas saídas: anexar currículo ou
  **preencher o currículo no app** (`/experiencias`).

## Completude do perfil (regra, 14/10/2026)

Calculada **na hora** (`src/lib/perfil.ts`), nunca de número gravado. 9 itens
de peso igual: nome, cidade, telefone, endereço, idade, modelo de trabalho,
modalidades desejadas, disponibilidade e experiência (ou "Nunca trabalhei").
Currículo anexado não conta (é opcional). O Início mostra o percentual e a
lista do que falta, com atalho para a tela certa. O painel admin usa o mesmo
cálculo. A coluna `perfil_completo_pct` fica apenas como espelho gravado no
cadastro.

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

## Atualização v1.5 (14/10/2026) — novas rotas

| Rota | Quem | Função |
|---|---|---|
| `/admin/carteira` | superadmin | Atribuir operador a empresa; liberar confidenciais |
| `/admin/talentos` | operador, admin, superadmin | Banco de talentos em resumo; convidar para vaga da carteira (72 h) |
| `/admin/ranking` | admin, superadmin | Candidatos com mais candidaturas, vagas disputadas, volume por empresa |
| `/processos/[id]` | candidato | Linha do tempo da candidatura até Aprovado/Não aprovado |

Regras de fluxo: convite vencido sem resposta encerra como cancelado e libera
novo convite; o resultado de uma candidatura não impede nova candidatura.

## Atualização v1.6 (15/10/2026) — rotas novas

| Rota | Quem | Função |
|---|---|---|
| `/vagas`, `/vagas/<id>` | Público | Vitrine; candidatar leva ao login e volta à vaga |
| `/api/cadastro/continuar` | Candidato logado | Guarda o destino e leva à etapa do cadastro que falta |
| `/admin/operadores` | Admin da empresa (leitura: admin/superadmin) | Convidar, ativar, desativar, acesso de confiança, contador |
| `/admin/blacklist` | Plataforma (global) e admin da empresa (a dele) | Cadastrar e liberar |
| `/admin/integracoes` | Superadmin; admin da empresa (chave de IA própria) | Cofre e teste de conexão |
| `/admin/conversas` | Operador e acima (na carteira) | Inbox de WhatsApp |
| `/admin/contatos`, `/admin/ranking`, `/admin/talentos`, `/admin/agenda/*` | Conforme papel | Ver specs |
| `/processos/<id>` | Candidato | Linha do tempo da candidatura |

### Cadastro da empresa e menu (15/10/2026)

- **Empresas:** razão social, fantasia, CNPJ, telefone, e-mail, endereço
  completo (CEP preenche logradouro, bairro, cidade e UF) e **responsável**
  (nome obrigatório, cargo, telefone, e-mail). Editável por quem aprova empresa.
- **Menu:** Visão geral, Conversas, Agenda, Candidatos, Empresas e vagas,
  Financeiro e dados, Governança, Plataforma. Cada grupo abre em cascata.

## Atualização v1.7 (15/10/2026) — rotas do ciclo de R&S

Todas sob `/admin/vagas/[id]`, atrás do escopo da vaga (carteira e sigilo).

| Rota | Função | Documento de saída |
|---|---|---|
| `/` (página da vaga) | Critérios estruturados, qualidade, geração por IA, áudio do gestor | — |
| `/divulgacao` | Texto por canal, ganchos, link com origem | cópia |
| `/triagem` | Ranking com evidência, top N, planilha | CSV |
| `/entrevista`, `/entrevista/[applicationId]` | Roteiro versionado e ficha de parecer | Word, PDF |
| `/testes`, `/testes/[assessmentId]` | Instrumento, aprovação, nota por candidato | Word (candidato e aplicador) |
| `/laudos`, `/laudos/[laudoId]`, `/laudos/comparativo` | Quadro cargo x candidato, recomendação, assinatura | Word, PDF |
| `/devolutivas`, `/devolutivas/[feedbackId]` | Rascunho, revisão, envio registrado | cópia |
| `/abordagem`, `/abordagem/[draftId]` | Abordagem ativa e follow-ups | cópia |
| `/ofertas`, `/ofertas/editar`, `/ofertas/[offerId]` | Carta-oferta | Word, PDF |

Fora da vaga: `/admin/indicadores` (indicadores, metas, plano de ação),
`/admin/abordagens` (follow-ups vencidos) e `/admin/agente` (base de
conhecimento com confiabilidade e qualidade por nota).

Sequência natural: critérios, divulgação, triagem, roteiro e ficha, testes,
laudo, devolutiva ou carta-oferta; indicadores fecham o ciclo. Registro no
funil: marcar a carta como enviada move a candidatura para Proposta.

### Rotas de números de WhatsApp (15/10/2026)

| Rota | Quem | Função |
|---|---|---|
| `/admin/linhas` | Superadmin; admin da empresa (a dele) | Criar número, QR code, estado, desconectar, editar, limite (só plataforma) |
