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
| Portal da empresa (`/portal`) | ✅ Removido do código. A migration `0006`, quando aplicada, retira a estrutura e as permissões de acesso empresarial do banco. |
| Painel administrativo (`/admin`) | ✅ Login e logout disponíveis, hierarquia entre superadministrador, administrador e operador aplicada no servidor, cadastro interno de empresas e vagas disponível. |
| Banco de dados (Supabase) | ✅ Schema + coluna extra (histórico terceirizadoras) + dados de exemplo semeados + migration `0004` (admin_users, privacy_requests, reports, application_notes, RLS de `jobs` corrigida para impedir autopublicação pela empresa) |
| Deploy em produção | ✅ **No ar** — https://vagas-consulting-umber.vercel.app responde 200 em `/`, `/login`, `/portal/login` e `/admin/login`. Bloqueador corrigido em 09/09/2026 via Vercel CLI (causa real: `NEXT_PUBLIC_SUPABASE_ANON_KEY` tinha sido apagada e nunca recriada — não era problema de tipo Secret/Config como se pensava). Ver `CLAUDE.md`. |

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

1. Nome definitivo e área geográfica inicial do produto.
2. ~~Marketplace aberto ou operado por uma agência/empresa específica?~~
   **Decidido:** uso próprio da Vagas Consulting, sem conta, login ou portal
   para empresas. A equipe interna cadastra empresas e vagas no painel.
3. Quem é o empregador/contratante/intermediador em cada modalidade?
4. ~~Empresas publicam direto ou toda vaga passa por moderação?~~
   **Decidido:** somente superadministradores e administradores autorizados
   publicam vagas.
5. O candidato paga algo? (recomendação do documento: não cobrar)
6. Pagamento de temporários dentro da plataforma — quem calcula/aprova?
7. Quais dados/documentos são realmente necessários em cada etapa?
8. WhatsApp é só alerta ou também atendimento/candidatura?
9. Quais setores/tipos de vaga entram no piloto?
10. Quem administra aprovação, suporte, denúncias, privacidade, incidentes?

## 8. Próximas fases propostas

1. ~~Retirar o portal empresarial do código.~~ ✅
2. ~~Definir stack final e criar repositório de código.~~ ✅ (Next.js +
   Supabase + Vercel, repo já existente antes desta fase)
3. ~~Modelar a hierarquia interna e retirar permissões empresariais.~~ ✅
   A migration `0006` converte os perfis para superadministrador,
   administrador e operador, desativa `company_members` e restringe novas
   candidaturas a vagas publicadas.
4. Aplicar a migration `0006` ao projeto Supabase e regenerar os tipos a partir
   do banco remoto.
5. Validar login, logout, cadastro interno de empresas e vagas e restrições de
   cada papel em ambiente integrado.
6. Criar e aplicar a migration da constraint XOR de mensagens descrita na seção
   5.1.
7. Implementar recuperação de senha, MFA administrativo e testes automatizados
   de autorização.
8. Testar o MVP por fase (Descoberta → Design → Construção → Piloto →
   Lançamento, conforme seção 14 do documento original).

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
