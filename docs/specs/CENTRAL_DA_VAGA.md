# Especificação — Central da vaga e trilha do ciclo de R&S (v0.1)

> **Projeto:** Vagas Consulting · **Data:** 26/10/2026 · **Uso:** próprio (operação SOS Vagas), não produto à venda.
> **Origem:** o Rodnei relatou que o app em produção está confuso, com vias sem saída.
> Complementa `docs/manual/03-ciclo-rs/00-visao-geral.md` e `AGENTE_IA_FASE3.md`.

## 1. Problema (diagnóstico de 26/10/2026)

- Abrir uma vaga leva a um **formulário de critérios**. As 8 outras etapas
  (divulgação, triagem, roteiro, testes, laudos, devolutivas, abordagem,
  carta-oferta) aparecem só como links sublinhados soltos, sem ordem.
- **Toda etapa termina em "← Critérios da vaga"**: não há "próxima etapa".
- Não existe o estado do ciclo: quem olha não sabe o que já foi feito, o que
  falta nem o que fazer agora.
- Etapas travadas por pré-requisito (ex.: triagem sem critérios) só avisam
  o bloqueio, sem levar a quem resolve.

## 2. Solução

1. **Central da vaga** (`/admin/vagas/[id]`): resumo da vaga, **"Próximo
   passo"** em destaque e um cartão por etapa com estado e contagem.
2. **Trilha fixa do ciclo** (layout de `/admin/vagas/[id]/*`): em toda etapa,
   a barra com as etapas na ordem, a atual marcada, e no rodapé
   **← etapa anterior / próxima etapa →**.
3. **Critérios** passam a `/admin/vagas/[id]/criterios`.
4. Etapa bloqueada nunca é beco: diz **o que falta** e leva a quem resolve.

## 3. Estados de etapa (puro, `src/lib/ciclo-vaga.ts`)

| Estado | Significado |
|---|---|
| `concluida` | Cumpriu o objetivo da etapa |
| `andamento` | Começou e falta parte |
| `pendente` | Pode começar agora |
| `bloqueada` | Falta pré-requisito (mostra qual e o link) |
| `opcional` | Não é obrigatória para seguir |

Regras por etapa em `calcularEtapas`; o "Próximo passo" é a primeira etapa
obrigatória em `pendente` ou `andamento`.

## 4. Fora desta entrega

Entrevista por IA em voz, DISC e fit cultural por valores (Fase 1 em diante
do plano Gent.IA). Os pontos de extensão e os prompts ajustáveis estão em
`docs/specs/AVALIACAO_IA_GANCHOS.md`.

## 5. Critérios de aceite

- Em qualquer página de `/admin/vagas/[id]/*` há trilha e saída clara.
- Nenhuma etapa bloqueada sem texto do que falta e link para resolver.
- `npm test`, `npm run lint` e `npm run build` passam.
- Nenhuma migration nova; nenhum dado alterado.
