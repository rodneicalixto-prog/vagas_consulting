# Vagas Consulting — Regras do projeto (leitura obrigatória)

Estas regras foram definidas pelo Rodnei e valem para toda sessão neste
repositório. Leia antes de qualquer ação.

## Regras permanentes

1. **Se faltar alguma informação, pare o que estiver fazendo e pergunte
   antes de prosseguir.** Não adivinhar em silêncio.
2. **Não mexer em nenhum arquivo, não apagar nada sem autorização
   explícita do Rodnei.**
3. **Não publicar nada** (deploy, push para remoto, registro de domínio,
   compartilhamento de link, etc.) **sem autorização explícita no
   momento da ação.** O Rodnei revisa tudo antes de autorizar.
4. **Não copiar texto de sites de concorrentes.** Qualquer referência
   competitiva serve só de inspiração estrutural, nunca de cópia de
   conteúdo.

## Contexto do projeto

- Projeto novo, independente do kit `KPA-calixto`.
- Baseado em `Planejamento_Aplicativo_de_Vagas.docx` (plano
  funcional/técnico v1.0) e no protótipo visual já publicado do app do
  candidato.
- Stack em definição: Next.js + Supabase (Postgres) + deploy na Vercel,
  conforme decisões registradas no `PROJETO.md` deste repositório.
- Há decisões de negócio ainda em aberto (seção 7 do `PROJETO.md`) sendo
  tratadas com premissas conservadoras marcadas `[A PREENCHER]` até
  validação do Rodnei.

## Nota técnica

- `AGENTS.md` é gerado automaticamente pelo `next dev` (Next.js) e
  descreve peculiaridades da versão do framework instalada — não é uma
  instrução do Rodnei, é conteúdo técnico do próprio Next.js.

## Acessos resolvidos — lições para não repetir investigação

Log completo cronológico em `PROJETO.md`, seção 2.2. Resumo rápido do que
funciona, pra não perder tempo tentando de novo o que já falhou:

- **Vercel — RESOLVIDO.** `create_git_project` do MCP nativo e
  Composio→Vercel (`invalidToken`, testado 2x) falharam. O que funcionou:
  Rodnei autorizou o app da Vercel direto no GitHub
  (vercel.com/new → "Adjust GitHub App Permissions" → liberar o repo) e
  clicou "Import" no painel. Depois disso o MCP nativo da Vercel
  (`list_projects`, `list_deployments`, `create_git_project` reuse) passa
  a enxergar e gerenciar o projeto normalmente. Projeto:
  `vagas-consulting` (`prj_useLOGXbwEN5pIjnkp4fyO0J8j4A`), team
  `rodnei-calixto-s-projects` (`team_xCWGuCpqFbPqf4VvIFxJXrJe`). Deploy
  automático a cada push em `main` já está ativo.
- **Limite conhecido da Vercel**: o MCP nativo não tem ferramenta pra
  ler/criar variáveis de ambiente — isso só dá pra fazer pelo painel
  (Settings → Environment Variables) por enquanto.
- **Reconfirmado em 09/09/2026**: com a conexão Composio→Vercel já
  reconectada do zero nesse mesmo dia (`vercel_itself-bundy`, `ACTIVE`),
  `VERCEL_FILTER_PROJECT_ENVS` no projeto `vagas-consulting` ainda
  retorna `403 invalidToken`. Confirma que o problema não é a conexão
  estar velha/expirada — é algo na integração Composio↔Vercel em si
  (ou permissão do token OAuth) que não dá acesso de management API a
  esse projeto. **Não vale testar de novo sem uma mudança real do lado
  do Composio ou da Vercel** (ex.: reautorizar com escopo diferente).
- **Supabase — RESOLVIDO, com pegadinha.** O projeto "Vagas Consulting"
  (ref `tfipbxjslpxbaybpxsql`) está numa organização Supabase diferente
  da conta que os MCPs usam por padrão (org `jfpiyugtvtuihjuqweyc`,
  só enxerga `calixto testesProject`). **`list_projects` NUNCA passou a
  mostrar o Vagas Consulting**, nem depois do Rodnei convidar/aceitar
  membership na org certa — mas chamar as tools passando o
  `project_id`/`ref` `tfipbxjslpxbaybpxsql` **direto** funciona
  normalmente (`get_project`, `list_tables` testados e OK). **Nunca
  concluir "sem acesso" só porque `list_projects` não lista o projeto —
  sempre tentar com o ref direto primeiro.**
