# Vagas Consulting — App de Vagas

Projeto novo e independente do kit `KPA-calixto`. Este documento consolida
o planejamento (`Planejamento_Aplicativo_de_Vagas.docx`) e o protótipo já
produzido, e serve de referência única para as próximas fases técnicas.

## 1. Visão

Plataforma de recrutamento com três ambientes conectados:

- **App do candidato** — busca, candidatura, acompanhamento de processos,
  trabalhos temporários, mensagens, perfil e privacidade.
- **Portal da empresa/recrutador** — cadastro, publicação de vagas,
  pipeline de seleção, gestão de temporários.
- **Painel administrativo** — moderação, LGPD, auditoria, permissões,
  suporte.

Modalidades suportadas desde o MVP: **Efetiva (CLT)**, **PJ** e
**Temporária**, cada uma com campos obrigatórios e avisos próprios (aba
"Regras da vaga").

## 2. Estado atual

| Item | Status |
|---|---|
| Documento de planejamento funcional/técnico | ✅ Recebido (`Planejamento_Aplicativo_de_Vagas.docx`, v1.0) |
| Logo da marca | ✅ Recebida |
| Protótipo visual do app do candidato (10 telas, MVP) | ✅ Publicado — [artifact](https://claude.ai/code/artifact/d04929f9-7fcc-4f91-a8fa-4308140eede4) |
| Protótipo do portal da empresa | ⬜ Não iniciado |
| Protótipo do painel administrativo | ⬜ Não iniciado |
| Repositório de código | ✅ Criado e com push feito — [rodneicalixto-prog/vagas_consulting](https://github.com/rodneicalixto-prog/vagas_consulting) |
| Scaffold Next.js do app do candidato | ✅ Conectado ao Supabase de verdade (auth, vagas, candidaturas, perfil, LGPD) — aguardando push/deploy |
| Banco de dados (Supabase) | ✅ Schema + coluna extra (histórico terceirizadoras) + dados de exemplo semeados |
| Variáveis de ambiente na Vercel | ✅ Configuradas pelo Rodnei direto no painel (não verificado pelo Claude — ver seção 2.2) |

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

## 3. Escopo do MVP (do documento, seção 3)

**Incluído:** login/perfis/currículo/busca/candidatura/convite/favoritos/
alertas · cadastro e validação de empresas · publicação de vagas ·
pipeline de seleção, mensagens, notificações · aceite/check-in/conclusão
de temporários · painel admin, moderação, permissões, auditoria, LGPD e
exportações essenciais.

**Fora do MVP:** folha de pagamento, assinatura eletrônica com validade
jurídica específica, emissão fiscal, ponto oficial, verificação de
antecedentes, planos pagos, matching avançado.

## 4. Arquitetura técnica recomendada (do documento, seção 11)

| Camada | Recomendação |
|---|---|
| Interfaces | Web app responsiva, instalável como PWA no MVP; portal empresa/admin por papéis; apps nativos depois |
| Backend | API modular (auth, vagas, candidaturas, mensagens, consentimentos, arquivos, notificações, auditoria) |
| Banco | PostgreSQL com isolamento lógico por empresa; Supabase é opção, não decisão fechada |
| Arquivos | Storage privado, URLs temporárias, varredura, política de retenção |
| Busca | Busca nativa do Postgres no MVP |
| Mensageria | Fila de tarefas (e-mail, WhatsApp/SMS, arquivos, webhooks) |
| Observabilidade | Logs estruturados, métricas, alertas, auditoria separada |

## 5. Backlog priorizado (do documento, seção 13)

**P0** — Identidade e acesso · Perfil e currículo · Empresas e validação ·
Vagas e regras · Candidatura e pipeline · LGPD e preferências · Admin e
auditoria.

**P1** — Mensagens e agenda · Temporários · Relatórios.

**P2** — Matching e automação · Pagamentos e extratos.

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
2. Marketplace aberto ou operado por uma agência/empresa específica?
3. Quem é o empregador/contratante/intermediador em cada modalidade?
4. Empresas publicam direto ou toda vaga passa por moderação?
5. O candidato paga algo? (recomendação do documento: não cobrar)
6. Pagamento de temporários dentro da plataforma — quem calcula/aprova?
7. Quais dados/documentos são realmente necessários em cada etapa?
8. WhatsApp é só alerta ou também atendimento/candidatura?
9. Quais setores/tipos de vaga entram no piloto?
10. Quem administra aprovação, suporte, denúncias, privacidade, incidentes?

## 8. Próximas fases propostas

1. Prototipar portal da empresa e painel admin (mesmo padrão visual).
2. Definir stack final e criar repositório de código.
3. Modelar banco de dados (entidades da seção 7.3 do documento original).
4. Montar infraestrutura (deploy, domínio, ambientes).
5. Construir o MVP por fase (Descoberta → Design → Construção → Piloto →
   Lançamento, conforme seção 14 do documento original).

## Referências

- `Planejamento_Aplicativo_de_Vagas.docx` (documento fonte, v1.0)
- Protótipo do app do candidato: https://claude.ai/code/artifact/d04929f9-7fcc-4f91-a8fa-4308140eede4
