# Vagas Consulting

Plataforma proprietária de recrutamento da Vagas Consulting, construída com
Next.js, TypeScript, Tailwind CSS e Supabase. O produto combina o app do
candidato com um painel de operação interna.

Empresas são registros administrados pela equipe da Vagas Consulting. Não há
cadastro, login, portal, solicitação de vaga nem publicação de vaga por
empresas. O painel interno deve aplicar uma hierarquia entre
superadministrador, administradores e operadores, com permissões validadas no
servidor e no banco de dados.

Login, recuperação de acesso e logout visível são requisitos obrigatórios para
os ambientes autenticados. Contas internas só podem ser criadas pelo
superadministrador; o cadastro de candidatos permanece um fluxo separado.

O portal empresarial da direção anterior foi removido. Toda gestão de empresas,
vagas e processos deve ser implementada no painel interno.

Ver `PROJETO.md` para o planejamento completo e `CLAUDE.md` para as regras
do projeto.

Documentação Markdown também deve ser sincronizada com o cofre do Obsidian em
`C:\Users\USER\Desktop\Jarvis V8\obsidian-template`. Se o ambiente não tiver
acesso ao caminho local do Windows, a entrega deve registrar a sincronização
como pendente.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`. O fluxo do candidato começa em `/login`; o
painel da equipe interna começa em `/admin/login`.

## Scripts

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — checagem de lint
