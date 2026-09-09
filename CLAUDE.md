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
- Repo GitHub numérico (`id` da API, usado em `gitSource.repoId` da
  Vercel): `1362784831` (`rodneicalixto-prog/vagas_consulting`).

## 🔴 BLOQUEADOR ATIVO — app em produção fora do ar (500 em toda rota)

Deploy atual (`https://vagas-consulting-umber.vercel.app`) retorna 500 em
**todas** as rotas, inclusive `/` e `/login`. Causa raiz confirmada nos
runtime logs da Vercel:

```
Error running the exported Web Handler: Error: Your project's URL and Key
are required to create a Supabase client!
```

O erro acontece dentro do **middleware/proxy** (`src/proxy.ts` →
`src/lib/supabase/middleware.ts`), que roda em toda request antes de
qualquer página — por isso o site inteiro cai, não só o login.

**Causa raiz real**: a variável `NEXT_PUBLIC_SUPABASE_ANON_KEY` no painel
da Vercel (Settings → Environment Variables) foi salva com **Type =
"Secret"**. Variáveis tipo Secret não ficam disponíveis pro Next.js
inlinar no bundle do navegador durante o build — por isso o valor chega
vazio em runtime mesmo com o nome e valor certos. O Vercel mostra o aviso
"Remove the public framework prefix to keep this value private... If
that's safe, change the variable to Config" nessa variável.

**Não dá pra converter Secret → Config depois de salva** (Vercel bloqueia
essa opção). A correção pendente é:

1. Apagar a variável `NEXT_PUBLIC_SUPABASE_ANON_KEY` inteira.
2. Recriá-la do zero: nome `NEXT_PUBLIC_SUPABASE_ANON_KEY`, colar o
   mesmo valor (está em `.env.local` local, e foi passado no chat), e
   **marcar Type = "Config"** (não "Secret") antes de salvar.
3. Conferir se `NEXT_PUBLIC_SUPABASE_URL` também não está como Secret
   (se estiver, mesma correção).
4. Redeploy do deployment de produção mais recente (menu "..." → 
   Redeploy).
5. Validar: `mcp__Vercel__web_fetch_vercel_url` em
   `https://vagas-consulting-umber.vercel.app/login` deve responder
   `200`, não `500`. Também checar `mcp__Vercel__get_runtime_logs`
   (filtro `level: ["error"]`) pra confirmar que o erro sumiu.

**Tentativas já feitas e descartadas** (não repetir): redeploy comum (2x,
inclusive sem cache) não resolveu porque o problema não é cache — é o
tipo da variável em si, que já nasce errada em todo build. Reconectar
Composio/Vercel não é relevante aqui (isso já foi resolvido antes, ver
acima).

Nenhum código do app precisa mudar pra isso — é 100% configuração no
painel da Vercel.

## Disciplina de registro

Sempre que uma ação técnica relevante for concluída (deploy, acesso
resolvido, tabela criada, decisão tomada), registrar no `PROJETO.md`
(seção 2.2, log cronológico) e, se for um acesso/ferramenta com pegadinha
que vale a pena lembrar em sessões futuras, resumir aqui também. Isso é
regra permanente do Rodnei, não só desta sessão.
