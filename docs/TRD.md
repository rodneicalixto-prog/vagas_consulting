# Documento de Requisitos Técnicos (TRD)

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** TRD v1.9 · **Data:** 26/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


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
| Vercel Cron | Três rotinas diárias: `archive-jobs` (02:00 UTC), `hunter-retencao` (03:00 UTC) e `validacao-prazo` (11:00 UTC) | Rotas no ar e fechadas (401 sem segredo). **Não executam enquanto `CRON_SECRET` não existir na Vercel** (verificado em 26/10/2026) |
| Meta Graph API (Lead Ads) | Webhook de leads via anúncios | Endpoint pronto, **inerte** até `META_LEADS_VERIFY_TOKEN`/`META_APP_SECRET`/`META_PAGE_ACCESS_TOKEN` serem configurados |
| Agente de IA para currículo | Extrai dados de PDF/imagem anexado | Ativo (`src/lib/ai/curriculo.ts`, via pacote `ai`) — modelo `anthropic/claude-sonnet-5` via `generateObject` do pacote `ai` (AI Gateway), confirmado em `src/lib/ai/curriculo.ts` em 14/10/2026 |
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
  ativo hoje. **Decisão (14/10/2026): risco aceito no início**; revisar quando houver abuso de cadastro.

## Autorização por carteira (v1.4, 14/10/2026)

- **Nova tabela** `company_assignments` (N:N empresa × usuário, com `ativo` e
  `acessa_confidenciais`) e **`jobs.confidencial`**. Migration `0023`,
  **aditiva**, com padrões seguros (nada confidencial, nada atribuído).
- **Um helper único** `escopoDoUsuario` devolve "sem filtro" (admin/superadmin)
  ou a lista de empresas ativas do operador. Toda leitura e toda ação do painel
  passa por ele; ações por `id` **verificam o pertencimento** (anti-IDOR).
- O painel usa a chave de serviço, então a RLS não protege essas leituras: o
  helper é a barreira, e há **teste por tela** com duas empresas.
- Visibilidade de candidato derivada de `applications`/`invites` das vagas da
  carteira; confidencial exige `acessa_confidenciais`.
- Anonimato ao candidato: o nome da empresa é omitido no servidor (não no
  cliente) enquanto a candidatura não chega à etapa de entrevista.
- **Riscos:** esquecer o helper em alguma tela; contagens agregadas que vazam
  dado de outra empresa. Mitigação: um único ponto de entrada e checklist de telas.

## Metas de desempenho e confiabilidade

**Requisitos definidos pelo Rodnei em 14/10/2026:**

- **Disponibilidade:** o app não pode ficar fora do ar.
- **Backup:** precisa existir uma **segunda cópia do banco**, além da cópia que o Supabase já faz.

**Lacuna entre requisito e realidade (a resolver):**

| Requisito | Situação hoje | O que falta |
|---|---|---|
| Nunca fora do ar | Supabase **Free** pausa o projeto por inatividade — aconteceu em 28/09 e 14/10/2026 | Plano Pro (não pausa) ou rotina que mantenha o projeto ativo; monitoramento externo de disponibilidade |
| Segunda cópia do banco | Só o backup padrão do próprio Supabase | Rotina própria (ex.: `pg_dump` agendado) gravando fora do Supabase, com teste de restauração |

Tempo máximo de carregamento: sem meta definida.

## Ambientes e entrega

- Único ambiente de produção observado (`main` → deploy automático Vercel).
- Hoje só os **preview deployments automáticos da Vercel**. O Rodnei indicou (14/10/2026) que é possível contratar um domínio próprio para staging; ainda não contratado.
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

## Atualização v1.5 (14/10/2026) — escopo e testes

- Barreira única do painel: `src/lib/auth/escopo.ts` (o painel usa a chave
  de serviço, então a RLS não protege). Toda página/ação nova do operador
  passa por ele; auditoria de 14/10 cobriu todas as telas de `admin/(app)`.
- Sigilo do candidato em `src/lib/sigilo.ts`; a tela de candidatura não pede
  mais o nome da empresa confidencial ao navegador.
- Testes unitários sem dependência nova: `npm test` (node:test, 18 casos em
  `src/lib/__tests__`). Fora de cobertura: funções que consultam o banco.
- Limitação conhecida: filtros por lista de UUIDs (`.in`) podem truncar com
  milhares de vagas visíveis (falha fechada, não vaza dado).

## Atualização v1.6 (15/10/2026)

| Tema | Decisão técnica |
|---|---|
| Papéis | `admin_empresa` = operador + atribuição `papel` (sem alterar enum); escopo por empresa em `escopo.ts` |
| Cofre | AES-256-GCM, chave-mestra `INTEGRATIONS_ENCRYPTION_KEY` (Vercel, Production); segredo nunca volta ao navegador |
| SSRF | URL da Evolution: https, sem IP privado/loopback/link-local |
| Vitrine | Leitura pública no servidor com colunas fixas; `x-pathname` no proxy libera o modo visitante |
| Destino pós-login | `next` e cookie `destino_pos_cadastro`, com `sanitizarDestino` (sem open redirect) |
| Webhook | `/api/webhooks/evolution`: apikey com `timingSafeEqual`, idempotente por `provedor_msg_id`, descadastro gravado primeiro |
| Testes | `npm test` (node:test): 53 casos de regras puras; sem testes de integração com banco |
| Limites | Filtros `.in()` com muitos ids podem truncar; sem tempo real (refresh a cada 15 s) |