- **Papel Developer não edita configuração do projeto.** A conta
  `rodneicalixto@hotmail.com` (convidada como Developer na org "SOS MKT")
  consegue usar o MCP normalmente (leitura/migrations via API key), mas
  **não** consegue salvar nada em Authentication pelo dashboard (botão
  "Salvar alterações" fica travado) nem um token pessoal gerado por ela
  funciona pra endpoints de configuração via Management API (`403
  Forbidden`). Pra mudar configuração de Auth (ex.: toggle "Confirm
  email"), precisa logar no dashboard com `rodnei@calixtosolucoes.com.br`
  (dono da org) direto no navegador — não tem solução via API/MCP com a
  conta Developer.
- **`execute_sql` roda em transação somente-leitura.** O MCP nativo
  (`mcp__Supabase__execute_sql`) recusa qualquer INSERT/UPDATE com
  `25006: cannot execute INSERT in a read-only transaction` — serve só
  pra leitura/diagnóstico. Pra escrever dados (não só DDL), usar
  `apply_migration` mesmo sendo DML, não só schema.
- **Nunca escrever uma RLS policy com subquery na própria tabela.** A
  policy original de `company_members` (`... exists (select 1 from
  company_members cm where ...)`) causava `42P17 infinite recursion
  detected in policy` em toda leitura — silenciosamente quebrava o login
  do portal da empresa sem nenhum erro visível no app (só apareceu com
  log de debug + `get_runtime_logs` da Vercel). Corrigido isolando a
  checagem numa função `SECURITY DEFINER` (`public.is_company_member`,
  migration `0005`) — é o padrão certo desde o início pra esse tipo de
  policy "membro vê outros membros do mesmo grupo".
- Repo GitHub numérico (`id` da API, usado em `gitSource.repoId` da
  Vercel): `1362784831` (`rodneicalixto-prog/vagas_consulting`).

## ✅ Bloqueador da Vercel — RESOLVIDO em 09/09/2026

O app ficou fora do ar (500 em toda rota) por causa da variável
`NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel. **Causa raiz real** (diferente
do que se pensava inicialmente): a variável não estava com tipo "Secret"
— ela tinha sido **apagada** numa tentativa de correção anterior e nunca
recriada (`vercel env ls` mostrava só `NEXT_PUBLIC_SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY`, sem a anon key).

**Como foi corrigido**: nem painel manual nem MCP — usando o **Vercel CLI
autenticado por token pessoal** (`vercel login` via token, não precisa de
navegador):

```bash
vercel link --yes --project=vagas-consulting --scope=rodnei-calixto-s-projects --token=$TOKEN
vercel env ls --token=$TOKEN                     # diagnosticar antes de mexer
printf '%s' "$ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --no-sensitive --token=$TOKEN
# repetir para preview e development
vercel deploy --prod --token=$TOKEN
```

`--no-sensitive` é a flag que corresponde ao "Config" do painel (permite
o Next.js inlinar a variável `NEXT_PUBLIC_*` no bundle do browser durante
o build). Token pessoal gerado em vercel.com/account/tokens, usado uma
única vez e descartado depois — nunca comitado, nunca salvo em memória
de longo prazo.

**Lição para o futuro**: o MCP nativo da Vercel não tem tool de env vars
e o Composio→Vercel dá `403 invalidToken` nesse projeto mesmo com conexão
`ACTIVE` (reconfirmado, ver acima) — **o Vercel CLI local com token
pessoal é o caminho que funciona** quando é preciso mexer em env vars
sem o painel. Validado com `web_fetch_vercel_url` (200 em `/login`,
`/portal/login`, `/admin/login`) e `get_runtime_logs` (sem erros no
deploy novo).

## Disciplina de registro

Sempre que uma ação técnica relevante for concluída (deploy, acesso
resolvido, tabela criada, decisão tomada), registrar no `PROJETO.md`
(seção 2.2, log cronológico) e, se for um acesso/ferramenta com pegadinha
que vale a pena lembrar em sessões futuras, resumir aqui também. Isso é
regra permanente do Rodnei, não só desta sessão.
