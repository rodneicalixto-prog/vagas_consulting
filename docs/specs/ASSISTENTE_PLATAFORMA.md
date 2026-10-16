# Especificação — Assistente da plataforma (ajuda por IA)

> **Projeto:** Vagas Consulting · **Documento:** Spec do assistente v1.0 · **Data:** 15/10/2026
> **Status:** planejada (ideia do Rodnei em 15/10/2026). Depende dos capítulos
> do manual: ver `docs/MANUAL_PLANO.md`.

## 1. Para que serve

Responder **dúvidas de funcionamento** de quem usa a plataforma, dentro dela:
"como faço a triagem?", "por que a carta não deixa enviar?", "quem pode criar
número de WhatsApp?", "o que significa *não evidenciado*?".

**Não é** o agente de atendimento a candidatos (esse é o agente de IA do
WhatsApp, com a base de conhecimento da empresa). Também **não** consulta
dados de candidatos, vagas ou conversas e **não executa ações** pelo usuário.

## 2. Fonte única: o manual

- O conteúdo vem de `docs/manual/*`, **o mesmo texto** que o usuário lê.
- No build, o manual é dividido por título em pedaços com: capítulo, papel
  a que se destina, rota da tela, estado (`esqueleto`, `rascunho` ou
  `validado`) e link.
- Atualizar o manual atualiza o assistente na mesma entrega
  (`docs/manual/CONFERENCIA.md`).

## 3. Como responde

1. A pergunta é **anonimizada** (e-mail, telefone, CPF e CNPJ viram marcadores).
2. Entra o **papel** da pessoa e a **tela** em que ela está.
3. Só pedaços permitidos ao papel entram (um operador não recebe conteúdo da
   plataforma que ele não enxerga).
4. A recuperação escolhe os pedaços mais relevantes (a mesma técnica da base
   do agente), com reforço para o capítulo da tela atual.
5. O modelo responde **só com esses pedaços**, em poucas linhas, e termina com
   "Veja: capítulo" e o link.

## 3.1 Regras da resposta

| Regra | Efeito |
|---|---|
| Só do manual | Sem pedaço relevante: "Não encontrei isso no manual", com o capítulo mais próximo e o caminho para o suporte |
| Não inventa passo | Nunca descreve botão ou tela que não consta no pedaço |
| Estado visível | Pedaço ainda `[A VALIDAR]` vem com o aviso "ainda não conferido em uso real" |
| Sem dados pessoais | Não pede nem aceita dados de candidato; avisa para não colar |
| Sem ação | Explica como fazer; não faz. Pode oferecer o caminho do menu |
| Papel respeitado | Não revela funções de papel superior |
| Não decide | Não opina sobre candidato, vaga ou contratação |

## 4. Privacidade e registro

- Guarda: pergunta anonimizada, papel, tela, se foi útil e quando.
- **Não guarda** o texto de conversas, nomes de candidatos nem a resposta
  completa além do necessário para a melhoria.
- Retenção: 90 dias.
- Quem vê o registro: só o superadmin, agregado por tema.

## 5. Custo e limites

- Usa a chave da plataforma e **entra no teto mensal** de IA (registro em
  `ai_agent_runs`, motivo `ajuda`).
- Limite por pessoa por dia (proposta: 30 perguntas) e tamanho máximo da pergunta.
- O superadmin liga e desliga; desligado, o botão Ajuda continua levando ao
  manual.

## 6. Tela

- Botão **Ajuda** na barra do painel e painel lateral de conversa.
- Sugestões de pergunta por tela (por exemplo, na triagem: "Por que o
  candidato ficou sem avaliação?").
- 👍 e 👎 em cada resposta; "não resolveu" oferece abrir um pedido ao suporte.

## 7. Melhoria contínua

Perguntas sem resposta e as marcadas com 👎 viram uma lista por tema no painel
do superadmin: cada uma é um tópico que falta ou está confuso no manual. Mesma
lógica da cobertura da base de conhecimento do agente.

## 8. Fases

| Fase | Entrega | Depende de |
|---|---|---|
| A | pedaços do manual no build, resposta com regras e painel Ajuda para a equipe | capítulos do operador e do ciclo de R&S em rascunho |
| B | contexto da tela e sugestões por rota | fase A |
| C | registro, 👍 e 👎 e lista de lacunas para o superadmin | fase A |
| D | versão do candidato no aplicativo | volume do candidato |
| E | atalhos "abrir esta tela" nas respostas | rotas estáveis |

## 9. Aceite

1. Pergunta coberta pelo manual: resposta correta com capítulo e link.
2. Pergunta fora do manual: "não encontrei", sem inventar.
3. Conteúdo de papel superior não aparece para papel inferior.
4. Dados pessoais na pergunta chegam ao modelo anonimizados.
5. Pedaço `[A VALIDAR]` vem com o aviso.
6. Atingido o teto, o assistente avisa e mostra o link do manual.
7. Registro apagado depois de 90 dias.
8. Mudou o manual, mudou a resposta na mesma entrega.

## 10. Riscos

| Risco | Tratamento |
|---|---|
| Manual desatualizado gera resposta errada | conferência por entrega, estado do pedaço e aviso |
| Resposta com tom de certeza sobre algo não testado | aviso de `[A VALIDAR]` e expressão de limite |
| Custo por uso excessivo | limite por pessoa, teto mensal, chave única da plataforma |
| Vazamento entre papéis | filtro por papel antes da recuperação, teste automatizado |
| Pergunta com dado de candidato | anonimização e aviso na tela |

## 11. Decisões pendentes do Rodnei

1. **Quem usa primeiro?** Recomendo a equipe (operador, admin da empresa e
   plataforma) e o candidato depois.
2. **Pode registrar as perguntas anonimizadas** por 90 dias para melhorar o manual?
3. **Nome do assistente** (sugestão: "Ajuda da Vagas Consulting").
4. **Limite por pessoa**: 30 por dia está bom?
