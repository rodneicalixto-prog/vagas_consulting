# Vagas Consulting — App do Candidato

Scaffold Next.js (App Router, TypeScript, Tailwind CSS v4) do fluxo do
candidato do app de vagas da Vagas Consulting. Responsivo para mobile,
tablet e desktop. Dados ainda mockados (`src/lib/mock-data.ts`) — sem
backend/Supabase conectado nesta fase.

Ver `PROJETO.md` para o planejamento completo e `CLAUDE.md` para as regras
do projeto.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`. Fluxo: `/login` → `/termos` →
`/onboarding` → `/inicio` → `/vagas` → `/vagas/[id]` →
`/vagas/[id]/candidatura` → `/processos` → `/mensagens` → `/perfil`.

## Scripts

- `npm run dev` — ambiente de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — checagem de lint
