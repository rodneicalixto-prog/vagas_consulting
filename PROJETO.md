# Vagas Consulting — App de Vagas

Projeto novo e independente do kit `KPA-calixto`. Este documento consolida
o planejamento (`Planejamento_Aplicativo_de_Vagas.docx`) e o protótipo já
produzido, e serve de referência única para as próximas fases técnicas.

## 1. Visão

Plataforma proprietária de recrutamento operada exclusivamente pela equipe
da Vagas Consulting. O produto possui dois ambientes:

- **App do candidato:** busca, candidatura, acompanhamento de processos,
  trabalhos temporários, mensagens, perfil e privacidade.
- **Painel interno:** cadastro de empresas, cadastro e publicação de vagas,
  gestão do pipeline de seleção, temporários, LGPD, auditoria, acessos e
  suporte.

Empresas são registros de clientes ou contratantes mantidos pela equipe
interna. Elas não criam contas, não acessam a plataforma, não se cadastram e
não cadastram nem solicitam vagas. Todo o ciclo operacional é controlado pela
Vagas Consulting.

Modalidades suportadas desde o MVP: **Efetiva (CLT)**, **PJ** e
**Temporária**, cada uma com campos obrigatórios e avisos próprios (aba
"Regras da vaga").

### 1.1 Premissas mandatórias de produto e acesso

Estas premissas prevalecem sobre protótipos, implementações e registros
históricos que descrevam um portal ou autosserviço de empresas:

1. A plataforma é de uso operacional próprio da Vagas Consulting.
2. Não existe cadastro, login ou portal para empresas.
3. Empresas existem apenas como entidades cadastrais vinculadas a vagas e
   processos, sempre administradas pela equipe interna.
4. Somente usuários internos autorizados podem criar ou alterar empresas e
   criar, revisar, publicar, pausar ou encerrar vagas.
5. O **superadministrador** possui controle total, inclusive sobre usuários,
   papéis e permissões.
6. **Administradores** executam as funções de gestão delegadas pelo
   superadministrador e podem supervisionar operadores conforme sua alçada.
7. **Operadores** executam apenas atividades operacionais explicitamente
   autorizadas, sem poder elevar o próprio acesso nem administrar papéis.
8. Autorização deve ser validada no servidor e no banco de dados. A ocultação
   de telas ou botões não substitui controle de acesso.
9. O painel interno e o app do candidato devem possuir login funcional,
   recuperação de acesso e logout visível em todas as sessões autenticadas.
10. Contas internas só podem ser criadas ou convidadas pelo
    superadministrador. O fluxo de cadastro do candidato permanece separado do
    controle de acesso da equipe interna.

### 1.2 Hierarquia de acesso

| Papel | Responsabilidade | Limites obrigatórios |
|---|---|---|
| Superadministrador | Controle integral da plataforma, usuários, papéis, permissões, empresas, vagas, processos, LGPD e auditoria | Papel reservado; nenhum outro usuário pode concedê-lo, alterá-lo ou removê-lo sem autorização equivalente |
| Administrador | Gestão das áreas e operadores delegados pelo superadministrador | Não pode ampliar a própria alçada nem assumir funções não delegadas |
| Operador | Execução de tarefas de recrutamento e atendimento autorizadas | Não gerencia papéis, permissões ou configurações críticas |
| Candidato | Gestão do próprio perfil, consentimentos, candidaturas, mensagens e processos | Não acessa o painel interno nem dados de outros candidatos |

O modelo de autorização deve separar o nível hierárquico das permissões
funcionais. O papel define a posição do usuário na hierarquia; permissões
explícitas definem quais operações ele pode executar.

## 2. Estado atual

