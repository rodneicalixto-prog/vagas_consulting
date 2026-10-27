# Pacote pré-build — Avaliação por IA (inspirado na Gent.IA) (v0.1, rascunho)

> **Projeto:** Vagas Consulting · **Data:** 26/10/2026 · **Uso:** próprio, não produto à venda.
> **Regra:** os seis documentos do pré-build (`04_DIRETRIZES/pre-build-docs.md` do kit) vêm antes do código.
> Este arquivo reúne os seis em versão curta. **Nada aqui foi construído.**
> Origem: `Apresentação Gent.IA Out.26.pdf`.
> **Modelo decidido pelo Rodnei (26/10/2026):** a IA conduz o processo seletivo inteiro
> (hunting, triagem, entrevistas, ranking); a pessoa entra **na validação de toda
> reprovação** e na **entrevista final**. Ver §3A.

## 1. PRD — o que e por quê

Hoje o ciclo de R&S tem triagem de currículo, roteiro, testes, laudo e devolutiva.
Falta **avaliar o candidato em várias dimensões com evidência**, e ter uma
**shortlist justificada**. Ganho: menos tempo na comparação e decisão com prova.

| # | Capacidade | Entrega | Fase |
|---|---|---|---|
| 1 | Fit cultural por valores da empresa (peso, corte, citação de prova) | Nota 0–100 + evidência por valor | 1 |
| 2 | Competências em escala (júnior/pleno/sênior/especialista) | Nível + evidência + cobertura | 1 |
| 3 | Perfil comportamental | Questionário respondido pelo candidato (sem inferir por voz) | 1 |
| 4 | Shortlist ranqueada e justificada + "Pergunte à IA" | Ranking por vaga com texto de justificativa | 1 |
| 5 | Entrevista pela IA em texto (chat/WhatsApp) | Transcrição + pontuação por competência | 2 |
| 6 | Entrevista por voz com gravação e transcrição | Áudio, texto e evidência por trecho | 3 |
| 7 | Avançar etapa sugerido por nota de corte (humano confirma) | Botão "aplicar sugestão" | 4 |

**Fora, de propósito:** avaliação emocional por voz/rosto e "detecção de fraude"
por IA (base científica fraca, risco de viés e jurídico); **reprovação sem
validação humana** e **qualquer resposta ao candidato sobre reprovação antes da
validação** (§3A). Aprovar e avançar etapa por nota de corte é automático.

## 2. TRD — como

- Reaproveita: `assessments`/`assessment_results` (nota 1–4 com evidência),
  `job_screenings`, `interview_scorecards`, `candidate_reports`, o agente
  (`ai_agents`, teto de custo, guardrails, provedores Groq/OpenAI/Claude) e o
  Whisper já usado para áudio.
- **Novas tabelas (migration futura, aditiva, RLS ligada e sem política pública):**
  `company_values` (valores da empresa: nome, descrição, peso, corte),
  `ai_evaluations` (por candidatura: dimensão, nota, evidências, versão do
  prompt, modelo, custo), `candidate_questionnaires` (respostas do perfil
  comportamental), `interview_sessions` e `interview_turns` (Fase 2 e 3).
- Pontuação **no código**, não no modelo (como na triagem): o modelo devolve
  evidência e nível; o código calcula nota e ranking.
- Segurança: conteúdo do candidato é dado, nunca instrução; currículo/entrevista
  vão **às cegas** (sem nome, idade, foto, estado civil, endereço); atributos
  protegidos nunca entram na pontuação.
- Voz (Fase 3): fluxo STT → modelo → TTS, ou API de voz em tempo real; decisão
  após o teste de custo. Gravação só com consentimento explícito e retenção
  definida.

## 3. Fluxo do app

```
Vaga (Central) → Critérios + Valores → candidato responde questionário/entrevista
      → IA avalia por dimensão (evidência) → Shortlist justificada
      → pessoa decide (avançar, reservar, devolutiva) → Laudo → Devolutiva
```

