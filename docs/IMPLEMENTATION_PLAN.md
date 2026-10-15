# Plano de Implementação

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** Plano de implementação v1.6 · **Data:** 14/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


> O app já está construído (18 migrations, 15+ commits, em produção). Este
> documento é retroativo: mostra o que já foi feito por etapa, e trata o
> "próximo passo" como o backlog real que restou — não um plano do zero.

## Etapa 1 — Configuração do projeto ✅ Concluída

Repositório `rodneicalixto-prog/vagas_consulting`, ambiente Next.js +
Supabase + Vercel, deploy automático em `main`. Dependências em
`package.json`. Nenhuma ação pendente aqui.

## Etapa 2 — Dados e autenticação ✅ Concluída, com um item corrigido nesta sessão

- Schema modelado e aplicado (18 migrations).
- RLS habilitado, recursão em política corrigida (migration `0005`).
- Auth via Supabase (e-mail/senha).
- **Corrigido em 28/09/2026**: migration `0018` (auto-arquivamento de
  vagas) nunca tinha sido aplicada em produção — a função que o cron
  chamava não existia. Corrigida e aplicada nesta sessão (ver `TRD.md` →
  "Bug técnico corrigido").
- **Pendente**: recuperação de senha, MFA administrativo real (ver
  `TRD.md`).

## Etapa 3 — Jornada principal do usuário ✅ Concluída

Cadastro/login → perfil/currículo (com IA) → busca de vaga → candidatura →
acompanhamento em `/processos` → mensagens. Ponta a ponta validado em
produção em 10/09/2026 com usuária real (perfil `admin`), conforme
`PROJETO.md`.

## Etapa 4 — Funcionalidades secundárias ✅ Concluída

Agenda da equipe, prestações de temporários, auditoria com exportação,
LGPD, denúncias, blacklist, leads via Meta Ads, paginação em tabelas admin,
arquivamento automático.

## Etapa 5 — Qualidade — ⚠️ Parcial, com pendências reais

| Item | Status |
|---|---|
| Headers de segurança | ✅ Aplicados |
| CSRF | ✅ Implementado |
| Validação de entrada (Zod) | ⚠️ Implementada, mas com **erro de tipo real** (`errorMap` descontinuado no Zod 4) — `tsc --noEmit` falha em `src/lib/validation/schemas.ts` e `src/lib/security/audit.ts` |
| `npm audit` | ✅ 0 vulnerabilidades |
| Build de produção local (Windows) | ❌ **Falhando** neste ambiente — Turbopack crasha (`TurbopackInternalError`, processo nativo sai com `0xc0000142`) ao compilar `globals.css`. Não confirmado se afeta o build da Vercel (Linux) — **Resolvido em 14/10/2026:** os deploys da Vercel (Linux) `dpl_2hZKt…` e `dpl_29M4S…` terminaram `READY`; o crash é só deste Windows local |
| Recuperação de senha | ❌ Não implementada |
| MFA administrativo | ❌ Não implementado (campo decorativo) |
| Testes automatizados de autorização | ❌ Não implementados |
| Acessibilidade auditada | **Auditoria aprovada para agendar** (Rodnei, 14/10/2026); meta WCAG 2.1 AA; ainda não executada |

## Etapa 6 — Lançamento ✅ Em produção

App já está no ar (`vagas-consulting-umber.vercel.app`), com histórico de
pelo menos um incidente de produção resolvido (painel `/admin` fora do ar
em 10/09/2026, causa raiz: migration não aplicada + env var vazia — ver
seção 10 do `PROJETO.md`). Sem plano formal de rollback documentado além
do redeploy manual pela Vercel. Sem monitoramento/alerta configurado além
de `get_runtime_errors` consultado manualmente.

## Backlog real (por prioridade, a partir desta análise)

1. 🔴 **Corrigir `errorMap` → `error` em `schemas.ts`** (Zod 4) — build
   de produção com type-check estrito está quebrado.
2. 🔴 **Confirmar se o Turbopack quebra o build da Vercel também**, ou se
   é isolado deste ambiente Windows.
3. 🟠 Implementar recuperação de senha.
4. 🟠 Implementar MFA administrativo real (painel lida com PII de
   candidatos).
5. 🟡 Atualizar `supabase/migrations/0018_auto_arquivamento_vagas.sql`
   pra refletir a correção aplicada nesta sessão (hoje o arquivo no repo
   não bate mais com o que está em produção).
6. 🟡 Decidir as 6 perguntas de negócio ainda abertas na seção 7 do
   `PROJETO.md` (ver `PRD.md` → "Perguntas em aberto").