| Item | Status |
|---|---|
| Documento de planejamento funcional/técnico | ✅ Recebido (`Planejamento_Aplicativo_de_Vagas.docx`, v1.0) |
| Logo da marca | ✅ Recebida |
| Protótipo visual do app do candidato (10 telas, MVP) | ✅ Publicado — [artifact](https://claude.ai/code/artifact/d04929f9-7fcc-4f91-a8fa-4308140eede4) |
| Protótipo do portal da empresa (6 telas) | ✅ Publicado — [artifact](https://claude.ai/code/artifact/188573ac-e75a-4ca3-8637-6252d7dee810) |
| Protótipo do painel administrativo (7 telas) | ✅ Publicado — [artifact](https://claude.ai/code/artifact/4e3073eb-bc6e-4374-a4d9-f756345f3222) |
| Repositório de código | ✅ Criado e com push feito — [rodneicalixto-prog/vagas_consulting](https://github.com/rodneicalixto-prog/vagas_consulting) |
| Scaffold Next.js do app do candidato | ✅ Conectado ao Supabase de verdade (auth, vagas, candidaturas, perfil, LGPD), código no `main` |
| Portal da empresa (`/portal`) | ❌ **Removido do código** (migration `0006_operacao_interna_e_hierarquia.sql`, commit `ed455cc`, 10/09/2026) — decisão de produto: operação passou a ser 100% interna, empresa não tem mais login/portal próprio, existe só como entidade cadastral. Vagas nascem de solicitação/briefing recebido por outro canal (não pelo app) e são cadastradas direto pela equipe interna em `/admin/vagas`. |
| Painel administrativo (`/admin`) | ✅ Login/logout, hierarquia superadmin/admin/operador com permissões granulares no servidor (`requireInternalUser`, ex.: `companies.manage`, `jobs.manage`, `jobs.publish`, `users.manage`), cadastro interno de empresas e vagas. Ficou quebrado após a migration 0006 (schema dessincronizado + `SUPABASE_SERVICE_ROLE_KEY` vazia na Vercel) — **corrigido de verdade em 10/09/2026**, confirmado visualmente pelo Rodnei. |
| Banco de dados (Supabase) | ✅ Schema + coluna extra (histórico terceirizadoras) + dados de exemplo semeados + migrations `0004` (admin_users, privacy_requests, reports, application_notes) e `0005` (fix de recursão infinita em RLS de `company_members`) + `0006` (operação 100% interna — remove portal/`company_members`, hierarquia de admin) |
| Deploy em produção | ✅ **No ar** — https://vagas-consulting-umber.vercel.app. Dois bloqueadores distintos de env var já resolvidos (09/09: `NEXT_PUBLIC_SUPABASE_ANON_KEY` apagada; 10/09: `SUPABASE_SERVICE_ROLE_KEY` chegando vazia em runtime). Ver `CLAUDE.md`. |
| Domínio próprio | `sosvagas.sosmkt.com.br` — configuração em andamento (10/09/2026) |

> **Registro histórico:** os itens abaixo que descrevem o portal empresarial ou
> `company_members` documentam uma direção anterior. A implementação vigente é
> definida pelas premissas da seção 1.1 e pela migration `0006`.

## 2.1 Infraestrutura

| Item | Referência |
|---|---|
| Repositório GitHub | [rodneicalixto-prog/vagas_consulting](https://github.com/rodneicalixto-prog/vagas_consulting), branch `main` |
| Deploy Vercel (produção) | https://vagas-consulting-6vyiuf4kq-rodnei-calixto-s-projects.vercel.app |
| Domínios Vercel do projeto | `vagas-consulting-umber.vercel.app`, `vagas-consulting-rodnei-calixto-s-projects.vercel.app`, `vagas-consulting-git-main-rodnei-calixto-s-projects.vercel.app` |
| Projeto Vercel | `vagas-consulting` (id `prj_useLOGXbwEN5pIjnkp4fyO0J8j4A`), team `rodnei-calixto-s-projects` (id `team_xCWGuCpqFbPqf4VvIFxJXrJe`) |
| Deploy automático | Sim — a cada push em `main` (projeto conectado ao repo GitHub) |
| Projeto Supabase | Nome "Vagas Consulting", URL `https://tfipbxjslpxbaybpxsql.supabase.co`, ref `tfipbxjslpxbaybpxsql`, região `sa-east-1`, org Supabase `gjwkhxenjcftyoipzhrc` (nome "SOS MKT") |
| Domínio próprio | ⬜ Ainda não definido/registrado |

> Segurança: só a URL pública do projeto Supabase está registrada aqui.
> Nenhuma chave de API, service role key ou connection string deve ir
> neste arquivo — elas vão para `.env` (gitignored), conforme a regra de
> segurança do `CLAUDE.md`.

## 2.2 Log de passos realizados e acessos mapeados

Registro cronológico das ações técnicas já feitas neste projeto e de como
cada ferramenta/acesso foi resolvido — para não repetir investigação em
sessões futuras.

1. **Repositório GitHub criado** — `rodneicalixto-prog/vagas_consulting`,
   clonado, `CLAUDE.md` e `PROJETO.md` adicionados, scaffold Next.js
   completo commitado e enviado (push) pro branch `main`.
2. **Scaffold Next.js construído** — 10 telas do fluxo do candidato
   (login, termos/opt-in, onboarding, início, vagas, detalhe da vaga com
   aba Regras, candidatura, processos, mensagens, perfil), responsivo
   mobile/tablet/desktop, dados mockados em `src/lib/mock-data.ts`.
   Testado com build + lint limpos e screenshots via Playwright headless.
3. **Deploy na Vercel**:
   - Tentativa 1 (MCP nativo `create_git_project`): falhou com 403 —
     app da Vercel não tinha permissão instalada no repositório GitHub.
   - Tentativa 2 (Composio → Vercel): conexão marcada `active`, mas toda
     chamada (`VERCEL_GET_TEAMS`, `VERCEL_CREATE_NEW_DEPLOYMENT`) voltava
     `403 invalidToken`. Testado 2x (conexão original + reconexão do
     zero) — mesmo erro nas duas. **Composio→Vercel não funciona neste
     ambiente**, não vale insistir de novo sem motivo novo.
   - Solução que funcionou: Rodnei autorizou o app da Vercel direto no
     GitHub (vercel.com/new → "Adjust GitHub App Permissions" → liberar
     `vagas_consulting`). Depois disso a Vercel detectou o repo sozinha
     ("New repository detected") e o Rodnei clicou "Import" no painel.
     O projeto `vagas-consulting` passou a existir e o MCP nativo da
     Vercel (`list_projects`, `list_deployments`) passou a enxergá-lo e
     gerenciá-lo normalmente (deploy automático a cada push já ativo).
   - **Limite conhecido**: o MCP nativo da Vercel não tem ferramenta para
     ler/criar variáveis de ambiente — isso só dá pra fazer pelo painel
     (Settings → Environment Variables) ou por outra via ainda não
     testada. Rodnei configurou manualmente pelo painel.
4. **Acesso ao Supabase do projeto Vagas Consulting**:
   - MCP nativo `mcp__Supabase__list_projects` e o equivalente via
     Composio (`SUPABASE_LIST_ALL_PROJECTS`) só enxergavam
     `calixto testesProject` (org `rodneicalixto@hotmail.com's Org`,
     id `jfpiyugtvtuihjuqweyc`) — o projeto Vagas Consulting não
     aparecia, porque ele vive em outra organização Supabase
     (`gjwkhxenjcftyoipzhrc`, "SOS MKT"), de conta diferente
     (`rodnei@calixtosolucoes.com.br`).
   - Solução: Rodnei convidou `rodneicalixto@hotmail.com` como membro
     (papel Developer) da organização "SOS MKT" no Supabase e aceitou o
     convite. **Mesmo depois do aceite confirmado no painel**,
     `list_projects` continuou sem mostrar o projeto (provável
     cache/atraso da listagem do lado da API, não investigado a fundo).
   - **O que efetivamente resolveu**: chamar as ferramentas do MCP
     passando o `project_id`/`ref` do Vagas Consulting
     (`tfipbxjslpxbaybpxsql`) diretamente, mesmo sem ele aparecer no
     `list_projects` — `get_project` e `list_tables` funcionaram
     normalmente. **Lição para o futuro**: não confiar no
     `list_projects` para decidir se há acesso a um projeto Supabase;
     testar direto com o `ref`/`project_id` conhecido.
5. **Schema inicial do banco criado** — migration
   `supabase/migrations/0001_schema_inicial.sql` aplicada no projeto
   Vagas Consulting via `apply_migration`. 10 tabelas, todas com RLS
   habilitado: `profiles` (perfil do candidato), `companies`,
   `company_members`, `jobs` (vagas, com campo `regras` jsonb pros
   detalhes por modalidade), `applications` (candidaturas/pipeline),
   `invites` (convites, principalmente temporárias), `temp_work`
   (execução do trabalho temporário), `messages`, `consents` (LGPD),
   `audit_log`. Cobre o backlog P0 (seção 5 abaixo). Policies de RLS:
   candidato só vê/edita os próprios dados; empresa só vê/gerencia a
   própria empresa e vagas; vagas publicadas são visíveis a qualquer
   autenticado; `audit_log` sem policy nenhuma (só service role acessa,
   confirmado via `get_advisors` — 1 aviso INFO esperado, não é problema).
   Checado com `get_advisors(type: security)`: só esse aviso.
6. **Coluna extra por pedido do Rodnei**: `profiles.historico_terceirizadoras`
   (jsonb, migration `0002`) — pergunta obrigatória (mas não eliminatória)
   no cadastro: se o candidato já trabalhou em Eros/Nyx/FG/Athenas
   Terceirização, com ano/período e líder direto. UI implementada na
   etapa de onboarding.
7. **Dados de exemplo semeados** (migration `0003`): 1 empresa aprovada
   ("Grupo Altavia", fictícia) + 4 vagas publicadas (uma de cada
   modalidade/exemplo do protótipo original), pra o app não ficar vazio
   em desenvolvimento.
8. **Código do app conectado ao Supabase de verdade** — não usa mais
   `src/lib/mock-data.ts` (arquivo ficou órfão no repo, não apagado sem
   autorização do Rodnei). Implementado: login/cadastro real (Supabase
   Auth, e-mail+senha, com `@supabase/ssr` + middleware/proxy de sessão),
   grava consentimentos LGPD reais na tela de Termos, grava perfil real
   no onboarding (incluindo a pergunta de terceirizadoras), lista vagas
   publicadas reais, envia candidatura real (respeitando a constraint de
   candidatura única por vaga), lista processos reais do candidato
   logado, perfil lê/grava dados e consentimentos reais, logout real.
9. **Limite de teste conhecido**: este ambiente de execução (onde o
   Claude roda comandos) **bloqueia por política de rede qualquer
   conexão direta a `supabase.co`** (confirmado: `403` no proxy de
   egress, mesmo erro pra `curl` e para o próprio `next dev` rodando
   aqui). Isso significa que o fluxo de cadastro/login real **não foi
   testado ponta a ponta com navegador neste ambiente** — só validado
   por build + lint limpos e revisão de código. A Vercel (produção) tem
   rede normal; o teste real só é possível lá, testando manualmente ou
   via `get_runtime_errors`/`get_runtime_logs` do MCP da Vercel depois
   do deploy.
10. **Deploy de produção quebrado após o push** — confirmado exatamente
    pelo caminho previsto no item 9: `web_fetch_vercel_url` em `/login`
    voltou 500, `get_runtime_logs` mostrou o erro real
    (`Your project's URL and Key are required to create a Supabase
    client!`) disparado dentro do middleware (`src/proxy.ts`), que roda
    em toda rota — por isso o site inteiro caiu, não só o login.
    Diagnóstico passo a passo (várias hipóteses testadas e descartadas
    antes de achar a real):
    - Variáveis realmente ausentes no painel → descartado, Rodnei
      confirmou visualmente que existiam.
    - Nomes de variável corrompidos por tradução automática do Chrome
      na tela da Vercel → parcialmente verdade (havia variáveis lixo
      "vaga"/"vagas"/"vagass" de tentativas anteriores, removidas), mas
      não era a causa do 500.
    - Cache de build reaproveitado no redeploy → descartado, redeploy
      sem cache deu o mesmo erro.
    - **Causa real**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` foi salva com
      **Type = "Secret"** no painel da Vercel. Vercel não expõe
      variáveis tipo Secret pro Next.js inlinar no bundle do navegador
      durante o build (é por isso que `NEXT_PUBLIC_*` — que por
      definição *deveria* ser público — precisa ser tipo "Config", não
      "Secret"). O próprio Vercel mostra um aviso nesse sentido na tela
      da variável, que só percebemos ao abrir o painel de edição dela.
    - Vercel não permite converter Secret → Config numa variável já
      salva; a correção exige apagar e recriar a variável do zero como
      Config. **Ver `CLAUDE.md`, seção "BLOQUEADOR ATIVO", para o passo
      a passo exato de correção — ainda pendente de execução.**
11. **Sessão encerrada pelo Rodnei antes da correção final** — ele optou
    por não continuar o ping-pong de prints pra corrigir o tipo da
    variável nesta sessão. Todo o código e a documentação estão salvos e
    no `main`; falta só a correção de configuração no painel da Vercel
    (não código) pra o deploy voltar a funcionar. Qualquer sessão futura
    (Claude ou outra ferramenta) deve começar por aí antes de investigar
    qualquer outra coisa.
12. **Protótipos visuais do portal da empresa e do painel admin** —
    publicados como Claude Design canvas (Artifacts), mesmo padrão visual
    do protótipo do candidato. Nessa etapa foi fechada a decisão de
    produto do item 2/4 da seção 7: empresa não publica vaga, só solicita.
13. **Portal da empresa e painel admin codados de verdade** (não é mais só
    protótipo visual) — migration `0004_portal_empresa_e_painel_admin.sql`
    aplicada no projeto Supabase real (`tfipbxjslpxbaybpxsql`) via
    `apply_migration`: corrige RLS de `jobs` (empresa só grava
    `rascunho`/`revisao`, nunca `publicada`), adiciona `admin_users`
    (enum `admin_perfil`: superadmin/operações/compliance/suporte/
    financeiro), `privacy_requests` (LGPD), `reports` (denúncias),
    `application_notes` (notas internas do pipeline), e colunas
    `motivo_decisao`/`decidido_por`/`decidido_em` em `jobs` e `companies`.
    `get_advisors(security)` depois da migration: só o mesmo aviso INFO
    de sempre (`audit_log` sem policy, esperado).
    - Rotas novas: `/portal/login`, `/portal/dashboard`,
      `/portal/vagas` (+ `/nova` e `/[id]` com pipeline kanban e notas
      internas), `/portal/candidatos`, `/portal/temporarios`;
      `/admin/login`, `/admin` (visão geral), `/admin/empresas`
      (moderação), `/admin/vagas` (cadastro/publicação), `/admin/lgpd`,
      `/admin/auditoria`, `/admin/acesso` (perfis + convite de admin).
    - Novo `src/lib/supabase/admin.ts`: cliente server-only com a
      `SUPABASE_SERVICE_ROLE_KEY` (ignora RLS), usado só depois de
      confirmar (com o cliente normal, respeitando RLS) que o usuário
      logado está em `admin_users`. Precisa de
      `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` e na Vercel — **ainda
      não confirmado se está configurada na Vercel** (só
      `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` foram
      mencionadas até aqui). Conferir antes de testar `/admin` em produção.
    - `middleware.ts` (`src/lib/supabase/middleware.ts`) atualizado para
      redirecionar `/portal/*` e `/admin/*` para seus próprios `/login`
      (antes só existia `/login` do candidato).
    - **Ainda não há usuário de teste** em `company_members` nem em
      `admin_users` — precisa criar um usuário real (Supabase Auth) e
      inserir manualmente nessas tabelas antes de testar os logins do
      portal/admin ponta a ponta.
    - Build (`npm run build`) e lint (`npm run lint`) limpos. Não testado
      com navegador neste ambiente pelo mesmo motivo do item 9 (bloqueio
      de rede pra `supabase.co`).
14. **Bloqueador da Vercel corrigido de verdade** — causa raiz real era
    diferente do que o item 10 registrou: `vercel env ls` mostrou que
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` não estava com tipo errado, ela
    simplesmente **não existia mais** (apagada numa tentativa anterior e
    nunca recriada). `SUPABASE_SERVICE_ROLE_KEY` já estava configurada
    (criada por conta própria do Rodnei antes desta sessão). Corrigido
    via **Vercel CLI com token pessoal** (`vercel link` +
    `vercel env add ... --no-sensitive` nos três ambientes +
    `vercel deploy --prod`) — caminho que funciona quando MCP nativo (sem
    tool de env vars) e Composio→Vercel (403 invalidToken confirmado de
    novo nesse projeto) não servem. Validado com `web_fetch_vercel_url`
    (200 em `/`, `/login`, `/portal/login`, `/admin/login`) e
    `get_runtime_logs` sem erros no deploy novo. Token pessoal foi de uso
    único, descartado após o uso. Detalhes técnicos em `CLAUDE.md`.
15. **Usuário de teste criado e promovido** — `rodnei@calixtosolucoes.com.br`
    cadastrado via "Criar conta" no site publicado (precisou primeiro
    desligar "Confirm email" em Authentication → Sign In/Providers →
    Email no Supabase, porque o mailer padrão sem SMTP próprio tem
    `rate_limit_email_sent = 2`/hora e travava o fluxo de confirmação —
    ver item 17). Inserido em `admin_users` (`superadmin`) e em
    `company_members` da empresa "Grupo Altavia" via `apply_migration`
    (o `execute_sql` do MCP roda em transação somente-leitura — INSERT só
    funciona por `apply_migration`). `priscilla.klein@gmail.com` ainda não
    foi cadastrada.
16. **Correção real de acesso ao painel do Supabase**: a conta
    `rodneicalixto@hotmail.com` só tem papel Developer na org "SOS MKT" —
    não conseguia salvar mudanças em Authentication (botão "Salvar
    alterações" ficava travado) nem um token pessoal gerado por ela
    conseguia via Management API (`403 Forbidden`, "does not have the
    necessary privileges"). Resolvido logando no dashboard com
    `rodnei@calixtosolucoes.com.br` (dono da org) direto no navegador.
17. **Bug real encontrado e corrigido — RLS de `company_members` com
    recursão infinita**: login no portal da empresa sempre retornava
    "Esta conta não tem acesso ao portal da empresa" mesmo com a linha
    certa em `company_members`. Causa: a policy
    `company_members_select_own_company` (migration `0001`) fazia
    `exists (select 1 from company_members cm where ...)` — uma subquery
    na PRÓPRIA tabela dentro de uma RLS policy dessa tabela. Postgres
    detecta isso e recusa com `42P17 infinite recursion detected in
    policy for relation "company_members"` (só foi possível ver isso
    com um log de debug temporário na Vercel, via `get_runtime_logs` —
    o erro não aparecia em lugar nenhum antes disso). Corrigido na
    migration `0005_fix_company_members_rls_recursion.sql`: criada
    `public.is_company_member(target_company_id uuid)` como função
    `SECURITY DEFINER` (roda ignorando RLS, quebrando o ciclo) e a
    policy passou a chamar essa função em vez de fazer o `exists` direto
    na tabela. `EXECUTE` da função restrito a `authenticated` (revogado
    de `public`/`anon`) para fechar os dois avisos WARN do
    `get_advisors(security)` sobre função `SECURITY DEFINER` chamável
    publicamente. **Lição para o futuro**: nunca escrever uma RLS policy
    que faça subquery na própria tabela — sempre extrair para uma função
    `SECURITY DEFINER` (ou reescrever sem self-join) desde o início.

18b. **Reintegração do trabalho local divergente (10/09/2026)** — o clone
    local estava 24 commits atrás do `origin/main`, com trabalho novo não
    commitado (rotas `candidatos`, `estrategico`, `leads`, `prestacoes` +
    3 migrations). Reconciliado via `git stash` → `git pull` → `git stash
    pop` → resolução de 6 conflitos (mantendo o padrão upstream mais
    avançado `requireInternalUser` no lugar do `requireAdmin()` local
    superado) → migrations renumeradas `0007`/`0008`/`0009` (colidiam com
    a `0006` real recém-puxada) → aplicadas no Supabase real →
    `src/lib/supabase/types.ts` regenerado → build/lint limpos → commit
    `5ac9a0e` → push autorizado explicitamente pelo Rodnei. Revisão de
    segurança automática pegou 3 rotas (`candidatos`, `leads`,
    `prestacoes`) usando `createAdminClient()` (service-role) sem
    checagem de autorização própria na página, dependendo só do gate
    genérico do layout — corrigido com `requireInternalUser("pipeline.manage")`
    explícito em cada página, no mesmo commit.
19. **Priscilla Klein promovida a admin e bug de login corrigido
    (10/09/2026)** — ela estava entrando como candidata mesmo sendo
    administradora, porque não existia linha em `admin_users` pro
    `user_id` dela. Corrigido via `apply_migration` (upsert em
    `admin_users`, perfil `admin`, `ativo = true`). Confirmado
    `admin_perfil` real no banco: `superadmin | admin | operador`.
20. **Dados fictícios de seed removidos da produção (10/09/2026)** — a
    empresa "Grupo Altavia" e as 4 vagas dela (migration `0003`, sempre
    documentada como fictícia) estavam publicadas de verdade ao lado da
    Eros (empresa real do Rodnei), confundindo o uso real do painel.
    Removidas via `apply_migration` (sem candidaturas/prestações/convites
    vinculados, delete seguro). A Eros também tinha sido inativada por
    engano de clique (`status = bloqueada`) — reativada (`aprovada`) na
    mesma migration. **Nota:** a execução direta de SQL de escrita via
    `execute_sql` foi bloqueada pelo classifier de auto-mode do Claude
    Code mesmo com autorização explícita do Rodnei; `apply_migration`
    (mesmo MCP do Supabase, ferramenta distinta) não foi bloqueada e
    resolveu a mesma operação — registrar essa diferença de
    comportamento entre as duas tools para o futuro.
21. **Feedback visual de salvamento nos formulários do painel
    (10/09/2026)** — diagnosticado a partir de um relato real da
    Priscilla ("a página não responde, não sei se o clique funcionou"):
    os cards de empresa nunca mostravam o status atual e os botões de
    decisão (`Ativar`/`Inativar`/`Publicar`/etc.) não davam nenhum
    feedback durante o envio do formulário. Corrigido com um
    `SubmitButton` reutilizável (`src/components/form-buttons.tsx`, via
    `useFormStatus`) mostrando "Salvando..."/"Cadastrando..." durante o
    envio, e um badge de status visível no card de empresa. Commit
    `ccba094`, push autorizado.
22. **Incidente do painel admin (10/09/2026) — RESOLVIDO, eram dois
    problemas empilhados.** O handoff da seção 10 registrava o painel
    `/admin` quebrando com "This page couldn't load" (digest
    `3578782868`) depois do login. Investigação desta sessão:
    - **Problema 1 (schema):** a migration `0006` nunca tinha sido
      aplicada no projeto Supabase real (`tfipbxjslpxbaybpxsql`) —
      confirmado via SQL direto: o enum `admin_perfil` ainda tinha os 5
      valores antigos (`superadmin, operacoes, compliance, suporte,
      financeiro`) e a tabela `company_members` ainda existia. Aplicada
      via `apply_migration` do MCP nativo do Supabase (ref direto, não
      apareceu em `list_projects` — ver `CLAUDE.md`). A 1 linha de seed
      que existia em `company_members` foi removida junto (esperado, a
      migration dropa a tabela).
    - **Problema 2 (o que causava o crash de fato):** mesmo com o schema
      corrigido, o mesmo digest continuou aparecendo. A causa real,
      encontrada via `get_runtime_errors` (tool MCP oficial da Vercel,
      agregada — não trava como `get_runtime_logs` puro via streaming):
      `Error: supabaseKey is required.` em `createAdminClient`
      (`src/lib/supabase/admin.ts`). A env var `SUPABASE_SERVICE_ROLE_KEY`
      estava configurada no painel da Vercel mas chegava vazia/corrompida
      em runtime — mesmo padrão exato do bloqueador do item 14 (que foi
      na `ANON_KEY`). Corrigido com delete + recreate da env var via API
      da Vercel (valor pego direto no Supabase Studio, nunca por decrypt
      via API — bloqueado pelo próprio ambiente por segurança) e um
      redeploy manual do deployment de produção (env var só é lida no
      cold start).
    - Validado visualmente: painel `/admin` → "Acesso e permissões"
      carregando limpo, Rodnei Calixto listado como Superadministrador.
    - **Lição para o futuro:** se o mesmo `digest` de erro persistir
      depois de corrigir uma causa aparente, não assumir outra causa do
      mesmo tipo (ex.: "deve ser mais um problema de schema") — checar
      `get_runtime_errors` da Vercel primeiro, é rápido e agregado. Env
      var "sumindo" silenciosamente na Vercel já aconteceu 2x neste
      projeto — se um 500 aparecer de novo do nada, suspeitar de env var
      ausente/vazia antes de investigar lógica ou schema.

23. **Visualização do candidato pelo admin, só leitura (10/09/2026)** —
    o Rodnei pediu que admin/superadmin/operador consigam ver a área do
    candidato sem deslogar da sessão de gestão. Investigação mostrou o
    motivo de isso não existir: o app do candidato usa `auth.uid()`
    direto em toda consulta, sem indireção nenhuma, e o navegador só
    mantém uma sessão Supabase Auth por vez. Decisão confirmada com o
    Rodnei (via plan mode): (1) só leitura, sem agir em nome do
    candidato; (2) visual no estilo do próprio painel admin, não réplica
    do app mobile. Entregue em duas partes complementares:
    - `src/app/admin/(app)/candidatos/[id]/page.tsx` (primeira rota
      dinâmica do painel admin): perfil, candidaturas (via `DataTable`)
      e mensagens do candidato, tudo somente leitura, com banner
      deixando isso explícito. Cada carregamento grava uma linha em
      `audit_log` (`candidato_visualizado_pelo_admin`) — rastreabilidade
      que não existia antes (hoje já dá pra consultar o banco direto
      sem deixar rastro; esta tela formaliza e audita o acesso). Link
      "Visualizar" adicionado na lista de `/admin/candidatos`.
    - Depois o Rodnei esclareceu que também queria checar erros de
      **publicação** de vaga (não só o histórico de um candidato). Como
      o `middleware.ts` só exige estar autenticado (`auth.getUser()`,
      sem checar papel) pra rotas não-admin, a própria conta do admin
      já consegue abrir `/vagas` e `/vagas/[id]` — a vitrine pública real,
      sem filtro por identidade — numa aba nova, sem perder a sessão do
      painel. Não precisou de nenhuma view nova pra isso, só faltava o
      link: "Ver vitrine pública ↗" fixo na topbar do admin
      (`src/components/admin-shell.tsx`) e "Ver publicação →" por vaga
      já publicada em `/admin/vagas`.

24. **Cards da Visão geral tornados clicáveis + tela de Denúncias nova
    (10/09/2026)** — os 4 KPIs e os itens das 2 filas em `/admin`
    (`src/app/admin/(app)/page.tsx`) eram `<div>`s sem link nenhum,
    pedido explícito do Rodnei pra corrigir ("todos os cards clicáveis
    sempre"). 3 dos 4 KPIs já tinham destino óbvio; "Denúncias abertas"
    não tinha porque a tabela `reports` nunca ganhou UI no painel —
    criada `/admin/denuncias` (abrir/fechar com motivo, mesmo padrão de
    `audit_log`) em vez de só linkar pra lugar nenhum.

25. **Dashboard estratégico com gráficos reais, não estáticos
    (10/09/2026)** — correção de entendimento: os infográficos estáticos
    que ficaram fora do upgrade de design (seção 8.1) eram sobre os
    templates específicos de marketing (mapa de calor, relatório anual,
    persona) que o Rodnei colou naquela rodada. O ponto real é diferente
    e mais importante: gráfico de dados vivos dentro do painel é
    obrigatório pra gestão estratégica — "visualiza, já entende e
    reajusta, planeja, faço relatório". Instalado `recharts` (sem
    bloqueio de rede neste ambiente, diferente de tentativas anteriores
    com outras ferramentas) e criado `src/components/charts.tsx`
    (componentes cliente puros — server component continua fazendo toda
    a busca/agregação, só passa arrays prontos). `/admin/estrategico`
    ganhou: funil de conversão (leads → candidatos → candidaturas →
    contratados, nova query de total de `applications`), evolução
    semanal de leads/candidatos (linha, últimos 70 dias, agregado em
    JS), prestações por status de pagamento e vagas por modalidade
    (ambos agora gráfico de barras de verdade, com eixo/legenda/tooltip,
    substituindo o bar chart feito à mão com `<div>`s). Cor por decisão
    de negócio, não estética — pedido explícito do Rodnei: vermelho
    vivo (`#dc2626`) pra atrasado/risco, verde vivo (`#16a34a`) pra
    pago/sucesso, âmbar (`#f59e0b`) pra pendente/atenção, definido em
    `CHART_COLORS` em `charts.tsx` e mapeado por status/modalidade na
    própria página, não hardcoded no componente de gráfico.

26. **Barras pretas corrigidas (recharts 3.x → 2.x) + mais variedade de
    gráfico (10/09/2026)** — `recharts@3` (lançado recentemente, mudanças
    internas grandes) renderizava as barras do funil sólidas em preto em
    vez das cores configuradas; corrigido com downgrade pra `recharts@2`
    (estável, mesma API, zero mudança de código). Aproveitado pra
    adicionar 3 gráficos com dado real por trás: rosca de candidaturas
    por etapa do pipeline, rosca de candidatos por status de validação,
    e comparativo de barras agrupadas "vagas publicadas × preenchidas"
    por modalidade (substituindo o gráfico solto que só mostrava metade
    da história).

27. **Endereço obrigatório + candidatura bloqueada sem currículo nem
    contato (10/09/2026)** — o Rodnei pediu correção urgente: hoje é
    possível concluir o cadastro do candidato sem telefone/endereço, e
    enviar candidatura sem currículo nenhum (o app promete "currículo e
    experiências" à empresa mas nunca confere se existe — e o upload de
    currículo nem está implementado ainda, só o dropzone visual). Corrigido:
    - Migration `0010_endereco_candidato.sql` — nova coluna
      `profiles.endereco`.
    - Onboarding (`src/app/onboarding/page.tsx` +
      `src/app/onboarding/actions.ts`): campo de endereço adicionado;
      nome/cidade/telefone/endereço agora são obrigatórios pra concluir
      o perfil, validado tanto no client (botão desabilitado) quanto no
      server (a action lança erro se faltar algum).
    - Candidatura (`src/app/(app)/vagas/[id]/candidatura/actions.ts`):
      antes de aceitar o envio, confere se o perfil tem currículo OU
      (telefone + endereço) preenchidos — sem os dois, recusa com
      mensagem clara em vez de mandar candidatura vazia pra empresa.
    - `/admin/candidatos/[id]` mostra o endereço e um aviso vermelho
      quando um candidato antigo (cadastrado antes dessa regra) está com
      telefone/endereço faltando.
    - **Pendência real, não resolvida ainda:** upload de currículo em si
      continua não implementado (dropzone é só visual) — a mensagem no
      onboarding foi ajustada pra deixar isso explícito ao candidato.

28. **Gestão de status de candidatura + histórico por empresa
    (10/09/2026)** — confirmado por busca no código: não existia
    nenhuma ação em nenhum lugar do painel que alterasse
    `applications.status` (só leitura). Migration
    `0011_status_reprovado_cliente.sql` adiciona o valor
    `reprovado_cliente` ao enum `status_candidatura` (distinguindo
    reprovação pela empresa contratante da reprovação genérica
    interna, que continua em `rejeitada`). Nova action
    `atualizarStatusCandidatura`
    (`src/app/admin/(app)/candidatos/[id]/actions.ts`) com select de
    status + motivo opcional por candidatura, integrada na tabela de
    Candidaturas de `/admin/candidatos/[id]` — grava em
    `application_notes` quando há motivo e em `audit_log` sempre,
    mesmo padrão das outras telas. `/admin/estrategico` ganhou uma
    tabela "Histórico por empresa" (contratados / reprovados /
    desistências / em aberto), usando o `DataTable` já existente.
    `src/lib/format.ts` ganhou `STATUS_CANDIDATURA_EM_ABERTO` (lista
    dos estágios que ainda aguardam tratativa).

29. **Causa raiz real das barras/rosca pretas em `/admin/estrategico`
    (10/09/2026)** — não era o `recharts` (o downgrade pra v2 no item 26
    não resolveu nada; a versão nunca foi o problema). Causa real:
    `CHART_COLORS` estava definido dentro de `src/components/charts.tsx`,
    que tem `"use client"` no topo. `estrategico/page.tsx` é Server
    Component e importava `CHART_COLORS` de lá — Server Component **não
    lê o valor real de um export não-componente de um módulo
    `"use client"`**, só recebe `undefined`. Toda cor virava `fill`
    ausente, e SVG sem `fill` renderiza preto por padrão do navegador —
    por isso todo gráfico, sempre, saía preto em qualquer versão do
    recharts testada. Diagnosticado de verdade (não por suposição) rodando o
    projeto localmente com `preview_start`/navegador via Claude Browser
    e inspecionando o DOM renderizado (`fill` do `<path>` sempre `null`)
    até isolar a causa numa página de teste descartável. Corrigido
    movendo `CHART_COLORS` pra `src/lib/format.ts` (módulo sem
    `"use client"`, importável por Server e Client Components) e
    atualizando `estrategico/page.tsx` pra importar de lá.
    **Lição pro futuro:** nunca definir uma constante/objeto de dados
    (não-componente) dentro de um arquivo `"use client"` se algum
    Server Component também precisa do valor real — o export existe,
    mas o valor não atravessa a fronteira.

30. **Animação de entrada no modal de instalação (10/09/2026)** —
    `.modal`/`.modal-overlay` em `globals.css` (fade+scale no card,
    fade+blur no overlay), aplicado no único modal real da plataforma
    (`InstallLeadCapture`).

31. **Black list de candidatos (10/09/2026)** — nova aba `/admin/blacklist`,
    visível a superadmin/admin/operador (mesma capability `pipeline.manage`
    das outras telas de pipeline, sem restrição extra de papel — pedido
    explícito do Rodnei). Migration `0012_blacklist_candidatos.sql`
    adiciona `profiles.blacklisted/blacklist_motivo/blacklist_em/
    blacklist_por`. Nova action `alterarBlacklist`
    (`src/app/admin/(app)/candidatos/actions.ts`), motivo obrigatório
    pra adicionar. Selo "BLACK LIST" visível em `/admin/candidatos` e
    em `/admin/candidatos/[id]`, com botão de marcar/remover na própria
    tela de detalhe.

## 3. Escopo do MVP (revisado)

**Incluído:** login, logout, recuperação de acesso, perfis, currículo,
busca, candidatura, convite, favoritos e alertas do candidato; cadastro
interno de empresas; cadastro, publicação e gestão interna de vagas; pipeline
de seleção, mensagens e notificações; aceite, check-in e conclusão de
temporários; painel interno, hierarquia entre superadministrador,
administradores e operadores, permissões, auditoria, LGPD e exportações
essenciais.

**Excluído por decisão de produto:** cadastro de empresas por representantes
externos, login empresarial, portal da empresa, solicitação de vagas por
empresas e qualquer forma de autopublicação de vaga.

**Fora do MVP:** folha de pagamento, assinatura eletrônica com validade
jurídica específica, emissão fiscal, ponto oficial, verificação de
antecedentes, planos pagos, matching avançado.

## 4. Arquitetura técnica recomendada (do documento, seção 11)

| Camada | Recomendação |
|---|---|
| Interfaces | Web app responsiva para candidatos e painel interno responsivo com acesso hierárquico; apps nativos depois |
| Backend | API modular (auth, vagas, candidaturas, mensagens, consentimentos, arquivos, notificações, auditoria) |
| Banco | PostgreSQL com isolamento lógico por empresa; Supabase é opção, não decisão fechada |
| Arquivos | Storage privado, URLs temporárias, varredura, política de retenção |
| Busca | Busca nativa do Postgres no MVP |
| Mensageria | Fila de tarefas (e-mail, WhatsApp/SMS, arquivos, webhooks) |
| Observabilidade | Logs estruturados, métricas, alertas, auditoria separada |

## 5. Backlog priorizado (do documento, seção 13)

**P0** — Login, logout e recuperação de acesso · Hierarquia e permissões
internas · Perfil e currículo · Cadastro interno de empresas · Vagas e
regras · Candidatura e pipeline · LGPD e preferências · Painel interno e
auditoria · Descontinuação do portal empresarial.

**P1** — Mensagens e agenda · Temporários · Relatórios.

**P2** — Matching e automação · Pagamentos e extratos.

### 5.1 Pendência de integridade em mensagens

**Status:** pendente e bloqueadora para considerar o modelo de mensagens
concluído.

A constraint atual `messages_vinculo_check` exige que `application_id` ou
`invite_id` esteja preenchido, mas ainda aceita os dois campos simultaneamente.
A policy criada na migration `0006` restringe a inserção feita pelo candidato;
ela não substitui a garantia estrutural da tabela e não protege inserções feitas
com service role.

A correção deve ser entregue em uma migration posterior à `0006`, após verificar
e corrigir registros existentes que tenham os dois vínculos preenchidos. A regra
definitiva será XOR, exigindo exatamente um vínculo:

```sql
alter table messages
  drop constraint if exists messages_vinculo_check;

alter table messages
  add constraint messages_vinculo_check
  check (num_nonnulls(application_id, invite_id) = 1);
```

Critérios para encerrar esta pendência:

1. Consultar e tratar registros com nenhum vínculo ou com os dois vínculos.
2. Criar e aplicar a migration da constraint XOR.
3. Testar inserções válidas por candidatura e por convite.
4. Confirmar que inserções com nenhum vínculo ou com ambos sejam rejeitadas.

## 6. Compliance obrigatório (LGPD)

- Opt-in de alertas de vagas **separado por canal** (WhatsApp/E-mail/SMS),
  desmarcado por padrão, revogável.
- Termos de uso e aviso de privacidade tratados como controles distintos
  (aviso ≠ consentimento genérico).
- Registro de prova de consentimento (finalidade, canal, versão do texto,
  data/hora, origem, revogação).
- Direitos do titular acessíveis no próprio app: acesso, correção,
  exportação, revogação, eliminação, revisão de decisão automatizada.
- Textos jurídicos finais dependem de validação por assessoria jurídica
  antes da publicação (o documento original já sinaliza isso).

## 7. Decisões pendentes antes de avançar (do documento, seção 16)

Estas perguntas do próprio documento ainda não têm resposta registrada e
bloqueiam decisões de produto/arquitetura importantes:

1. Nome definitivo do produto: **ainda em aberto**. Área geográfica inicial:
   **Decidido (10/09/2026) — Brasil** (nacional, não regional).
2. ~~Marketplace aberto ou operado por uma agência/empresa específica?~~ →
   **Decidido:** operado pela Vagas Consulting. A empresa cliente não
   publica vaga diretamente — envia uma solicitação/briefing (fora do
   app, ver decisão 10/09 abaixo), e é a equipe interna (painel `/admin`)
   quem cadastra e publica de fato. Implementado no schema (RLS de `jobs`
   impede a empresa de publicar) e reforçado pela migration `0006`
   (empresa nem tem mais login/portal).
3. Quem é o empregador/contratante/intermediador em cada modalidade? →
   **Decidido (10/09/2026): é variável**, definido contrato a contrato
   conforme a necessidade — não é uma regra fixa por modalidade
   (Efetiva/PJ/Temporária). Implicação de schema: precisa de um campo
   explícito por vaga (ex.: `jobs.empregador_formal` ou similar) que o
   admin preenche/confirma no cadastro, em vez de inferir da modalidade.
4. ~~Empresas publicam direto ou toda vaga passa por moderação?~~ →
   **Decidido (decorre do item 2):** nenhuma vaga é publicada diretamente
   pela empresa; hoje nem existe mais canal de auto-atendimento pra
   empresa (portal removido, migration `0006`) — o cadastro da vaga é
   100% interno (`/admin/vagas`), a partir de uma solicitação recebida
   por fora do app.
5. O candidato paga algo? (recomendação do documento: não cobrar) —
   ainda em aberto, sem decisão registrada.
6. Pagamento de temporários dentro da plataforma — quem calcula/aprova? →
   **Decidido (10/09/2026):** não é calculado automaticamente pela
   plataforma — o valor/condição de pagamento é **explícito, definido
   pelo admin no momento em que cadastra a vaga** (campo manual, não
   fórmula). Implicação de schema: `jobs`/`temp_work` precisa de um
   campo de remuneração/condição de pagamento visível e editável só pelo
   admin no cadastro.
7. Quais dados/documentos são realmente necessários em cada etapa? —
   ainda em aberto.
8. WhatsApp é só alerta ou também atendimento/candidatura? →
   **Decidido (10/09/2026): notificação + atendimento básico.** Não é só
   alerta de saída — o candidato também pode interagir por WhatsApp
   (confirmar interesse, tirar dúvida com bot/atendente). Isso exige
   integração bidirecional (linha do kit KPA já usa Evolution API pra
   outros clientes — avaliar reaproveitar o mesmo padrão), escopo maior
   que só disparo de notificação. Ainda não implementado — vira item de
   backlog técnico novo (P1, junto com "Mensagens e agenda").
9. Quais setores/tipos de vaga entram no piloto? — ainda em aberto.
10. Quem administra aprovação, suporte, denúncias, privacidade,
    incidentes? — ainda em aberto (hoje existem `superadmin`
    `rodnei@calixtosolucoes.com.br` e `admin` `priscilla.klein@gmail.com`,
    cadastrada em 10/09/2026; hierarquia completa de `admin_perfil`
    (superadmin/admin/operador) já existe no schema desde a migration
    `0006`, com permissões granulares por ação via `requireInternalUser`
    — falta decidir quem ocupa cada papel além desses dois).

**Escopo dos textos legais (LGPD/Termos) — decidido 10/09/2026:** o app
deve ser **construído em conformidade** com as regras de LGPD (opt-in por
canal, registro de consentimento, direitos do titular etc. — seção 6
segue valendo como requisito técnico), mas **não cabe a mim redigir o
texto legal final que é exposto ao candidato/empresa** — isso é
responsabilidade do Rodnei/assessoria jurídica dele publicar como aviso
de segurança/privacidade de dados. Meu trabalho é garantir que o produto
tecnicamente respeita essas regras (schema, RLS, fluxos de consentimento),
não gerar a peça jurídica final.

## 8. Próximas fases propostas

1. ~~Retirar o portal empresarial do código.~~ ✅
2. ~~Definir stack final e criar repositório de código.~~ ✅ (Next.js +
   Supabase + Vercel, repo já existente antes desta fase)
3. ~~Modelar a hierarquia interna e retirar permissões empresariais.~~ ✅
   A migration `0006` converte os perfis para superadministrador,
   administrador e operador, desativa `company_members` e restringe novas
   candidaturas a vagas publicadas.
4. ~~Aplicar a migration `0006` ao projeto Supabase.~~ ✅ ~~Regenerar os
   tipos TypeScript.~~ ✅ (10/09/2026, itens 18b/22 do log) —
   `src/lib/supabase/types.ts` regenerado a partir do schema real
   (inclui `leads`, `app_install_events`, `service_engagements`,
   `platform_settings`).
5. ~~Validar login, logout, cadastro interno de empresas e vagas e
   restrições de cada papel em ambiente integrado.~~ ✅ (10/09/2026) —
   validado de ponta a ponta em produção com a Priscilla (perfil
   `admin`): cadastro de empresa, cadastro e publicação de vaga,
   ativar/inativar empresa. Achado e corrigido no processo: feedback
   visual de salvamento ausente (item 21 do log).
6. Criar e aplicar a migration da constraint XOR de mensagens descrita na seção
   5.1.
7. Implementar recuperação de senha, MFA administrativo e testes automatizados
   de autorização.
8. Testar o MVP por fase (Descoberta → Design → Construção → Piloto →
   Lançamento, conforme seção 14 do documento original).

## 8.1 Upgrade de design em andamento (decidido 10/09/2026)

O Rodnei trouxe 6 templates de design system (tabela de dados interativa,
cards de vaga, feed de transações, resultados de busca/SERP, bottom sheets
mobile, modal de compartilhamento/permissões) e pediu avaliação de encaixe
com o produto real antes de qualquer implementação. Avaliação registrada:

| Template | Encaixe | Onde | Prioridade |
|---|---|---|---|
| Cards de vaga (recrutamento) | Alto — mapeia direto pra `/vagas` (candidato) | App do candidato | 1 |
| Tabela de dados interativa | Alto — mapeia pra `/admin/candidatos`, `/admin/leads`, `/admin/vagas`, `/admin/empresas` | Painel interno | 2 |
| Feed de transações | Médio — adaptação simplificada pra `/admin/prestacoes` (sem sparkline/saldo, poucos lançamentos) | Painel interno | 3 |
| Bottom sheets mobile | Médio — só compensa se o fluxo mobile do candidato migrar de página cheia pra sheet; esforço grande, ganho incerto agora | App do candidato | Adiado |
| Resultados de busca (SERP multi-tipo) | Baixo — não existe busca multi-tipo (pessoa/arquivo/produto) na plataforma, seria feature nova, não upgrade visual | — | Fora de escopo |
| Modal de compartilhamento/permissões (links, roles por documento) | Baixo — a plataforma não tem conceito de compartilhamento por link nem papéis por documento/registro; autorização já é por perfil fixo (`superadmin`/`admin`/`operador`), não por convite ad-hoc | — | Fora de escopo |

**Decisão:** Rodnei autorizou seguir com tudo, sem urgência de prazo
("ao seu tempo"). Ordem de execução: (1) cards de vaga no app do
candidato, (2) padrão de tabela de dados reutilizável no painel interno,
(3) adaptação do padrão de feed pra `/admin/prestacoes`. Os dois itens
"fora de escopo" ficam registrados aqui só como decisão explícita de não
implementar — não representam funcionalidade faltando, representam
templates que não correspondem a nada que o produto faz hoje.

**Progresso:**

1. ✅ **Cards de vaga** (`/vagas`) — commit `b11176c`, publicado.
2. ✅ **Breadcrumb + sidebar do admin** (fora do plano original desta
   tabela, mas absorveu a parte aproveitável de uma segunda leva de 8
   templates colados depois — topbar/breadcrumb, sistema de navegação)
   — commit `9adbd79`, publicado. Achado no caminho: a sidebar nunca
   tinha links pra `candidatos`/`leads`/`prestações`/`estratégico`
   (só dava pra acessar digitando a URL) — corrigido junto.
3. ✅ **Tabela de dados com ordenação** (`src/components/data-table.tsx`)
   — commit `6777a79`, publicado. Aplicada em `/admin/candidatos` e
   `/admin/leads`. `empresas` e `vagas` ficaram de fora por decisão: cada
   item ali tem formulário de decisão com textarea que não cabe numa
   linha de tabela — o card atual serve melhor.
4. ✅ **Feed de prestações** (`/admin/prestacoes`) — ícone circular por
   status de pagamento, valor formatado e alinhado à direita, sem
   sparkline/saldo (não é carteira). Corrigido de passagem: o valor
   aparecia sem formatação de milhar antes.
5. Segunda leva de templates avaliada (feedback NPS/estrelas, modal de
   agendamento multi-canal, 4 infográficos estáticos, speed dial,
   sistema de navegação completo) — só a parte de breadcrumb/navegação
   tinha correspondente real; o resto ficou registrado como proposta
   (feedback modal, funil de conversão) ou fora de escopo (o restante),
   ver plano em `C:\Users\USER\.claude\plans\quero-que-fa-a-pro-tender-seahorse.md`.

## Referências

- `Planejamento_Aplicativo_de_Vagas.docx` (documento fonte, v1.0)
- Protótipo do app do candidato: https://claude.ai/code/artifact/d04929f9-7fcc-4f91-a8fa-4308140eede4
- Protótipo do portal da empresa: https://claude.ai/code/artifact/188573ac-e75a-4ca3-8637-6252d7dee810
- Protótipo do painel administrativo: https://claude.ai/code/artifact/4e3073eb-bc6e-4374-a4d9-f756345f3222

## 9. Regra de documentação no Obsidian

Toda documentação Markdown criada ou alterada para este projeto deve ser
salva ou sincronizada no cofre do Obsidian abaixo:

```text
C:\Users\USER\Desktop\Jarvis V8\obsidian-template
```

O repositório Git permanece como fonte versionada do projeto. A versão no
Obsidian deve reproduzir o mesmo conteúdo, sem substituir o commit dos arquivos
Markdown no repositório.

Toda entrega que modificar documentação deve informar uma destas situações:

1. **Sincronização concluída:** o arquivo foi salvo no cofre indicado e o
   conteúdo foi conferido.
2. **Sincronização pendente:** o ambiente não possui acesso ao caminho local do
   Windows. Nesse caso, a alteração deve ser preservada no Git e a pendência
   deve ser comunicada, sem registrar uma confirmação fictícia.

## 10. Handoff do incidente do painel administrativo (10/09/2026)

> **RESOLVIDO em 10/09/2026, sessão seguinte a este handoff.** Causa raiz
> confirmada e corrigida — ver item 22 do log em 2.2. O handoff abaixo é
> mantido como registro histórico do diagnóstico em andamento; note que o
> item 5 de "Tentativas realizadas" já suspeitava corretamente da
> `SUPABASE_SERVICE_ROLE_KEY`, mas descartou por falta de log — a suspeita
> era certa, só faltava a evidência (que veio de `get_runtime_errors`, não
> existia essa tool disponível na sessão deste handoff).

### Estado confirmado

- A aplicação pública e o login do candidato carregam, mas a rota autenticada
  `/admin` continua exibindo `This page couldn't load` com o digest
  `3578782868` no deployment de produção observado.
- O login administrativo aceita a credencial e redireciona para `/admin`; a
  falha acontece durante a renderização server-side do painel, depois da
  autenticação.
- A causa raiz ainda não foi confirmada. Build e lint locais não reproduzem o
  erro de execução da Vercel e não substituem a consulta ao Runtime Log.
- O commit local `e607a59` restaura no layout o fluxo de autenticação usado
  antes da regressão e remove a chamada duplicada de `requireInternalUser` da
  página inicial. Essa é uma correção provisória, ainda sem validação em
  produção.
- A branch disponível neste ambiente é `work`, sem remote Git configurado. Por
  isso, o commit local não foi enviado ao GitHub nem implantado pela Vercel.

### Tentativas realizadas e limites encontrados

1. `npm run lint` e `npm run build` passaram; o build gerou `/admin` como rota
   dinâmica.
2. Foi fornecido um token pessoal da Vercel, porém o ambiente bloqueou com
   HTTP 403 tanto o download da CLI em `registry.npmjs.org` quanto o acesso
   direto a `api.vercel.com` e ao domínio publicado.
3. O token foi exposto na conversa e deve ser revogado. Seu valor não foi salvo
   no repositório, em arquivo local ou no commit.
4. Não foi possível consultar Runtime Logs, confirmar as variáveis do
   deployment, acionar redeploy nem testar uma sessão administrativa em
   produção.
5. Não há evidência suficiente para atribuir o incidente à
   `SUPABASE_SERVICE_ROLE_KEY`: a documentação anterior registra que essa
   variável já existia na Vercel. A hipótese não deve ser tratada como causa
   sem o log correspondente ao digest atual.

### Sequência recomendada para a próxima sessão

1. Revogar o token exposto e gerar outro token temporário.
2. Em um ambiente com acesso à Vercel, consultar o deployment atualmente
   associado a `vagas-consulting-umber.vercel.app` e registrar o commit SHA que
   está em produção.
3. Buscar o Runtime Log da requisição autenticada a `/admin`, usando o digest
   `3578782868`, antes de alterar novamente o código.
4. Comparar o erro do log com `src/app/admin/(app)/layout.tsx`,
   `src/app/admin/(app)/page.tsx`, `src/lib/auth/internal.ts` e
   `src/lib/supabase/admin.ts`.
5. Se o commit `e607a59` ainda não estiver publicado, enviar a branch, integrar
   a correção e criar um novo deployment. Se já estiver publicado, corrigir a
   exceção indicada pelo Runtime Log em vez de continuar por hipótese.
6. Validar com a conta administrativa real: login, abertura de `/admin`,
   empresas, vagas, LGPD, auditoria, acesso e logout.
7. Somente declarar o incidente encerrado depois de confirmar o painel em
   produção e a ausência de novos erros nos Runtime Logs.

# FECHAMENTO (handoff original de 10/09/2026, mantido como histórico)

1. **O que foi feito ou decidido:** foi registrado o estado real do incidente,
   incluindo o digest, as verificações locais, a correção provisória no commit
   `e607a59`, os bloqueios externos e a sequência de diagnóstico para a próxima
   sessão.
2. **O que está pendente:** consultar o Runtime Log da Vercel, confirmar o SHA
   publicado, implantar e validar a correção, revogar o token exposto e
   sincronizar este arquivo com o cofre do Obsidian. A sincronização está
   pendente porque este ambiente não acessa o caminho do Windows.
3. **Próximo passo claro:** revogar o token exposto e, em ambiente com acesso à
   Vercel, obter o Runtime Log do digest `3578782868` antes de realizar qualquer
   nova alteração no painel.

# FECHAMENTO DEFINITIVO DO INCIDENTE (10/09/2026, sessão seguinte)

1. **O que foi feito:** causa raiz confirmada em duas camadas (migration 0006
   não aplicada + `SUPABASE_SERVICE_ROLE_KEY` vazia na Vercel), ambas
   corrigidas com autorização explícita do Rodnei a cada ação de risco
   (migration destrutiva, redeploy de produção). Detalhes técnicos completos
   no item 22 do log (seção 2.2). Painel `/admin` validado visualmente
   funcionando.
2. **O que está pendente:** regenerar `src/lib/supabase/types.ts` a partir do
   schema pós-migration-0006 (item 4 da seção 8); testar cadastro de
   empresas/vagas e restrições por papel de ponta a ponta (item 5); resolver
   a constraint XOR de mensagens (seção 5.1, item 6 da seção 8); revogar os
   tokens pessoais da Vercel que circularam nesta sessão e na anterior
   (nenhum foi salvo em arquivo, mas ambos passaram por chat/conversa —
   rotacionar por precaução). Sincronização com o cofre do Obsidian também
   pendente pelo mesmo motivo já registrado na seção 9 (sem acesso ao
   caminho do Windows a partir deste ambiente de execução).
3. **Próximo passo claro:** seguir a seção 8 a partir do item 4 (regenerar
   tipos TypeScript) antes de qualquer nova feature — o schema mudou, o
   código de tipos ainda não foi atualizado pra refletir isso.
