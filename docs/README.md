# Documentação do Vagas Consulting

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Índice:** v1.8 · **Data:** 15/10/2026

Regra permanente (Rodnei, 14/10/2026): nenhum app é construído sem os seis
documentos abaixo, versionados, vinculados ao projeto e à versão do app, e
**lidos antes da construção**. Mudança relevante no app = nova versão dos
documentos afetados, antes do código.

## Ordem de leitura

| # | Documento | Arquivo | Versão | App |
|---|---|---|---|---|
| 1 | PRD | [PRD.md](PRD.md) | 1.8 | v0.1.0 |
| 2 | TRD | [TRD.md](TRD.md) | 1.8 | v0.1.0 |
| 3 | Fluxo do app | [APP_FLOW.md](APP_FLOW.md) | 1.8 | v0.1.0 |
| 4 | Briefing de UI/UX | [UI_UX_BRIEFING.md](UI_UX_BRIEFING.md) | 1.8 | v0.1.0 |
| 5 | Schema do backend | [BACKEND_SCHEMA.md](BACKEND_SCHEMA.md) | 1.8 | v0.1.0 |
| 6 | Plano de implementação | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | 1.8 | v0.1.0 |

Planejamento: [DIAGNOSTICO_MULTIUSUARIO_WHITELABEL.md](DIAGNOSTICO_MULTIUSUARIO_WHITELABEL.md)
(carteira por atendente, aluguel e white-label).

Complementar: [BACKUP.md](BACKUP.md) (rotina de backup no Drive) e
[AUTO_ARCHIVE.md](AUTO_ARCHIVE.md) (especificação do cron de
auto-arquivamento, migration `0018`).

## Pendências

Todos os documentos são rascunhos retroativos gerados a partir do código.
Campos sem resposta estão marcados `[A PREENCHER]` e dependem de decisão do
Rodnei (busque por `A PREENCHER` em `docs/`).

Atenção: `BACKEND_SCHEMA.md` reflete o banco em 15/10/2026 (migrations até a `0045`). Antes de
construir algo que toque o banco, reconfirmar o schema real de produção
(`tfipbxjslpxbaybpxsql`) e se a migration `0018` foi aplicada.

## Specs e roteiros

| Documento | Assunto |
|---|---|
| `specs/CARTEIRA_ATENDENTE.md` | Escopo por empresa e vagas sigilosas |
| `specs/ADMIN_DA_EMPRESA.md` | Admin da empresa, limite de operadores, black list da empresa |
| `specs/DASHBOARD_OPERADOR.md` | Dashboard, agenda em cascata, entregas |
| `specs/COMUNICACAO_OMNICANAL.md` | WhatsApp, e-mail, SMS, Telegram, agentes de IA, inbox |
| `specs/INTEGRACOES.md` | Cofre de chaves e teste de conexão |
| `specs/LINHAS_WHATSAPP.md` | Números de WhatsApp por empresa e por operador, QR code e agente por número |
| `specs/AGENTE_IA_FASE3.md` | Agente de IA, base de conhecimento e pacote de R&S (3A a 3P, entregue) |
| `specs/VITRINE_PUBLICA.md` | Vitrine pública e modo visitante |
| `ROTEIRO_TESTE_ADMIN_EMPRESA.md` | Teste de 20 minutos do isolamento |
| `ROTEIRO_TESTE_CICLO_RS.md` | Teste do ciclo completo de R&S, 12 passos |