## 3A. Regra da reprovação (decidida em 26/10/2026)

**A IA nunca reprova sozinha de fato e nunca responde ao candidato sobre reprovação.**
Quem decide é a pessoa; o candidato não precisa pedir nada (LGPD, art. 20: a revisão
humana é automática, não depende de pedido).

```
IA identifica "não segue" ─► candidato fica "em avaliação" (IA NÃO envia resposta)
      │
      ▼
FILA DE VALIDAÇÃO HUMANA: cada caso com motivo, critério, evidência citada,
nota por dimensão, o que o candidato fez de melhor e a análise da IA
      │
      ├─ Confirmar reprovação ─► IA envia a devolutiva (modelo aprovado) e encerra
      ├─ Reverter ────────────► candidato volta à etapa e a IA continua o processo
      └─ Pedir mais dados ────► IA pergunta ao candidato e reavalia
```

- **A decisão da pessoa é de um clique** (confirmar, reverter ou pedir dados), com
  campo opcional de observação. Esse clique **devolve a missão à IA**, que executa a
  continuação sozinha, com texto e envio automáticos a partir de modelos aprovados.
- **O que a IA entrega em cada caso:** critério que não foi atendido, se é
  eliminatório, a citação que prova, a nota por dimensão, a confiança da IA e o que
  poderia mudar o resultado. Se faltar a evidência, o caso **entra na fila marcado como
  "justificativa incompleta"** e com confiança baixa: nenhum caso some, e a pessoa vê o
  alerta antes de decidir.
- **Não há amostragem:** toda reprovação passa pela pessoa. Aprovações e avanços
  seguem automáticos pela nota de corte; só reprovar exige validação.
- **Candidato em avaliação não fica no escuro:** prazo máximo para a pessoa decidir
  (decidido: 72 horas); vencido, o caso sobe como alerta e o candidato recebe um
  aviso neutro e verdadeiro ("seu processo segue em análise"). **Nunca** uma
  mensagem que sugira aprovação ou reprovação antes da decisão.
- **Correções da pessoa alimentam o ajuste:** cada "Reverter" é registrado com o
  motivo, para revisar prompt e nota de corte nos testes (§7).
- Eliminação só por **critério objetivo e com evidência** (regra já usada na
  triagem). Atributos protegidos nunca entram na pontuação.

### Estados novos da candidatura (a detalhar no schema)

`em_avaliacao_ia` → `aguardando_validacao` → `reprovacao_confirmada` | `revertida`
(volta a etapa anterior) | `aguardando_dados`. Fila com ordenação por prazo e por
critério eliminatório (casos objetivos primeiro, para despachar em lote).

## 3B. Regras por vaga e modo de entrevista (decidido em 26/10/2026)

Cada vaga tem seu **bloco de regras para a IA** (campo na aba de critérios, versionado).
A IA nunca age só com o padrão: se a vaga não tem as regras mínimas, ela **não conduz**
a vaga e o caso segue para entrevista com humano (nada de adivinhar).

**Modo de entrevista da IA, por vaga:**

| Modo | O que a IA faz | Quando |
|---|---|---|
| `texto` (padrão) | Entrevista por WhatsApp/chat: fit cultural, comportamento, técnica | Todos os cargos, desde a primeira versão |
| `voz` (opcional) | Mesma entrevista por voz, com gravação e transcrição | **Só nos cargos que o Rodnei marcar**, depois do texto provado |
| `humano` | Só triagem e avanço por nota de corte; a entrevista é feita por pessoa | Cargos fora da lista da voz ou sem regras mínimas |

