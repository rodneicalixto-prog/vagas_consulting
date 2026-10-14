# Especificação — Tela própria de aceite de convite

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Spec funcional v1.0 · **Data:** 14/10/2026 · **Status:** implementado localmente com as sugestões abaixo como padrão (Rodnei: "vamos fazer as suas tarefas de ponta a ponta"); P1–P5 seguem abertas para ajuste; não publicado

## Por que existe

Decisão do Rodnei (14/10/2026): o aceite de convite para vaga temporária terá
**tela própria**.

## Achado importante (verificado no código e no banco em 14/10/2026)

O convite **não está construído** de ponta a ponta, ao contrário do que o PRD
dizia ("✅ Construído"):

| Parte | Situação real |
|---|---|
| Tabela `invites` e enum `status_convite_temp` | ✅ existem |
| RLS | só `SELECT` do próprio candidato (`invites_select_own`); **nenhuma política de `UPDATE`/`INSERT`** |
| Código do app que lê ou grava `invites` | ❌ nenhum (só `types.ts`) |
| Tela do admin para criar convite | ❌ não existe |
| Botão "Aceitar convite" em `/vagas/[id]` | ⚠️ só muda o rótulo de "Candidatar-se" e leva à candidatura normal (`applications`), não ao convite |

Ou seja: hoje não há como criar nem aceitar um convite. A tela de aceite
depende de definir também **quem cria** o convite.

## Proposta (a validar)

### Fluxo do candidato
1. `/convites` — lista dos convites do candidato (ofertado/visualizado em
   destaque, histórico abaixo). Atalho também em `/processos`.
2. `/convites/[id]` — detalhe: vaga, empresa, local, remuneração, data/hora,
   **prazo para responder** (`validade`), botões **Aceitar** e **Recusar**
   (recusa pede motivo).
3. Primeira abertura marca o convite como `visualizado`.
4. Aceitar → `aceito`; Recusar → `recusado`; ambos gravam `resposta_em`.
5. Depois do aceite, a **operação confirma** (`confirmado`), e o restante do
   ciclo (`em_execucao`, `concluido`, `ocorrencia`) segue pelo painel admin.

### Regras
- Só o próprio candidato responde, e só em `ofertado`/`visualizado`.
- Convite com `validade` vencida não pode ser aceito (mostra "expirado").
- Resposta feita por **server action** com verificação de dono e transição
  válida, registrando em `audit_log`. Não abre política de `UPDATE` ao
  candidato no banco (mais seguro).
- Nenhuma mudança de schema obrigatória. Única exceção possível: o enum não
  tem "expirado"; podemos **calcular** o estado na tela (sem migration) ou
  adicionar o valor (migration em duas etapas, como a 0018/0019).

### Fora do escopo desta entrega
- (Tela do admin para criar convites **foi incluída**: `/admin/convites`, com criar, confirmar e cancelar.)
- Notificação por WhatsApp (fase "agente de IA + WhatsApp").

## Decisões (padrão aplicado — ajustável)

| # | Pergunta | Sugestão |
|---|---|---|
| P1 | Quem cria os convites? A operação, por uma tela nova no painel admin? Ou ainda não será usado? | Criar também a tela do admin (fecha o ciclo) |
| P2 | Prazo para o candidato responder: 24 horas (como diz o protótipo) ou outro? | 24 h, ajustável por convite (`validade`) |
| P3 | Recusa: o motivo é obrigatório ou opcional? | Opcional, com lista de motivos comuns |
| P4 | Depois do aceite, a operação precisa confirmar antes de valer? | Sim (`aceito` → `confirmado`) |
| P5 | Como o candidato fica sabendo do convite: só dentro do app (aba Convites + aviso), ou também por mensagem em `/mensagens`? | Dentro do app agora; WhatsApp na fase de IA |

## Critérios de aceite
1. Candidato com convite `ofertado` vê o convite em `/convites` e abre o detalhe.
2. Aceitar/recusar muda o status e grava `resposta_em`; repetir a ação é recusado.
3. Convite vencido não aceita resposta.
4. Candidato A não vê nem responde convite do candidato B.
5. Toda resposta gera linha em `audit_log`.
6. Contraste e teclado conforme a meta WCAG 2.1 AA.
