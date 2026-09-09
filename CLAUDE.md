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

## Disciplina de registro

Sempre que uma ação técnica relevante for concluída (deploy, acesso
resolvido, tabela criada, decisão tomada), registrar no `PROJETO.md`
(seção 2.2, log cronológico) e, se for um acesso/ferramenta com pegadinha
que vale a pena lembrar em sessões futuras, resumir aqui também. Isso é
regra permanente do Rodnei, não só desta sessão.
