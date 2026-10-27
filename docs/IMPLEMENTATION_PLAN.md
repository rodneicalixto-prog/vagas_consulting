# Plano de Implementação

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Documento:** Plano de implementação v1.8 · **Data:** 15/10/2026 · **Status:** rascunho retroativo, lido antes de construir (ver `docs/README.md`)


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
| Agente de IA em modo sugestão (Fase 3) | 🚧 3A e 3B prontos (agente, base, Obsidian, sugestão nas conversas); módulos do pacote R&S pendentes: `specs/AGENTE_IA_FASE3.md` |
| Etapa Exame médico (dashboard Fase 3) | ⏳ migration só com "sim" |
| E-mail (Resend), SMS, Telegram: envio | ⏳ cadastro de chaves feito/pendente; envio não construído |
| Teste de isolamento com pessoas reais | ⏳ roteiro pronto (`ROTEIRO_TESTE_ADMIN_EMPRESA.md`) |

### Agente de IA, Fase 3 — passos (planejado em 15/10/2026)

3A tabelas e cadastro do agente da SOS (migration 0032) · 3B geração com
guardrails e teto · 3C caixa de sugestão na conversa · 3D aprendizado com
aprovação · 3E piloto de 2 semanas na SOS Vagas · 3F abrir para clientes.
Critérios de aceite por passo em `specs/AGENTE_IA_FASE3.md` §10.

## Estado ao fim de 15/10/2026

| Frente | Situação |
|---|---|
| Agente de IA: atende, aprende, base confiável, recuperação por pergunta | ✅ em produção (falta uso real e aprovar a nota do processo) |
| Pacote de R&S, 3B a 3P | ✅ entregue e publicado |
| Exportação em Word (carta, laudo, roteiro, testes) | ✅ |
| Indicadores e plano de ação | ✅ (funil aproximado) |
| Roteiro de teste do ciclo | ✅ `ROTEIRO_TESTE_CICLO_RS.md` |
| Teste com pessoas e dados reais | ⏳ depende do Rodnei |
| Auth URL do Supabase, revisão das chaves Groq e OpenAI | ⏳ depende do Rodnei |
| Busca semântica de notas, áudio da conversa, abordagem editável, Word com tabelas | 📋 backlog |

Ordem de dependência dos passos concluídos: 3O, 3N, 3G, 3H, 3J, 3L, 3I, 3M, 3K,
3P (migrations 0033 a 0043). Cada passo foi publicado com tsc, eslint, build e
testes verdes; o lote soma 158 testes automatizados.

## Acréscimo ao estado de 15/10/2026 — números de WhatsApp

| Frente | Situação |
|---|---|
| Números por empresa e por operador (linhas, conversa por linha, agente por linha) | ✅ em produção |
| Tela Números de WhatsApp (QR code, webhook automático, estado, limite) | ✅ publicada; **sem teste contra a Evolution real** |
| Origem do número na lista de conversas, filtro por número | ✅ |
| Troca do operador dono com transferência das conversas | ✅ |
| Rodízio entre números, Meta Cloud API | 📋 backlog |

Primeiro teste a fazer: criar um número novo, ler o QR e trocar mensagens.

## Acréscimo (27/10/2026) — endereço completo do candidato

Decisão: obrigatório. O código já exige; falta o que cerca a decisão. **Nenhuma linha de código nesta etapa.**

| Passo | Dono | Estado |
|---|---|---|
| Seis documentos atualizados (PRD, TRD, fluxo, UI/UX, schema, plano) | Claude | ✅ 27/10/2026 |
| Texto de finalidade no aviso de privacidade (`/termos`) | Rodnei + assessoria jurídica | ⬜ pendente |
| Base legal e prazo de retenção do endereço | assessoria jurídica | ⬜ pendente |
| Linha de finalidade junto ao campo no onboarding e em dados pessoais | Claude, depois do texto aprovado | ⬜ pendente |
| Campo estruturado com CEP | decisão do Rodnei | ⬜ opcional, não decidido |

Regra: só construir o que ficou marcado como pendente depois do texto jurídico aprovado.

## Acréscimo (27/10/2026) — página pública de vagas

Spec: `docs/specs/PAGINA_PUBLICA_VAGAS.md`. **Nenhuma linha de código nesta etapa.**

| Passo | Dono | Estado |
|---|---|---|
| Spec e seis documentos atualizados | Claude | ✅ 27/10/2026 |
| Respostas às 4 perguntas em aberto da spec (§11) | Rodnei | ⬜ pendente |
| P1: layout público, metadados, `sitemap`, `robots`, `JobPosting` | Claude, depois do OK | ⬜ não iniciado |
| Teste do `JobPosting` na ferramenta do Google (efetiva, PJ, temporária) | Rodnei ou Claude | ⬜ depende do P1 |
| P2: busca, filtros e paginação | Claude | ⬜ depois do P1 |
| P3: compartilhar e atalho na Central da vaga | Claude | ⬜ depois do P2 |

Ordem de publicação: cada fase com `tsc`, `eslint`, testes e `build`; teste de fumaça das rotas públicas e protegidas; push só com OK do Rodnei (código).