## Atualização v1.7 (15/10/2026)

| Tema | Decisão técnica |
|---|---|
| Camadas | Regra no código (`src/lib/*.ts`, puras e testadas), IA só onde preciso redigir ou extrair. `server-only` nas que tocam banco ou provedor |
| IA | `gerarTextoIA` único (chave do cofre, teto mensal, registro em `ai_agent_runs`). Geração com `json: true` e leitura tolerante |
| Garantia no código, não no prompt | evidência literal conferida (triagem), temas proibidos (entrevista), gabarito fora da folha do candidato (testes), placeholders bloqueando envio (carta), uma devolutiva por índice único |
| Triagem às cegas | texto enviado ao modelo só com título, resumo e histórico; sem nome, contato, endereço, cidade nem motivo de saída |
| PDF | fallback só para cadastro vazio, via AI Gateway (fora do teto do agente), ilegível vira "não foi possível ler" |
| Áudio | Whisper (`whisper-1`) com a chave OpenAI do cofre, até 4 MB (limite da ação do servidor), arquivo não guardado, custo no teto do agente |
| Recuperação de notas | lexical (`recuperacao.ts`): título 3, corpo 1, até 8 notas; fallback para todas; `fonte` registra só as enviadas |
| Validade | consulta do contexto filtra `valida_ate`; nota vencida não entra |
| Word | `.docx` mínimo montado com `fflate` (`docx.ts`), sem dependência nova (evita o problema de lockfile Windows e Linux) |
| Origem | `?o=` validado contra a lista de canais, repassado vitrine, login e candidatura |
| Auditoria | `audit_log` em toda geração, aprovação, assinatura, envio e exportação, sem texto de mensagem nem segredo |
| Testes | `npm test`: 158 casos de regra pura; sem teste de integração com banco ou provedor |
| Lição | escapes de regex em script Python via shell viram caracteres de controle: escrever trechos por arquivo |

## Atualização v1.8 (15/10/2026) — linhas de WhatsApp

| Tema | Decisão técnica |
|---|---|
| Modelo | `whatsapp_lines` (instância única, operador opcional, agente, padrão, ativa); `conversations.line_id` |
| Unicidade | índice único `(company_id, canal, telefone, line_id)` com `NULLS NOT DISTINCT`; índice com expressão não serve de alvo de `upsert` (aprendido na 0044, corrigido na 0045) |
| Resolução da linha | webhook: instância para linha; envio: `linhaDaConversa`, com reserva para a linha padrão e depois o cadastro antigo |
| Conversa nova | em linha dedicada nasce atribuída ao operador dono |
| Agente | gating por linha (`desligado` não gera; `sugestao` nunca envia; dedicada nunca é retomada nem devolvida à fila) |
| Evolution | criar instância, webhook, QR, estado, logout e leitura do número pela API v2; QR validado como PNG base64; nada de QR ou token gravado |
| Permissões | superadmin e admin da empresa; limite por empresa em `companies.max_linhas_whatsapp` |
| Migração | cada instância cadastrada virou a linha padrão da empresa (sos_vagas, 4 conversas) |
| Risco aberto | criação de instância, QR e webhook ainda sem teste contra a Evolution real |

## Atualização v1.9 (26/10/2026) — revisão em paralelo e endurecimento

| Tema | Decisão técnica |
|---|---|
| Autorização | `layout.tsx` não é fronteira de segurança: toda `page.tsx` de `/admin/vagas/[id]` chama `exigirVaga(await obterEscopo(...), id)`. Teste-guarda `guardas.test.mjs` falha se uma página nova esquecer |
| Cron | `lib/cron-auth.ts` (`cronAutorizado`): `Authorization: Bearer <CRON_SECRET>`, comparação em tempo constante, fecha sem segredo. Respostas sem detalhe de erro. O teste-guarda exige o uso em toda rota `/api/cron` e confere o `vercel.json` |
| `validacao-prazo` | Marca `alertada_em` uma única vez nos casos ativos vencidos (72 h) e audita `validacao_prazo_vencido` por vaga. Não decide e não fala com o candidato. Ainda sem e-mail ou Telegram |
| Fila de validação | Updates condicionais por status (retirada, atualização e decisão). Confirmar só encerra candidatura em andamento (`recebida`, `triagem`, `entrevista`, `teste`); se um passo falha, o caso volta ao status anterior. Reverter prevalece sobre uma triagem posterior com os mesmos critérios (`ignorada_revertida` devolve `eliminado=false`) |
| Hunter | Sem dado = `pontuacao null`. Teto diário reconferido depois de gravar a aprovação (devolve o excesso). Envio só audita se a linha foi gravada. Clique condicionado ao estado lido. SAIR e bloqueio comparam as duas formas do celular (`variantesTelefoneBR`). `expirado` e `nao_contactar` bloqueiam reimportação |
| Retenção | Uma escrita por grupo (sem estado intermediário). Prazo de 30 dias vale também para quem só clicou; quem se candidatou ou respondeu expira em 180 dias sem movimento. Ficam só os hashes |
| SSRF da Evolution | `ipv4Interno`/`ipInterno` (privado, CGNAT, link-local, teste, multicast, IPv6 local), bloqueio de DNS curinga (nip.io, sslip.io e similares) e `hostResolveParaPublico` (resolve o DNS ao salvar e ao testar; falha de DNS não passa). Risco residual: DNS rebinding entre a checagem e o uso, mitigado por só o superadmin configurar a URL |
| Abordagem | E-mail e InMail exigem "responda SAIR" (bloqueio) e a origem do contato no prompt |
| Testes | 261 (`npm test`), incluindo guardas de código-fonte |

