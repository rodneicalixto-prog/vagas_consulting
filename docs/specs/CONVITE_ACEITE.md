# Especificação — Tela própria de aceite de convite

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Spec funcional v1.0 · **Data:** 14/10/2026 · **Status:** implementado e publicado; decisões P1–P5 registradas na atualização de 23/10/2026 abaixo

## Atualização de 23/10/2026 (estado implementado e publicado)

Esta seção registra o comportamento real do código em `main` (até o commit `42a0665`). Onde ela diverge do texto original acima, vale esta seção.

| Tema | Como ficou | Commit |
|---|---|---|
| Modalidade da vaga | Convite vale para **qualquer vaga publicada**: temporária, PJ ou efetiva. Antes era só temporária. Decisão do Rodnei em 23/10/2026. | `51a5783` |
| P1 (quem cria) | Admin, em `/admin/convites`, com criar, confirmar e cancelar. Também pelo banco de talentos. | — |
| P2 (prazo) | O formulário da equipe usa **72 horas** por padrão (máximo 7 dias). O valor padrão do schema continua em 24 horas, mas o formulário sempre envia o seu. | `schemas.ts` |
| P3 (motivo da recusa) | Opcional, como previsto. | — |
| P4 (confirmação) | Aceito → `confirmado` pela equipe, como previsto. | — |
| P5 (como o candidato fica sabendo) | **Nos dois lugares**: dentro do app (aba Convites) e como mensagem na aba Mensagens, vinculada ao convite (`messages.invite_id`). WhatsApp segue para a fase de IA. | `3d44889` |
| Texto da equipe | Campo opcional ao convidar, até 1000 caracteres. Aparece no bloco "Mensagem da equipe" da tela do convite, antes de aceitar ou recusar. Sem texto, a mensagem é um padrão apontando para Convites. | `3d44889` |
| Aviso ao enviar | Sucesso (verde), falha com motivo (vermelho) ou convite já ativo para o mesmo candidato e vaga. O resultado volta pela URL, não por erro lançado. | `42a0665` |

### Entrevista online (fase posterior ao aceite)

Depois do aceite e da confirmação, a equipe pode marcar uma entrevista online:

1. Com a candidatura em **Entrevista**, a equipe propõe data, hora e link `https` da reunião no cadastro do candidato (`/admin/candidatos/[id]`). A plataforma não cria a reunião; o link vem de Meet, Zoom ou Teams.
2. O candidato recebe uma mensagem em Mensagens (sem o link) e confirma ou recusa em `/processos/[id]`.
3. **Confirmada:** o link aparece para o candidato e a plataforma cria um compromisso do tipo entrevista na agenda (`/admin/agenda/entrevistas`), de 1 hora, com o link na descrição.
4. **Recusada:** registra nota na candidatura e não cria compromisso. A equipe propõe outro horário.
5. Nova proposta substitui a anterior ativa e cancela o compromisso anterior.

Tabela `entrevistas_online` (migrations `0047` e `0048`): uma entrevista ativa por candidatura (índice único parcial); o candidato só lê as próprias; a escrita é feita pelo servidor.

Critérios de aceite da entrevista online: proposta visível ao candidato sem link; link visível só após confirmação; compromisso criado somente na confirmação; nova proposta cancela o compromisso anterior; recusa não cria compromisso.

**Pendente:** teste ponta a ponta em produção (convidar com texto, aceitar, confirmar, propor, confirmar e recusar). Até lá, o estado é implementado, mas não testado em produção.

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

## Garantias adicionadas após o code review (14/10/2026)

- **Um convite ativo por candidato e vaga**, garantido por índice único
  parcial no banco (`0022`): ofertado, visualizado, aceito, confirmado e
  em_execucao ocupam a vaga; recusado, cancelado, concluído e ocorrência
  liberam novo convite.
- **Aceitar** revalida: vaga ainda publicada, candidato fora da black list e
  prazo (`validade`) na própria escrita. Recusar continua sempre possível.
- **Confirmar/cancelar** (operação) só audita se o UPDATE de fato mudou o
  convite; se outra pessoa mudou antes, mostra erro e não registra nada.

## Critérios de aceite
1. Candidato com convite `ofertado` vê o convite em `/convites` e abre o detalhe.
2. Aceitar/recusar muda o status e grava `resposta_em`; repetir a ação é recusado.
3. Convite vencido não aceita resposta.
4. Candidato A não vê nem responde convite do candidato B.
5. Toda resposta gera linha em `audit_log`.
6. Contraste e teclado conforme a meta WCAG 2.1 AA.
