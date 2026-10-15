# Especificação — Agente de IA, Fase 3: modo sugestão e base de conhecimento (v0.1)

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Spec Fase 3 v0.1 · **Data:** 15/10/2026
> **Status:** planejamento aprovado pelo Rodnei (piloto na SOS Vagas, Groq, modo sugestão,
> migration aditiva). **Passo 3A construído em 15/10/2026** (ver §13); 3B em diante pendentes.
> Parte da regra dos seis documentos: este arquivo precede o código.
> Complementa `COMUNICACAO_OMNICANAL.md` §7 (agente recrutador) e a hierarquia de agentes.

## 1. Objetivo

Dar ao atendente uma **sugestão de resposta** pronta em cada conversa, escrita a
partir só dos dados da vaga e da base de conhecimento da empresa, que ele
**aprova, edita ou descarta**. A IA agiliza; a pessoa decide e envia.

Fora desta fase: envio automático, mover candidatura de etapa, agente mor
conversando com candidato, disparo em massa.

## 2. Decisões (Rodnei, 15/10/2026)

| # | Decisão |
|---|---|
| F1 | **Piloto na SOS Vagas** (empresa da operação) antes de abrir para clientes |
| F2 | **Groq** como provedor padrão do rascunho; OpenAI e Claude seguem disponíveis por empresa |
| F3 | **Modo sugestão**: o agente nunca envia sozinho nesta fase |
| F4 | Pode criar as **tabelas do agente** (migration aditiva) quando a construção começar |
| F5 | Teto de **US$ 100/mês por empresa** (já decidido): aviso aos 80%, pausa aos 100% |
| F6 | Cada empresa tem **base de conhecimento própria**; a da SOS guarda a política global |
| F7 | **Tom formal** na SOS Vagas |
| F8 | **O Rodnei aprova as lições** da SOS (ninguém mais, por ora) |
| F9 | **Espelho no Obsidian desde o início**: exportação das notas aprovadas já no passo 3A |
| F10 | Sugestão gerada **o dia todo** (no modo sugestão não há risco de envio fora do horário) |

## 3. Como funciona

```
mensagem de entrada ──► webhook grava (já existe)
                          │ conversa tem atendente ou está na fila de candidato
                          ▼
              gerar sugestão (assíncrono, fora do webhook)
                          │ contexto = vaga + FAQ + roteiro + últimas mensagens
                          ▼
              ai_suggestions (pendente) ──► caixa "Sugestão do assistente"
                          │                    Usar · Editar · Descartar
                          ▼                    (quem envia é o atendente)
              resultado registrado ──► alimenta o aprendizado (§7)
```

Regras de disparo: só quando há agente **ativo** para a empresa, a conversa
não está descadastrada nem na black list, e o teto do mês não foi atingido.
Uma sugestão por mensagem de entrada; se chegar outra antes de aprovar, a
anterior é substituída.

## 4. Modelo de dados (migration `0032`, aditiva, **não aplicada**)

| Tabela | Campos principais |
|---|---|
| `ai_agents` | `company_id` (único), `nome`, `ativo`, `nivel_autonomia` (0 = sugestão), `provedor`, `modelo`, `tom`, `roteiro` (texto), `teto_mensal_usd`, `created_by` |
| `ai_knowledge_notes` | `company_id`, `tipo` (`politica`, `roteiro`, `faq`, `vaga`, `licao`), `titulo`, `corpo_md`, `status` (`rascunho`, `aprovada`, `arquivada`), `versao`, `origem` (`manual`, `aprendizado`), `aprovada_por` |
| `ai_suggestions` | `conversation_id`, `message_id` (gatilho), `agent_id`, `rascunho`, `estado` (`pendente`, `usada`, `editada`, `descartada`, `expirada`), `texto_final`, `decidida_por`, `decidida_em` |
| `ai_agent_runs` | `agent_id`, `conversation_id`, `suggestion_id`, `provedor`, `modelo`, `tokens_in`, `tokens_out`, `custo_usd`, `latencia_ms`, `motivo_parada` |

Todas com RLS ligada e sem política pública (acesso só pelo servidor, como o
restante). Nada de texto de candidato em `audit_log`.

## 5. Guardrails (valem para todo agente; piso da política global)