**Cargos da voz (decidido em 26/10/2026): chefia e liderança, que também são sigilosos.**
Vaga sigilosa (`jobs.confidencial`): a IA se apresenta como assistente de seleção e **não
revela a empresa**; regra de vaga que mande informar a empresa é **bloqueada**. A fila de
validação, as gravações e as transcrições só aparecem para quem tem acesso a vaga
confidencial (mesma barreira de carteira e sigilo do restante do painel). Vaga com senioridade
"Liderança" (já existe nos critérios) ou que gerencia pessoas sugere o modo `voz`, mas o
modo continua sendo escolha explícita por vaga. A voz só liga depois do texto provado,
do parecer jurídico e do teste de custo.

**Campos do bloco de regras** (todos opcionais, exceto os marcados):
- **Obrigatório:** modo de entrevista · eliminatórios (já existem nos critérios) ·
  nota de corte por etapa · quando chamar a pessoa (gatilhos de escalada).
- Pesos das dimensões (cultura, competências, comportamento) e valores aplicáveis.
- Perguntas obrigatórias e **o que nunca perguntar** nesta vaga.
- O que a IA pode informar (faixa, local, escala, benefícios) e o que deve dizer
  "vou confirmar com a equipe".
- Tom, janela de horário de contato e número de tentativas.
- Instruções livres da vaga (texto curto).

**Precedência (de cima para baixo; o de cima sempre vence):**
1. Guardrails globais, **inegociáveis**: validação humana de toda reprovação (§3A),
   sem atributos protegidos, sem avaliação emocional, conteúdo do candidato é dado.
2. Regras da vaga. 3. Padrão da empresa. 4. Padrão do sistema.

A regra da vaga **nunca relaxa um guardrail**: texto livre passa pelo mesmo filtro de
termos discriminatórios dos critérios, e o que o contrariar é bloqueado na verificação
(OK / Aviso / Bloqueia) antes de salvar. A versão das regras usada fica gravada em
cada avaliação, para comparar versões nos testes (§7).

Nova etapa no ciclo: **Avaliação** (entre Triagem e Entrevista), com os mesmos
estados da trilha (`docs/specs/CENTRAL_DA_VAGA.md`). Etapa bloqueada diz o que
falta e leva a quem resolve.

## 4. Briefing UI/UX

- Uma tela por candidato com abas: Resumo · Cultura · Competências ·
  Comportamento · Evidências. Cada nota abre a **citação** que a sustenta.
- Shortlist: ranking com barras por dimensão e uma frase de justificativa.
- Toda nota de IA com selo "sugestão"; botão **Corrigir nota** (registra o ajuste
  humano, alimenta o aprendizado).
- Regra do projeto: nenhum cartão decorativo; todo bloco leva a um destino real.

## 5. Schema do backend

Ver §2. Detalhe de colunas fica para o `BACKEND_SCHEMA.md` quando a Fase 1 for
aprovada; nenhuma migration é criada antes.

## 6. Plano de implementação

| Passo | Entrega | Pré-requisito |
|---|---|---|
| 0 | **Central da vaga e trilha (feito em 26/10/2026)** | — |
| 1A | Valores da empresa + **regras por vaga** (§3B) + critérios de corte | Decisões D1–D3. **Regras por vaga construídas em 26/10/2026**; valores cadastrados só ao final (anexo do Rodnei) |
| 1B | Triagem com **avanço automático** + **fila de validação de reprovação** (§3A) | 1A. **Fila construída em 26/10/2026** (triagem alimenta a fila; avanço automático ainda não) |
| 1C | Entrevista por IA em texto (WhatsApp/chat): fit cultural, comportamento, técnica | 1B |
| 1D | Avaliação por competência em escala + ranking e shortlist justificada | 1C |
| 1E | Agendamento da entrevista final (reaproveita convite e confirmação) e devolutiva automática | 1D |
| 2 | Entrevista por voz, **só nos cargos marcados** (modo `voz`); os demais seguem para entrevista com humano | Texto provado + parecer jurídico + teste de custo |

A fila de validação (1B) vem **antes** das entrevistas por IA: sem ela nenhuma
reprovação pode existir, então ela é pré-requisito de todo o resto.