**Risco aberto (registrado, não corrigido):** hash de contato sem sal (SHA-256 de telefone é reversível por força bruta; usar HMAC com segredo de servidor); cofre sem AAD e sem identificador de chave (exige recifrar os segredos existentes); teto diário sem trava transacional (RPC com `advisory lock` exigiria migration).

## Atualização v1.10 (27/10/2026) — endereço completo do candidato

Decisão de produto registrada no PRD v1.10: endereço completo obrigatório. Nenhuma mudança de código.

| Ponto | Regra técnica |
|---|---|
| Onde fica | `profiles.endereco` (texto livre, nulo em contas antigas ou criadas por convite) |
| Onde é exigido | Em ações de servidor: `onboarding/actions.ts`, `perfil/dados-pessoais/actions.ts` e `vagas/[id]/candidatura/actions.ts`. **Não há restrição `NOT NULL` no banco** |
| O que não o recebe | Triagem às cegas (já exclui endereço, §Triagem). Outros usos de IA com dado do candidato não foram revistos nesta atualização |
| Hunter | Endereço do perfil colado é descartado na importação |
| Acesso do painel | Em `/admin/candidatos/[id]` o endereço é zerado junto com telefone e currículo quando o contato é restrito (`contatoRestrito`) |
| Candidatura | `candidatura/actions.ts` só exige telefone e endereço quando **não há currículo anexado**; com currículo, passa sem endereço |
| Registro | O valor do endereço não deve entrar em log nem em trilha de auditoria |

**Risco registrado:** a obrigatoriedade só existe na aplicação; um cliente que escreva direto no banco pode gravar nulo. Aceito, pois a escrita passa por ações de servidor.

## Atualização v1.11 (27/10/2026) — página pública de vagas (proposta)

Spec: `docs/specs/PAGINA_PUBLICA_VAGAS.md`. Nenhum código nem migration nesta atualização.

| Ponto | Proposta técnica |
|---|---|
| Rotas | Mesmos endereços (`/vagas`, `/vagas/[id]`), movidas para um grupo de rotas público fora de `(app)`. O regex `VAGA_PUBLICA` do `middleware.ts` e o modo visitante de `(app)/layout.tsx` passam a ser desnecessários para essas rotas, mas ficam até a troca ser testada |
| Metadados | `generateMetadata` por vaga: título, descrição, canonical sem `?o=`, Open Graph |
| Mapa do site | `src/app/sitemap.ts` com as vagas publicadas e no prazo; `src/app/robots.ts` bloqueando `/admin`, `/api`, `/h/` e `/vagas/*/candidatura` |
| Dados estruturados | JSON-LD `JobPosting` montado no servidor; `efetiva`→`FULL_TIME`, `pj`→`CONTRACTOR`, `temporaria`→`TEMPORARY`; `baseSalary` só com faixa numérica |
| Sigilo | A mesma função `nomeEmpresa` de `src/lib/sigilo.ts`, aplicada ao HTML e ao JSON-LD; vaga confidencial usa "Vagas Consulting" como organização (**decidido em 27/10/2026**) e continua indexável |
| Leitura | `createAdminClient` no servidor com colunas fixas, status `publicada` e `expira_em` (como hoje); id fora do UUID dá 404 |
| Busca (P2) | Parâmetros `q`, `modalidade`, `cidade`, `pagina`; limite de 20 por página; sem migration |
| URL absoluta | `NEXT_PUBLIC_SITE_URL` com padrão `https://sosvagas.sosmkt.com.br` (igual a `hunter-servidor.ts`) |
| Cache | Página pública pode usar revalidação curta (ex.: 60 s) para aguentar tráfego de divulgação; vaga pausada precisa sair rápido, então não usar cache longo |

**Risco:** descrição em texto livre pode citar a empresa de vaga confidencial. A verificação de `regras-vaga.ts` avisa antes de publicar; a página não reescreve o texto.