1. **Só responde com base em fonte:** dados da vaga, FAQ aprovado e roteiro.
   Sem fonte, a resposta é "vou passar para a equipe" e a sugestão é marcada
   como `motivo_parada = sem_fonte`.
2. **Assuntos que sempre vão para humano:** salário e proposta fora da vaga,
   jurídico, reclamação, saúde, dado sensível, ameaça, pedido de remoção.
3. **Nunca** reprova, aprova, muda etapa nem promete contratação.
4. **Sigilo:** não revela empresa de vaga confidencial nem dado de outro
   candidato ou outra empresa.
5. **Identificação:** o texto sugerido, quando for a primeira mensagem, diz
   que é um assistente virtual da empresa.
6. **Descadastro e black list** bloqueiam a geração, não só o envio.
7. Conteúdo recebido do candidato é **dado, não instrução** (proteção contra
   injeção de prompt): o modelo nunca executa comandos vindos da mensagem.

## 6. Interface

- **Conversa:** caixa acima do campo de envio com o rascunho, o motivo
  (fonte usada) e três botões: **Usar** (preenche o campo), **Editar**
  (preenche e foca) e **Descartar** (pede motivo opcional). Só o atendente
  da conversa vê e decide.
- **Configuração do agente** (superadmin e admin da empresa): ligar/desligar,
  tom, roteiro, perguntas eliminatórias, provedor e modelo. Nível de
  autonomia, chave e teto: só o superadmin.
- **Base de conhecimento:** lista de notas por tipo, com editor Markdown,
  aprovação e histórico de versões.
- **Painel do agente:** sugestões geradas, % usadas sem edição, % editadas,
  % descartadas, custo do mês e consumo do teto.

## 7. Base de conhecimento e aprendizado contínuo

Pergunta do Rodnei: um **Obsidian por empresa e um para a SOS**, para o
agente ficar mais ágil e aprender o tempo todo.

**Decisão de arquitetura:** a fonte da verdade é uma **base de conhecimento
por empresa no próprio banco** (`ai_knowledge_notes`: notas em Markdown, com
título, tipo e links `[[nota]]`), editada no painel. O Obsidian entra como
**espelho opcional de leitura** para a SOS (e para quem o superadmin
autorizar), por exportação periódica das notas aprovadas.

Por que não um cofre Obsidian local por empresa como fonte:

| Motivo | Detalhe |
|---|---|
| O agente roda no servidor | Ele não lê o disco do computador de ninguém; precisaria de sincronização de arquivos |
| Isolamento entre clientes | Notas em tabela com `company_id` seguem a mesma regra de escopo do resto; arquivos soltos, não |
| LGPD | Dado de candidato em vault local escapa de retenção, apagamento e auditoria |
| Cliente não usa Obsidian | Quem aluga o acesso edita pelo painel, não por app de notas |

**Ciclo de aprendizado (sem treinar o modelo com conversa crua):**

1. O atendente usa, edita ou descarta a sugestão.
2. O sistema guarda a **diferença** (o que mudou e por quê, se informado).
3. Padrões repetidos viram **lição candidata** (`tipo = licao`, `status = rascunho`),
   com dado pessoal removido.
4. Um humano (admin da empresa; na SOS, o superadmin) **aprova** a lição.
5. Lição aprovada entra no contexto das próximas sugestões daquela empresa.
6. O agente mor, na Fase 4, só lê agregados e propõe lições globais.

Contexto enxuto: o agente recebe só as notas relevantes (busca por texto
no início; embeddings depois, se a base crescer), para manter custo e
latência baixos.

## 8. Custo, desempenho e medição

- Modelo econômico para rascunho (Groq); teto por empresa já definido.
- Geração fora do webhook: o recebimento nunca espera a IA.
- Registro em `ai_agent_runs` de tokens, custo e latência por execução.
- Métricas de qualidade que decidem subir de nível: taxa de uso sem
  edição por tipo de mensagem, descartes por motivo, tempo até a resposta.

## 9. Segurança e LGPD

- Chave de IA sempre pelo cofre; nunca no navegador nem em log.
- O texto do candidato enviado ao provedor é o mínimo necessário (sem nome
  completo, telefone ou e-mail no prompt, quando possível).