### Decisões que dependem do Rodnei

| # | Pergunta | Recomendação |
|---|---|---|
| D1 | Quais **valores** a SOS Vagas e cada cliente usam para fit cultural? | Cadastrar por empresa; começar pela SOS Vagas |
| D2 | **Questionário comportamental:** instrumento próprio ou licenciado? | **Decidido em 27/10/2026: instrumento profissional licenciado do tipo DISC, aplicado pelo agente.** O agente **só entrega o link**, recebe o teste realizado e **anexa ao processo do candidato**; **uma pessoa segue com a aprovação do teste**. O agente não interpreta, não faz diagnóstico e **o DISC nunca é eliminatório para o agente**: é apenas parte do processo de seleção. Falta escolher o fornecedor. A empresa já tem psicólogo(a) no quadro, que confirmará depois o enquadramento do instrumento (decisão do Rodnei: não bloqueia o resto). Fluxo: o DISC entra depois das aprovações do agente e antes da entrevista humana |
| D3 | Teto de custo por avaliação | **Decidido:** mantém o teto atual de US$ 100/mês por empresa |
| D4 | ~~Voz entra quando?~~ **Decidido:** texto primeiro; voz opcional só em cargos marcados | **Cargos da voz: chefia e liderança** (26/10/2026); demais cargos seguem para entrevista com humano |

## 7. Ganchos para corrigir nos testes (prompt e skill)

Onde o resultado tende a ficar fraco e **onde ajustar sem mexer em código**:

| Ponto fraco provável | Onde corrigir | Como testar |
|---|---|---|
| Justificativa genérica ("bom perfil") | Prompt da shortlist | Rodar em 5 candidatos reais; exigir 1 citação por nota |
| Nota alta sem evidência | Regra do código: evidência vazia = "não evidenciado" | Teste unitário já cobre o padrão na triagem |
| Fit cultural inflado | Prompt de valores: exigir comportamento observável, não adjetivo | Comparar com avaliação da pessoa |
| Viés por idade, gênero, origem | Cegueira do currículo + termos proibidos (`termosDiscriminatorios`) | Teste com perfis idênticos mudando só o atributo |
| Tom da devolutiva | Modelos aprovados da devolutiva (já existem) | Revisão do Rodnei |

**Convenção para os prompts da avaliação (a criar na Fase 1):** um arquivo por
prompt em `src/lib/ai/prompts/avaliacao-*.ts`, cada um com `versao` e `nota_de_mudanca`;
a versão usada fica gravada em `ai_evaluations`. Assim dá para comparar duas
versões do mesmo prompt nos mesmos candidatos.

**Skills para refinar durante os testes:** `prompt-master` (ajuste de prompt),
`skill-creator` (criar a skill de projeto `avaliacao-ia-vagas` com os critérios de
revisão acima) e `review-gate` do kit (gate antes de dar por pronto).

---

## Fechamento

1. **O que foi feito ou decidido:** pacote pré-build da avaliação por IA escrito em
   versão curta; princípio "IA avalia, pessoa decide"; avaliação emocional e
   detecção de fraude por IA ficam fora.
2. **O que está pendente:** decisões D1 a D4; parecer jurídico sobre gravação de
   voz e revisão de decisão automatizada; sincronizar este arquivo no Obsidian
   (ver `PROJETO.md`).
3. **Próximo passo claro:** aprovar a migration 0049, testar a fila com candidatos reais
   e seguir para o avanço automático da triagem e a entrevista por IA em texto (1C).

> **Implementação do prazo de 72 h (26/10/2026):** o cron `validacao-prazo` marca `alertada_em` uma única vez e audita `validacao_prazo_vencido` por vaga; a tela de validações já destaca o atraso. **Ainda não existe** o aviso neutro ao candidato nem o alerta por e-mail ou Telegram para a equipe: ficam para a próxima etapa.
