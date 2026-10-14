# Documentação do Vagas Consulting

> **Projeto:** Vagas Consulting (`rodneicalixto-prog/vagas_consulting`) · **App:** v0.1.0 · **Índice:** v1.0 · **Data:** 14/10/2026

Regra permanente (Rodnei, 14/10/2026): nenhum app é construído sem os seis
documentos abaixo, versionados, vinculados ao projeto e à versão do app, e
**lidos antes da construção**. Mudança relevante no app = nova versão dos
documentos afetados, antes do código.

## Ordem de leitura

| # | Documento | Arquivo | Versão | App |
|---|---|---|---|---|
| 1 | PRD | [PRD.md](PRD.md) | 1.3 | v0.1.0 |
| 2 | TRD | [TRD.md](TRD.md) | 1.3 | v0.1.0 |
| 3 | Fluxo do app | [APP_FLOW.md](APP_FLOW.md) | 1.3 | v0.1.0 |
| 4 | Briefing de UI/UX | [UI_UX_BRIEFING.md](UI_UX_BRIEFING.md) | 1.3 | v0.1.0 |
| 5 | Schema do backend | [BACKEND_SCHEMA.md](BACKEND_SCHEMA.md) | 1.2 | v0.1.0 |
| 6 | Plano de implementação | [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | 1.3 | v0.1.0 |

Complementar: [AUTO_ARCHIVE.md](AUTO_ARCHIVE.md) (especificação do cron de
auto-arquivamento, migration `0018`).

## Pendências

Todos os documentos são rascunhos retroativos gerados a partir do código.
Campos sem resposta estão marcados `[A PREENCHER]` e dependem de decisão do
Rodnei (busque por `A PREENCHER` em `docs/`).

Atenção: `BACKEND_SCHEMA.md` reflete o banco em 28/09/2026. Antes de
construir algo que toque o banco, reconfirmar o schema real de produção
(`tfipbxjslpxbaybpxsql`) e se a migration `0018` foi aplicada.