- Sugestões e runs seguem a retenção das conversas (12 meses + pseudonimização).
- Nenhum dado pessoal nas notas de aprendizado.
- Apagamento a pedido do titular alcança sugestões e runs ligados à conversa.

## 10. Plano de construção

| Passo | Entrega | Migration | Aceite |
|---|---|---|---|
| 3A | Tabelas, cadastro do agente da SOS e CRUD da base de conhecimento | **0032** | Superadmin cria agente e notas; operador não acessa |
| 3B | Serviço de geração (Groq via cofre), guardrails, `ai_agent_runs` e teto | — | Sugestão aparece em até 8 s; assunto de risco para; teto pausa |
| 3C | Caixa de sugestão na conversa e painel do agente | — | Usar/Editar/Descartar gravam o estado; só o atendente vê |
| 3D | Captura de edição e lições candidatas com aprovação | — | Lição aprovada entra no contexto; dado pessoal removido |
| 3E | **Piloto de 2 semanas na SOS Vagas** e revisão com amostra | — | Relatório de uso, custo e descartes com decisão de continuar |
| 3F | Abrir para empresas clientes (agente por empresa, chave própria) | — | Isolamento validado com teste entre duas empresas |

Cada passo termina com tsc, eslint, build, testes, atualização deste
documento e do `PROJETO.md`, e só então publica.

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Resposta inventada | Só fonte aprovada; sem fonte, passa para humano; amostra revisada no piloto |
| Vazamento entre empresas | Contexto e notas por `company_id`; teste de isolamento no 3F |
| Injeção de prompt pela mensagem | Mensagem tratada como dado; guardrails fora do prompt do candidato |
| Custo | Teto por empresa; modelo econômico; registro por execução |
| Dependência de provedor | Provedor configurável por empresa; falha vira "sem sugestão", nunca bloqueia o inbox |
| Operador confiar demais | Mostrar a fonte; métrica de descarte; subir de nível só com evidência |

## 12. Perguntas (respondidas em 15/10/2026: F7 a F10 acima)

1. **Idioma e tom da SOS:** formal ou próximo? (define o roteiro inicial.)
2. **Quem aprova lições na SOS:** só o superadmin, ou a Priscilla também?
3. **Espelho no Obsidian:** quer a exportação das notas aprovadas para o seu
   vault da SOS já no 3D, ou depois do piloto?
4. **Horário de resposta:** a sugestão é gerada o dia todo ou só em horário
   comercial (relevante para custo e para a fase de envio automático)?

## 13. Estado de construção

### Passo 3A — construído (15/10/2026)

- **Migration `0032` aplicada:** `ai_agents`, `ai_knowledge_notes`, `ai_suggestions` e `ai_agent_runs`
  (RLS ligada, sem política pública).
- **Tela `Plataforma > Agente de IA`** (só superadmin): cadastro do agente da SOS Vagas (nome, tom,
  provedor, modelo, roteiro, ligado/desligado) e base de conhecimento (criar, editar, aprovar, arquivar,
  reabrir; filtro por tipo). Editar nota aprovada a devolve para rascunho (nova versão e nova aprovação).
- **Exportação para o Obsidian:** botão que baixa um `.zip` com as notas **aprovadas**, uma pasta por
  tipo, cabeçalho de propriedades e o roteiro do agente. Somente leitura (a fonte da verdade é o painel).
- **Dados iniciais:** agente "Assistente SOS Vagas" (formal, Groq, **desligado**) e 3 notas em rascunho
  (política global, FAQ do processo, primeira mensagem), para o Rodnei revisar e aprovar.
- **Ainda não faz:** gerar sugestões (3B), caixa na conversa (3C), aprendizado (3D). O agente ligado
  hoje não responde nada.

Auditoria: criação e edição do agente, criação/edição/aprovação/arquivamento de nota e exportação.
Nada de texto de candidato envolvido neste passo.

## 14. Pacote de skills de recrutamento e seleção: inventário (15/10/2026)

O Rodnei tem um pacote de skills de R&S. Recebidas até agora 8 (as demais
serão inventariadas conforme chegarem). Regra: o **conteúdo** vira
funcionalidade ou nota aprovada; a skill em si não roda dentro do app.