7. 🟢 Atualizações de dependência de rotina (Next 16.3.4→16.3.6, React
   19.2→19.3, etc. — sem vulnerabilidade associada).

## Etapa 7 — Carteira por atendente (v1.4, 14/10/2026)

| Passo | Entrega | Verificação |
|---|---|---|
| 1 | Migration `0023`: `company_assignments` + `jobs.confidencial` | Aplicada; defaults não mudam o comportamento atual |
| 2 | Helper `escopoDoUsuario` + testes | admin, operador, sem carteira, inativo, confiança |
| 3 | Aplicar nas telas do operador | Teste por tela com 2 empresas |
| 4 | Tela **Carteira** e conta operadora com atribuição | Fluxo ponta a ponta |
| 5 | Sigilo: ocultar do operador comum e anonimizar ao candidato | Operador comum × de confiança |
| 6 | Cadastrar Athenas e ePró, 2 operadores, conferir isolamento | Roteiro manual do Rodnei |

Responsável: a Claude, com aprovação do Rodnei a cada publicação. Pronto =
critérios de aceite de `specs/CARTEIRA_ATENDENTE.md` §7 cumpridos.

## Para cada tarefa do backlog

**Responsável (Rodnei, 14/10/2026): a Claude executa os itens do backlog,
sob aprovação do Rodnei.** Continua valendo a regra do `CLAUDE.md`: nada de
push, deploy ou alteração de arquivo sem autorização explícita no momento da
ação, e a fase de WhatsApp/IA (`PROJETO.md` seção 8.0) não começa sem plano
próprio e aviso do Rodnei.

Novos itens de backlog nascidos das respostas de 14/10/2026:

1. 🔴 Segunda cópia do banco fora do Supabase (rotina agendada + teste de
   restauração).
2. 🔴 Evitar pausa por inatividade do projeto Supabase (plano Pro ou
   rotina de keep-alive) e monitoramento externo de disponibilidade.
3. 🟡 Tela própria de aceite de convite de entrevista.
4. 🟡 Documentar tokens tipográficos e breakpoints próprios.
5. 🟡 Auditoria de acessibilidade (WCAG 2.1 AA).
6. 🟡 Definir metas numéricas a cada campanha de divulgação.

## Antes de passar pra próxima etapa

Este projeto já roda em produção — não há "próxima etapa" no sentido do
modelo genérico. A disciplina que vale é a que já está registrada no
`CLAUDE.md` do projeto: qualquer ação técnica relevante concluída vai pro
log cronológico do `PROJETO.md` (seção 2.2), e nada é publicado/alterado
em produção sem autorização explícita sua no momento da ação.

## Etapa 7 — status em 14/10/2026

Passos 1 a 5 concluídos e em produção, mais banco de talentos, ranking,
linha do tempo e testes unitários. **Falta o passo 6:** cadastrar Athenas e
ePró, criar os 2 operadores e rodar o roteiro manual de isolamento (aguarda
o Rodnei). Backlog seguinte: black list por empresa; revelar a empresa por
`revelada_em` na lista de processos; aplicar a mesma barreira de escopo em
qualquer tela nova.

## Estado em 15/10/2026

| Frente | Situação |
|---|---|
| Carteira e escopo por empresa | ✅ em produção |
| Admin da empresa (Fase 1), black list por empresa | ✅ em produção |
| Dashboard do operador (Fase 1), agenda em cascata, contatos, ranking | ✅ em produção |
| Vitrine pública e modo visitante | ✅ em produção |
| Integrações Fase A (cofre; OpenAI e Groq conectadas) | ✅ em produção |
| Inbox de WhatsApp Fase B | ✅ publicado; falta configurar Evolution e webhook e testar com mensagem real |
| Agente de IA em modo sugestão (Fase 3) | 📐 planejado: `specs/AGENTE_IA_FASE3.md` (3A–3F) |
| Etapa Exame médico (dashboard Fase 3) | ⏳ migration só com "sim" |
| E-mail (Resend), SMS, Telegram: envio | ⏳ cadastro de chaves feito/pendente; envio não construído |
| Teste de isolamento com pessoas reais | ⏳ roteiro pronto (`ROTEIRO_TESTE_ADMIN_EMPRESA.md`) |

### Agente de IA, Fase 3 — passos (planejado em 15/10/2026)

3A tabelas e cadastro do agente da SOS (migration 0032) · 3B geração com
guardrails e teto · 3C caixa de sugestão na conversa · 3D aprendizado com
aprovação · 3E piloto de 2 semanas na SOS Vagas · 3F abrir para clientes.
Critérios de aceite por passo em `specs/AGENTE_IA_FASE3.md` §10.
