# Documento de Requisitos Técnicos (TRD)

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** TRD v1.1 · **Data:** 14/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


> Rascunho gerado a partir do `package.json`, `next.config.ts`, código-fonte
> e `CLAUDE.md` deste repositório.

## Plataformas

Web responsiva, instalável como PWA (`manifest.ts`, `sw.js`,
`register-service-worker.tsx`, `offline.html`). Sem app nativo iOS/Android.

## Frontend e hospedagem

- Next.js 16.3.4 (App Router), React 19.2.8, TypeScript 5.9.
- Tailwind CSS 4 (`@tailwindcss/postcss`).
- Hospedagem: Vercel, projeto `vagas-consulting`
  (`prj_useLOGXbwEN5pIjnkp4fyO0J8j4A`), team
  `rodnei-calixto-s-projects`. Deploy automático a cada push em `main`.
- Domínio de produção observado: `vagas-consulting-umber.vercel.app`.

## Backend e banco de dados

- Supabase (Postgres 17.6.1), projeto `tfipbxjslpxbaybpxsql`, região
  `sa-east-1` (São Paulo), org "SOS MKT" (plano Free).
- 18 migrations aplicadas em `supabase/migrations/` (0001 a 0018).
- Sem backend separado — lógica de servidor via Next.js Server Actions e
  Route Handlers (`src/app/**/actions.ts`, `src/app/api/**/route.ts`).

## Autenticação e permissões

- Supabase Auth (e-mail/senha) via `@supabase/ssr`, sessão em cookies,
  refresh no middleware (`src/lib/supabase/middleware.ts`).
- **Sem fluxo de recuperação de senha implementado.**
- **Sem MFA real** — coluna `admin_users.mfa_ativo` existe e é exibida na
  UI (`/admin/acesso`), mas não há enrollment/verificação TOTP.
- Papéis: candidato (usuário comum), e três perfis administrativos
  (`admin_perfil`): `superadmin`, `admin`, `operador`, geridos em
  `admin_users` e verificados em `src/lib/auth/internal.ts`.
- RLS habilitado nas tabelas do Postgres; `service_role` isolada em
  `src/lib/supabase/admin.ts` com `import "server-only"`.

## Serviços externos e APIs

| Serviço | Uso | Status |
|---|---|---|
| Supabase | Banco, Auth, Storage (currículos) | Ativo |
| Vercel | Hospedagem, deploy, cron | Ativo |
| Vercel Cron | Arquivamento diário de vagas expiradas (`/api/cron/archive-jobs`) | Ativo — corrigido em 28/09/2026 |
| Meta Graph API (Lead Ads) | Webhook de leads via anúncios | Endpoint pronto, **inerte** até `META_LEADS_VERIFY_TOKEN`/`META_APP_SECRET`/`META_PAGE_ACCESS_TOKEN` serem configurados |
| Agente de IA para currículo | Extrai dados de PDF/imagem anexado | Ativo (`src/lib/ai/curriculo.ts`, via pacote `ai`) — [A PREENCHER: qual modelo/provider exatamente está configurado — não está documentado fora do código] |
| Evolution API + n8n (WhatsApp) | Canal de triagem/vídeo-entrevista | Planejado, não iniciado |

## Arquitetura

```
Candidato/Admin (browser, PWA)
        │  HTTPS
        ▼
Next.js (Vercel) ── Server Actions / Route Handlers
        │
        ├── Supabase Auth (cookies via @supabase/ssr)
        ├── Supabase Postgres (RLS, migrations versionadas)
        ├── Supabase Storage (currículos)
        └── APIs externas: Meta Graph API (webhook), Vercel Cron
```

- Middleware único (`src/lib/supabase/middleware.ts`) decide rota pública
  vs autenticada e redireciona `/login` ou `/admin/login`.
- `createAdminClient()` (service role) só é usado depois de confirmar
  papel admin via cliente RLS-respeitoso.

## Segurança e privacidade

- Headers de segurança globais (`next.config.ts`): `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- CSRF: token `httpOnly`/`sameSite=strict` gerado e validado com
  `crypto.timingSafeEqual` (`src/lib/security/csrf.ts`).
- Webhook Meta: validação HMAC SHA-256 do `X-Hub-Signature-256` com
  `timingSafeEqual`.
- Dados sensíveis: CPF/CNPJ, telefone, e-mail, currículo, respostas de
  candidatura. Tratados via LGPD (`consents`, `privacy_requests`,
  `audit_log`).
- Vercel BotID foi **removido** (commit `c35cc5f`) — suspeito de causar
  "This page couldn't load" em produção; sem substituto de bot-protection
  ativo hoje. [A PREENCHER: aceitar esse risco ou buscar alternativa?]

## Metas de desempenho e confiabilidade

[A PREENCHER — pergunta: existe meta formal de tempo de resposta,
disponibilidade (SLA) ou política de backup do banco além do backup padrão
do Supabase Free? Não está registrado em nenhum `.md`.]

## Ambientes e entrega

- Único ambiente de produção observado (`main` → deploy automático Vercel).
- [A PREENCHER: existe ambiente de staging/preview usado de fato, ou só os
  preview deployments automáticos de PR da Vercel?]
- Sem pipeline de CI com testes automatizados — `npm run lint` e
  `npm run build` são os únicos checks conhecidos, rodados manualmente.

## Decisões técnicas e trocas

| Escolha | Motivo | Alternativa descartada |
|---|---|---|
| Supabase em vez de backend customizado | Documento fonte deixava em aberto ("Supabase é opção, não decisão fechada") — decisão tomada na prática pelo código | API modular própria |
| Next.js Server Actions em vez de API REST separada | Menos peças móveis, integração nativa com o App Router | Backend Express/Nest separado |
| MCP nativo do Vercel para env vars **não funciona** (sem tool de leitura/escrita); Composio→Vercel dá `403 invalidToken` neste projeto | Limitação documentada e reconfirmada 2x | — |
| Vercel CLI com token pessoal descartável | Único caminho validado pra mexer em env vars sem o painel | Painel manual (funciona, mas sem automação) |

## Bug técnico corrigido nesta sessão (28/09/2026)

A migration `0018_auto_arquivamento_vagas.sql`, como estava escrita
originalmente, **não podia ser aplicada** — Postgres recusa usar um valor de
enum novo (`ALTER TYPE ... ADD VALUE`) na mesma transação em que ele foi
criado (erro `55P04`). Corrigido dividindo em duas migrations
(`auto_arquivamento_vagas_enum_e_coluna` + `auto_arquivamento_vagas_funcao`)
aplicadas em transações separadas. O arquivo original em
`supabase/migrations/0018_...sql` continua como estava — **considerar
atualizá-lo ou adicionar uma nota**, porque ele não reflete mais como o
schema foi de fato aplicado em produção.