| Skill | Vira | Passo | Observações |
|---|---|---|---|
| `divulgacao-de-vaga` | **Gerador de divulgação** na vaga: texto pronto por canal (LinkedIn, Instagram, WhatsApp, portais, comunidades, interno), com 2 ganchos, briefing de arte e título otimizado para portal | 3N | Só redige (publicação é manual). Pergunta canal, perfil técnico/menos técnico e tom. Usa o link da vitrine pública com **marcador de origem por canal**, que alimenta a métrica de fontes (3M). Diagnóstico "vaga não atrai" aponta título, requisito inflado e canal errado |
| `triagem-de-curriculos` | **Módulo de triagem** na vaga: ranking com evidências, mini-parecer e corte sugerido | 3G | Critérios estruturados na vaga; pontuação no código; **triagem às cegas** (remover nome, foto, idade antes de enviar ao modelo); aviso de IA e direito à revisão (LGPD art. 20) |
| `roteiro-de-entrevista` | **Roteiro e scorecard** por vaga/candidato: perguntas STAR e situacionais, "o que observar", escala 1 a 4, parecer; exportar Word/PDF | 3H | Liga com Agenda/Entrevistas e com os "pontos a validar" da triagem; lista de perguntas proibidas aplicada no código |
| `devolutiva-candidatos` | **Devolutiva** de aprovação e reprovação, genérica ou com feedback, como rascunho na conversa | 3I | **Regra de envio precisa de ajuste:** hoje, depois da reprovação a candidatura deixa de estar "em andamento" e o envio é bloqueado. Propor exceção única de encerramento (devolutiva em até 30 dias da decisão), respeitando descadastro e black list |
| `testes-e-dinamicas` | **Biblioteca de avaliações** por vaga: prova técnica, português, matemática, raciocínio e dinâmicas, com folha do candidato, folha do aplicador, gabarito/rubrica 1 a 4 e export Word/PDF | 3J | Nunca teste psicológico ou de personalidade (privativo de psicólogo); sem trabalho gratuito; conteúdo neutro e acessível |
| `laudo-do-candidato` | **Laudo consolidado** por candidato: matching cargo × evidência com fonte, aderência 1 a 4, síntese e (opcional) recomendação; quadro comparativo e versão enxuta para o gestor; export Word/PDF | 3L | Fecha o funil: monta a partir dos resultados salvos da triagem, do roteiro e dos testes (montagem em código, a IA só sintetiza). **Modo A (só fatos) e Modo B (com recomendação) escolhidos a cada laudo.** Acesso só do atendente e da gestão; nunca ao candidato; sem avaliação psicológica |
| `metricas-rh` | **Indicadores de R&S ao vivo** no Estratégico/Visão geral, calculados dos dados da plataforma, com meta editável por empresa, status e recomendação | 3M | Nasce **sem planilha**: tempo de fechamento, SLA (prazo da vaga), funil e conversão, aceitação de proposta e fontes já saem do banco. Precisam de entrada manual: custo por contratação (campos de custo), NPS do processo (pesquisa) e turnover precoce (acompanhamento pós-contratação). Diversidade do funil **fora** (exigiria dado sensível) |
| `hunting` | **Rascunho de abordagem** (LinkedIn, e-mail, ligação) com ângulo e follow-up | 3K | Só redige; **não envia**. WhatsApp frio fica de fora: contraria a regra de consentimento e arrisca o número |

Regras comuns herdadas das skills: avaliar competência e nunca pessoa; só vale
o que está escrito; comportamental com confiança baixa e validação na
entrevista; sem critério discriminatório; a decisão é sempre da pessoa;
escala 1 a 4 comum a triagem, entrevista e testes.

**Encadeamento natural do funil:** triagem (3G) gera "pontos a validar" →
roteiro (3H) → testes (3J) → laudo (3L) → decisão → devolutiva (3I). A
abordagem (3K) fica no começo do funil, antes da triagem.

Ordem proposta: 3B (sugestão de resposta) → 3N (divulgação, ganho rápido: só
texto) → 3G → 3H → 3J → 3L → 3I → 3M → 3K.
Os resultados de cada módulo são gravados de forma estruturada (competência,
evidência, fonte, nota 1 a 4) para o laudo montar sem reler tudo.
