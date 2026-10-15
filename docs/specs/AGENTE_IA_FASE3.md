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

O Rodnei tem um pacote de skills de R&S. Recebidas até agora 10 skills e 1 modelo de uma décima primeira (as demais
serão inventariadas conforme chegarem). Regra: o **conteúdo** vira
funcionalidade ou nota aprovada; a skill em si não roda dentro do app.

| Skill | Vira | Passo | Observações |
|---|---|---|---|
| `job-description` | **Vaga estruturada**: gerador de JD a partir do recado do gestor (texto ou áudio transcrito), reescrita para atrair mais e cortar requisito inflado, modelos júnior e liderança | 3O | **Base de todo o funil:** a JD sai em campos (obrigatórios, desejáveis, comportamentais, eliminatórios, senioridade, modelo, faixa) que alimentam divulgação, triagem, roteiro, testes e laudo. Sem critério discriminatório; requisito inflado é sinalizado |
| `divulgacao-de-vaga` | **Gerador de divulgação** na vaga: texto pronto por canal (LinkedIn, Instagram, WhatsApp, portais, comunidades, interno), com 2 ganchos, briefing de arte e título otimizado para portal | 3N | Só redige (publicação é manual). Pergunta canal, perfil técnico/menos técnico e tom. Usa o link da vitrine pública com **marcador de origem por canal**, que alimenta a métrica de fontes (3M). Diagnóstico "vaga não atrai" aponta título, requisito inflado e canal errado |
| `mestre-de-match` | **Match em um passo** (modo do 3G): cola a vaga e os currículos, o sistema **extrai os critérios da própria JD**, mostra para ajuste e devolve ranking, pontos fortes, gaps e recomendação por candidato | 3G (modo) e 3O (extração) | Mesmas garantias da triagem (§14.13). Na plataforma o "colar" some: a vaga e os candidatos já estão lá, é um botão. Os critérios extraídos podem ser **salvos na vaga estruturada** com um clique |
| `triagem-de-curriculos` | **Módulo de triagem** na vaga: ranking com evidências, mini-parecer e corte sugerido | 3G | Critérios estruturados na vaga; pontuação no código; **triagem às cegas** (remover nome, foto, idade antes de enviar ao modelo); aviso de IA e direito à revisão (LGPD art. 20) |
| `roteiro-de-entrevista` | **Roteiro e scorecard** por vaga/candidato: perguntas STAR e situacionais, "o que observar", escala 1 a 4, parecer; exportar Word/PDF | 3H | Liga com Agenda/Entrevistas e com os "pontos a validar" da triagem; lista de perguntas proibidas aplicada no código |
| `devolutiva-candidatos` | **Devolutiva** de aprovação e reprovação, genérica ou com feedback, como rascunho na conversa | 3I | **Regra de envio precisa de ajuste:** hoje, depois da reprovação a candidatura deixa de estar "em andamento" e o envio é bloqueado. Propor exceção única de encerramento (devolutiva em até 30 dias da decisão), respeitando descadastro e black list |
| `testes-e-dinamicas` | **Biblioteca de avaliações** por vaga: prova técnica, português, matemática, raciocínio e dinâmicas, com folha do candidato, folha do aplicador, gabarito/rubrica 1 a 4 e export Word/PDF | 3J | Nunca teste psicológico ou de personalidade (privativo de psicólogo); sem trabalho gratuito; conteúdo neutro e acessível |
| `laudo-do-candidato` | **Laudo consolidado** por candidato: matching cargo × evidência com fonte, aderência 1 a 4, síntese e (opcional) recomendação; quadro comparativo e versão enxuta para o gestor; export Word/PDF | 3L | Fecha o funil: monta a partir dos resultados salvos da triagem, do roteiro e dos testes (montagem em código, a IA só sintetiza). **Modo A (só fatos) e Modo B (com recomendação) escolhidos a cada laudo.** Acesso só do atendente e da gestão; nunca ao candidato; sem avaliação psicológica |
| `metricas-rh` | **Indicadores de R&S ao vivo** no Estratégico/Visão geral, calculados dos dados da plataforma, com meta editável por empresa, status e recomendação | 3M | Nasce **sem planilha**: tempo de fechamento, SLA (prazo da vaga), funil e conversão, aceitação de proposta e fontes já saem do banco. Precisam de entrada manual: custo por contratação (campos de custo), NPS do processo (pesquisa) e turnover precoce (acompanhamento pós-contratação). Diversidade do funil **fora** (exigiria dado sensível) |
| `carta-oferta` (skill ainda **não recebida**; só o modelo do e-mail, §14.6) | **Carta-oferta** da aprovação: documento da proposta e e-mail de comunicação com a carta em anexo | 3P | Fica **depois** do laudo e **separada** da devolutiva de aprovação (que não é oferta vinculante). Exige revisão humana (e jurídica, quando houver condição ou valor) antes de sair |
| `hunting` | **Rascunho de abordagem** (LinkedIn, e-mail, ligação) com ângulo e follow-up | 3K | Só redige; **não envia**. WhatsApp frio fica de fora: contraria a regra de consentimento e arrisca o número |

Regras comuns herdadas das skills: avaliar competência e nunca pessoa; só vale
o que está escrito; comportamental com confiança baixa e validação na
entrevista; sem critério discriminatório; a decisão é sempre da pessoa;
escala 1 a 4 comum a triagem, entrevista e testes.

**Encadeamento natural do funil:** triagem (3G) gera "pontos a validar" →
roteiro (3H) → testes (3J) → laudo (3L) → decisão → devolutiva (3I). A
abordagem (3K) fica no começo do funil, antes da triagem.

Ordem proposta: 3B (sugestão de resposta) → **3O (vaga estruturada, é a base
dos módulos seguintes)** → 3N (divulgação) → 3G → 3H → 3J → 3L → 3I → 3M → 3K.
Os resultados de cada módulo são gravados de forma estruturada (competência,
evidência, fonte, nota 1 a 4) para o laudo montar sem reler tudo.

### 14.1 Casos de uso do pacote (arquivos "COMANDOS")

Cada skill do pacote vem com um arquivo de comandos de exemplo. Eles viram
**critérios de aceite** do módulo: o que o usuário precisa conseguir fazer sem
digitar prompt, só preenchendo campos.

**3H — Roteiro de entrevista** (recebido em 15/10/2026)

| # | Caso de uso | Campos do formulário |
|---|---|---|
| 1 | Roteiro completo por duração, competências e valores | duração (30, 45 ou 60 min), cargo, competências, valores da empresa |
| 2 | Perguntas situacionais (STAR e simulação) para competências escolhidas | competências (1 ou mais), tipo da pergunta |
| 3 | Roteiro com campo de anotações e parecer final, exportável em Word | modelo com anotações por pergunta, escala 1 a 4 e parecer; botão Word |
| 4 | Transformar os "pontos a validar" da triagem em perguntas | candidato com triagem salva (liga o 3G ao 3H) |
| 5 | Perguntas de fit cultural a partir dos valores | valores (lista) |

Os valores da empresa e as competências da vaga ficam **cadastrados uma vez**
(base de conhecimento e vaga) e são reaproveitados em triagem, roteiro, testes
e laudo, em vez de digitados a cada uso.

**3O — Job description** (recebido em 15/10/2026)

| # | Caso de uso | Campos do formulário |
|---|---|---|
| 1 | Criar a JD a partir do cargo, setor/porte, modelo e cidade | cargo, setor, porte, modelo (presencial, híbrido, remoto), cidade e UF |
| 2 | Transformar o recado do gestor em vaga estruturada | caixa de texto ou áudio (transcrição) |
| 3 | Reescrever uma JD para atrair mais e cortar requisitos inflados | JD atual; o sistema mostra o que cortou e por quê |
| 4 | JD de nível júnior, sem experiência prévia e com foco em potencial | opção "júnior/potencial" |
| 5 | JD de liderança com escopo de gestão e competências de liderança | tamanho do time, escopo, competências de liderança |

O áudio do gestor pode chegar pelo WhatsApp (já recebido e guardado); a
transcrição é passo posterior e usa o provedor de voz do cofre.

**3N — Divulgação de vaga** (recebido em 15/10/2026)

| # | Caso de uso | Campos do formulário |
|---|---|---|
| 1 | Post de LinkedIn a partir da JD | vaga (traz a JD), perfil técnico ou menos técnico |
| 2 | Adaptar a mesma vaga para vários canais de uma vez | seleção múltipla de canais (LinkedIn, WhatsApp, portal tipo Gupy); uma versão por canal |
| 3 | Anúncio de Instagram com legenda e briefing da arte | canal Instagram; saída em duas partes (legenda e briefing) |
| 4 | Diagnosticar "vaga não atrai" e reescrever | botão de diagnóstico na vaga; lista causas prováveis e reescreve |
| 5 | Texto para comunidade tech (Discord) com stack, remoto e faixa | canal comunidade; exige stack, modelo e faixa quando o perfil é técnico |

Reaproveita os campos da vaga estruturada (3O); só pergunta o que faltar.

**3G — Triagem de currículos** (recebido em 15/10/2026)

| # | Caso de uso | Campos do formulário |
|---|---|---|
| 1 | Ranquear candidatos da vaga por obrigatórios e desejáveis | vaga (traz os critérios da JD estruturada), currículos da vaga ou anexados |
| 2 | Comparar currículos com a JD e mostrar a evidência de cada um | saída com a frase do currículo que sustenta cada critério |
| 3 | Triar N currículos e devolver os 5 mais aderentes | limite de resultados ("top N") |
| 4 | Ranking exportado em planilha | botão Excel/CSV, só campos que o papel já enxerga |
| 5 | Quem atende os obrigatórios e quem falha em qual | visão por critério eliminatório, com o item que falhou |

Currículo já pode vir do cadastro do candidato (documentos do perfil) ou ser
anexado na hora. Escalar por vaga: uma triagem pode ter dezenas de currículos,
então roda em fila, com contagem de custo contra o teto antes de iniciar.

**3K — Abordagem ativa (hunting)** (recebido em 15/10/2026)

| # | Caso de uso | Campos do formulário |
|---|---|---|
| 1 | Abordagem de LinkedIn para um candidato | perfil colado, vaga (traz modelo e faixa) |
| 2 | InMail para um cargo sênior com 2 assuntos e sequência de follow-up | cargo; saída com 2 opções de assunto e follow-ups |
| 3 | Abordagem por e-mail no tom da empresa | perfil colado, tom (descontraído ou formal) |
| 4 | Roteiro de ligação para candidato passivo | canal "ligação"; saída em roteiro com espaço para a pessoa falar |
| 5 | Dois follow-ups curtos e educados quando não responde | botão "gerar follow-up" a partir da abordagem salva |

Só redige: copiar e enviar são ações manuais fora da plataforma. Os campos de
perfil colado são tratados como dado pessoal (finalidade única, sem guardar
além do necessário).

**3J — Testes e dinâmicas** (recebido em 15/10/2026)

| # | Caso de uso | Campos do formulário |
|---|---|---|
| 1 | Prova técnica do cargo com gabarito e critérios de correção | vaga (cargo e competências), tipo "prova técnica" |
| 2 | Dinâmica para uma competência, com instruções e grade de observação | competência-alvo; saída com folha do aplicador e grade 1 a 4 |
| 3 | Prova de português e raciocínio lógico calibrada à função | tipo "português" e "raciocínio"; nível exigido pela função |
| 4 | Case prático de até 1 h com rubrica 1 a 4 | tipo "case", tempo máximo (limite de 1 a 2 h, sem trabalho gratuito) |
| 5 | Dinâmica de grupo para N candidatos em 1 h (comunicação e colaboração) | nº de candidatos, duração, competências |

Toda proposta sai em duas folhas (candidato sem gabarito, aplicador com
gabarito/rubrica), exportável em Word/PDF. Teste psicológico ou de
personalidade não é gerado.

**3L — Laudo do candidato** (recebido em 15/10/2026)

| # | Caso de uso | Campos do formulário |
|---|---|---|
| 1 | Laudo só com os fatos (cargo exige × candidato se apresenta) | candidato e vaga; modo **A, só fatos** (sem recomendação) |
| 2 | Laudo com recomendação de contratação | modo **B**; pontos fortes, melhoria e nota da prova podem ser digitados quando não houver registro |
| 3 | Consolidar currículo, entrevista e teste num laudo único | busca automática do que já foi salvo em 3G, 3H e 3J; campo para anexar insumo externo |
| 4 | Quadro comparativo entre finalistas | seleção de 2 ou mais candidatos da vaga; saída em quadro por competência |
| 5 | Versão enxuta para o gestor | botão "resumo para o gestor" (só o essencial, sem dado de contato) |

O modo (A ou B) é escolhido a cada laudo e respeitado à risca; no modo A
nenhuma recomendação é gerada nem sugerida. Fonte e força da evidência
aparecem em cada linha. Exportação em Word/PDF.

**3I — Devolutiva ao candidato** (recebido em 15/10/2026)

| # | Caso de uso | Campos do formulário |
|---|---|---|
| 1 | Devolutiva de aprovação com os próximos passos | candidato aprovado, vaga, próximo passo e prazo |
| 2 | Reprovação genérica e respeitosa para quem parou na triagem | modo **genérico**; pode ir em lote com nome e vaga personalizados |
| 3 | Reprovação com feedback na fase final | modo **com feedback**; pontos fortes e de melhoria; tom da empresa (descontraído ou formal) |
| 4 | Roteiro de ligação para feedback de reprovado na fase final | canal "ligação"; roteiro com espaço para a pessoa falar |
| 5 | Mensagem curta de WhatsApp com aprovação e pedido de documentos | canal WhatsApp; lista de documentos da vaga |

**Regras de envio específicas (a implementar junto):**
- Exceção única de encerramento: depois da decisão a candidatura deixa de estar
  "em andamento", mas a devolutiva pode sair **uma vez, em até 30 dias**,
  respeitando descadastro e black list.
- No WhatsApp, a mensagem sai como rascunho na conversa; quem envia é o
  atendente. Lote só para o modo genérico e sempre com revisão.
- Feedback sensível de finalista: o sistema sugere ligação em vez de texto.

**3M — Métricas de R&S** (recebido em 15/10/2026)

| # | Caso de uso | Como entra no produto |
|---|---|---|
| 1 | Acompanhar SLA, custo por contratação e fontes | painel de indicadores no Estratégico; opcional baixar a planilha-modelo |
| 2 | Ajustar metas para quem contrata N pessoas por mês | metas editáveis por empresa, com sugestão a partir do volume mensal |
| 3 | Informar os números do mês e receber o que está fora da meta e o que fazer | formulário de entrada manual (custos, ofertas, saídas) + status e recomendação por métrica |
| 4 | Analisar fontes de contratação e onde investir para reduzir custo | quadro por fonte (origem da candidatura) com custo por contratação |
| 5 | Funil de seleção e maior gargalo | funil por etapa com conversão e destaque da maior queda |

Indicadores que saem sozinhos do banco: tempo de fechamento, SLA do prazo da
vaga, funil e conversão, aceitação de proposta e fontes (origem). Dependem de
entrada manual: custo por contratação, NPS do processo e turnover precoce.
Leitura sempre em conjunto (fechar rápido com turnover alto não é sucesso).

### 14.2 Briefing de entrada (modelo do pacote, 15/10/2026)

Cada skill tem um "BRIEFING" com a mesma estrutura de seis blocos. O primeiro
recebido (Job Description) é genérico e vale como molde para todos os módulos:

| Bloco do briefing | O que a plataforma já sabe | O que o usuário ainda informa |
|---|---|---|
| 1. Empresa e contexto | Empresa, porte e segmento (cadastro) | Momento e time envolvido |
| 2. Situação | Histórico da vaga e do funil | A dor, o que mudou e o que já foi tentado |
| 3. Dados disponíveis | Candidaturas, notas, agenda | Planilhas e políticas externas |
| 4. Objetivo | Etapa do funil em que está | Decisão que apoia, prazo e quem vai usar |
| 5. Restrições | Consentimento, black list, LGPD | Orçamento, aprovações, confidencialidade |
| 6. Entregável | Formato padrão do módulo | Nível (básico, intermediário, avançado) e observações |

**Decisão de produto:** o briefing não vira um formulário gigante. Cada módulo
pré-preenche o que já existe e mostra só os campos que faltam, com um bloco
opcional "Contexto adicional" para o resto. Nível básico, intermediário e
avançado controla a profundidade da saída (e o custo da geração).

### 14.3 Ficha de parecer da entrevista (modelo recebido em 15/10/2026)

Define o **registro estruturado** que o 3H grava ao fim de cada entrevista e
que o laudo (3L) lê depois:

| Campo | Regra |
|---|---|
| Candidato e cargo | Vêm da candidatura (não digitados) |
| Competência 1..N | Nota **1 a 4** (1 Não atende, 2 Parcial, 3 Atende, 4 Supera) e **evidência** (texto obrigatório quando a nota é 1 ou 4) |
| Fit cultural | Nota 1 a 4 e evidência, avaliado por comportamento observado |
| Pontos fortes e pontos de atenção | Texto livre, ligados a evidência |
| Recomendação | **Avançar**, **Com ressalva** ou **Não avançar**, com o "por quê" obrigatório |

Observações de modelagem:

- A recomendação da entrevista (avançar na seleção) é **diferente** da do
  laudo (contratar): são dois registros em momentos distintos. O laudo cita a
  ficha como fonte, não a copia.
- Gravada em tabela própria (`interview_scorecards`: candidatura, entrevistador,
  itens com competência, nota e evidência, fit, fortes, atenção, recomendação,
  motivo). Vai na migration do passo 3H.
- Acesso: só o entrevistador e a gestão; o candidato nunca vê. O texto é
  evidência de comportamento, sem característica pessoal.

### 14.4 Sequência de follow-up (modelo recebido em 15/10/2026)

Modelo padrão do 3K, usado como base editável (nunca texto fixo):

| Passo | Quando | Intenção | Texto-base |
|---|---|---|---|
| Follow-up 1 | cerca de 3 dias depois | Lembrar, sem pressão, e oferecer a conversa curta | "Oi, {nome}, só subindo minha mensagem. Se tiver curiosidade, te conto os detalhes em 15 min." |
| Follow-up 2 | cerca de 1 semana depois | Encerrar com elegância, deixar a porta aberta e pedir indicação | "{nome}, vou encerrar por aqui para não te incomodar. Se em algum momento fizer sentido, minha porta fica aberta, e se conhecer alguém para essa vaga, agradeço a indicação!" |

Regras de produto:

- Máximo de **2 follow-ups** por abordagem; depois o contato fica marcado como
  "encerrado" e a plataforma não sugere novo contato sobre a mesma vaga.
- A plataforma **lembra** a data (card em "Precisa de ação agora"), mas quem
  envia é a pessoa, fora do sistema.
- Quem responder "não" ou pedir para parar é marcado como não contactar;
  nenhum follow-up é gerado.
- Personalização obrigatória: o `{nome}` e um detalhe do perfil, para o texto
  não parecer disparo em massa.

### 14.5 Modelos de devolutiva de reprovação (recebidos em 15/10/2026)

Bases editáveis do 3I; os campos `{...}` vêm da candidatura, nunca digitados à mão.

| Versão | Quando usar | Texto-base |
|---|---|---|
| Genérica | Parou na triagem ou grande volume | "Olá, {nome}, obrigado(a) por participar do processo para {cargo}. Desta vez seguimos com outro perfil, mas foi um prazer te conhecer. Desejo sucesso e espero te reencontrar em uma próxima oportunidade. Abraço, {recrutador}." |
| Com feedback | Finalista ou quem investiu mais no processo | "Olá, {nome}, obrigado(a) pelo tempo dedicado ao processo para {cargo}. Não seguiremos desta vez. Como pontos fortes, destaco {fortes}. Como próximo passo de desenvolvimento, {melhoria} ampliaria bastante seu leque. Isso não invalida seu potencial: foi o fit com esta vaga específica. Fico à disposição. {recrutador}." |

Regras de produto:

- **Campos obrigatórios da versão com feedback:** `{fortes}` e `{melhoria}` vêm da
  ficha de parecer (14.3) ou são digitados; sem eles o sistema oferece só a
  genérica, em vez de inventar feedback.
- "Espero te reencontrar" é fórmula leve e fica; **promessa concreta** ("vamos
  guardar seu currículo", "vamos te chamar") só entra se o recrutador marcar
  que é verdade (campo "banco de talentos").
- **Genérica em lote:** gera uma mensagem por pessoa com nome e vaga, mostra
  todas para revisão e libera o envio uma a uma pelo atendente.
- A mensagem passa pela regra de envio de encerramento (um envio em até 30
  dias, respeitando descadastro e black list).

### 14.6 E-mail de comunicação da aprovação, com a carta-oferta em anexo (modelo recebido em 15/10/2026)

Pertence a um módulo de **carta-oferta** (3P), cuja skill ainda não chegou.
Modelo-base do e-mail:

> **Assunto:** Sua proposta na {empresa}
> Olá, {nome}! Foi ótimo ter você no processo. Segue em anexo a carta-oferta
> para a vaga de {cargo}. Fico à disposição para conversar sobre qualquer
> ponto. Podemos falar até {data}? Abraço, {recrutador}

Regras de produto já definidas a partir do modelo e do que o pacote diz:

- A carta-oferta é o documento **vinculante**; a devolutiva de aprovação (3I)
  **não** traz valores nem condições. Por isso são módulos separados.
- Campos do e-mail vêm da candidatura (`empresa`, `nome`, `cargo`,
  `recrutador`); `data` (prazo de resposta) é obrigatório.
- O anexo é gerado e **revisado por uma pessoa antes do envio**; o sistema não
  envia carta-oferta sozinho. Valores e condições vêm da vaga estruturada (3O)
  e da proposta aprovada, nunca inventados pelo modelo.
- Registro no funil: "proposta enviada" com data e prazo de resposta, o que
  alimenta o indicador de aceitação de oferta (3M).
- **Pendente:** receber a skill de carta-oferta para detalhar campos, tipos de
  contratação (CLT, PJ, temporário) e cláusulas.

### 14.7 Relatório mensal de indicadores (modelo recebido em 15/10/2026)

Saída do módulo 3M. Gerado por empresa e por mês, com os números montados em
código e só o texto de análise escrito pela IA:

| Bloco | Conteúdo | Origem |
|---|---|---|
| Cabeçalho | Mês e ano | Seleção do período |
| Volume e tempo | Vagas fechadas; tempo médio de fechamento com a meta | Banco (vagas e candidaturas) |
| Qualidade do processo | SLA; taxa de efetivação; custo por contratação | SLA e efetivação do banco; **custo** de entrada manual |
| Candidato e retenção | Aceitação de oferta; turnover precoce; NPS do processo | Aceitação do banco; **turnover** e **NPS** de entrada manual ou pesquisa |
| Fontes | Principal fonte de contratação e o percentual | Origem da candidatura |
| Análise | Destaques do mês, pontos de atenção e ações para o próximo mês | Texto da IA a partir dos números, revisado por pessoa |

Regras de produto:

- Indicador sem dado aparece como **"sem dado"**, nunca como zero, para não
  fingir resultado. O relatório avisa quais campos manuais faltaram.
- Meta ao lado de cada indicador, editável por empresa (3M).
- "Ações para o próximo mês" ligam cada ponto de atenção a uma ação concreta e
  são sugestão: a pessoa edita antes de salvar.
- Exportável em PDF e imprimível; para a SOS Vagas, é o relatório que serve de
  prestação de contas ao cliente (leitura por empresa, sem misturar clientes).
- Leitura em conjunto: o texto da análise precisa cruzar indicadores (ex.:
  fechamento rápido com turnover precoce alto).

### 14.8 Plano de ação a partir das métricas (modelo recebido em 15/10/2026)

Fecha o ciclo do 3M: indicador fora da meta vira ação com dono e prazo.

| Campo | Regra |
|---|---|
| Indicador fora da meta | Preenchido pelo sistema (indicador, valor e meta), por exemplo "SLA 75% vs meta 90%" |
| Causa provável | Sugestão da IA a partir dos números cruzados; a pessoa confirma ou troca |
| Ação definida | Texto livre, com sugestões prontas por indicador |
| Responsável e prazo | Pessoa da equipe (da carteira) e data; vira lembrete em "Precisa de ação agora" |
| Como vou medir a melhora | Indicador e meta, já ligados ao painel; o sistema mostra a evolução no mês seguinte |

Registro em tabela própria no passo 3M (plano de ação: indicador, valor e meta
no momento, causa, ação, responsável, prazo, indicador de acompanho, estado
aberta, em andamento, concluída ou cancelada). O relatório mensal (14.7) lista
os planos abertos e o resultado dos concluídos. Plano concluído sem melhora do
indicador aparece sinalizado, para revisar a ação em vez de repetir.

### 14.9 Modelo do laudo, matching cargo × candidato (recebido em 15/10/2026)

Estrutura fixa do documento do 3L; cada bloco tem origem definida:

| Bloco | Conteúdo | Origem |
|---|---|---|
| Cabeçalho | Candidato e cargo | Candidatura |
| Fontes | Lista do que foi usado (currículo, entrevista, teste, dinâmica) | Registros salvos em 3G, 3H e 3J; o que não existe aparece como "não avaliado" |
| Resumo do perfil | 3 a 5 linhas, **só fatos** | IA a partir das evidências, sem adjetivo nem personalidade |
| Quadro de matching | Competência, o que o cargo exige, como o candidato se apresenta (evidência e fonte) e aderência 1 a 4 | Competências da vaga estruturada (3O) cruzadas com a ficha da entrevista (14.3) |
| Fit cultural | Evidência e nota 1 a 4 | Ficha da entrevista |
| Fortes, a validar, divergências | Três listas | Montagem em código: divergência aparece quando duas fontes dão notas muito diferentes para a mesma competência |
| Recomendação | Contratar, Com ressalva ou Não contratar, **com o porquê** | **Só se solicitada** (modo B); no modo A o bloco nem existe |

Regras:

- Cada linha do quadro mostra a **fonte** e a **força da evidência** (por
  exemplo "só relato de entrevista, sem teste").
- Sem evidência para uma competência, a linha diz "Não avaliado" e sugere como
  avaliar, em vez de preencher.
- Recomendação "Com ressalva" exige o campo de condições; "Não contratar"
  exige justificativa ligada a competência, nunca a característica pessoal.
- O laudo é imutável depois de **assinado** pelo recrutador (nova versão em vez
  de edição), para sustentar a decisão depois.

### 14.10 Modelo do roteiro por competências (recebido em 15/10/2026)

Estrutura do documento gerado pelo 3H; cada bloco vira um item no roteiro e
cada **Avaliação** e **Anotações** alimenta a ficha de parecer (14.3):

| Bloco | Conteúdo | Observações |
|---|---|---|
| Cabeçalho | Cargo, candidato, data, entrevistador | Vêm da candidatura e da agenda |
| Abertura | Acolher, explicar o fluxo e a duração | Texto-base editável |
| Aquecimento | Uma pergunta leve sobre a trajetória | Exatamente uma |
| Competência (repete por competência) | Nome, tipo (STAR ou situacional), pergunta, "o que observar", anotações e avaliação 1 a 4 | Competências vêm da vaga estruturada (3O); 4 a 6 por roteiro, calibradas pela duração |
| Fit cultural (por valor) | Valor, tipo, pergunta, anotações e avaliação 1 a 4 | Valores vêm da base de conhecimento da empresa; pergunta sempre de comportamento |

Regras:

- Toda pergunta traz competência ou valor, tipo e "o que observar"; sem isso
  o item não é gerado.
- A pergunta STAR traz as sondagens de situação, tarefa, ação e resultado.
- Perguntas sobre tema proibido (família, idade, religião, saúde sem relação
  com a função) nunca são geradas: lista aplicada em código, não só no prompt.
- O campo de avaliação e as anotações são preenchidos **na própria tela**
  durante a entrevista, e a ficha final sai pronta, sem redigitar.

### 14.11 Checklist da job description: verificação antes de publicar (recebido em 15/10/2026)

Vira a **verificação de qualidade da vaga** (3O), mostrada antes de publicar,
com cada item marcado como verde, aviso ou bloqueio:

| Item do checklist | Como o sistema verifica | Tipo |
|---|---|---|
| Perfil alinhado com o gestor (o que a pessoa vai fazer) | Campo "rotina do dia a dia" preenchido, com confirmação manual | Manual |
| Obrigatórios (4 a 7) separados dos desejáveis | Contagem dos campos: menos de 4 ou mais de 7 gera aviso | **Código** |
| Sem exigência "fantasma" (inglês, diploma, viagem) | A IA sinaliza exigência sem ligação com as tarefas escritas; pessoa decide | IA + pessoa |
| Experiência calibrada à senioridade | Regra simples: anos pedidos × nível escolhido; faixa fora do usual gera aviso | **Código** |
| Responsabilidades concretas, sem clichê | Lista de clichês ("proativo", "dinâmico", "perfil de dono") detectada no texto | **Código** |
| Linguagem neutra em gênero | Detecção de marcas de gênero no título e no texto (por exemplo "o candidato") com sugestão | **Código** |
| Sem critério discriminatório | Lista de termos (idade, sexo, estado civil, aparência, "boa aparência") **bloqueia** a publicação | **Código, bloqueante** |
| Modelo, regime, local e faixa claros | Campos obrigatórios; faixa ausente gera aviso (não bloqueio) | **Código** |
| Diferencial claro | Campo "por que esta vaga" preenchido | Código |
| Título é o que o candidato busca | Título comparado com uma lista de cargos comuns; título "criativo" gera aviso | Código + IA |

Regras:

- **Bloqueante:** critério discriminatório e campo obrigatório vazio.
  **Aviso:** o resto; a pessoa publica assumindo.
- A verificação roda também na reescrita da JD (caso de uso 3 do 3O) e no
  diagnóstico "vaga não atrai" do 3N.
- O resultado fica registrado com a vaga (quem publicou com aviso e quais),
  para o relatório e para auditoria.

### 14.12 Checklist da divulgação: verificação antes de publicar (recebido em 15/10/2026)

Roda sobre cada texto gerado pelo 3N, por canal, com os mesmos níveis do
14.11 (verde, aviso, bloqueio):

| Item do checklist | Como o sistema verifica | Tipo |
|---|---|---|
| Canal certo para o perfil | Aviso quando o canal destoa do perfil (por exemplo vaga técnica só em canal operacional) | Código |
| Tom adequado ao perfil e à cultura | A IA confere o texto contra o tom cadastrado da empresa; pessoa decide | IA + pessoa |
| Gancho na primeira linha (redes) | Primeira linha dentro do limite do feed e sem abertura genérica | Código |
| Título claro e buscável (portais) | Título sem adjetivo "criativo" e dentro do limite do portal | Código |
| CTA claro e de baixo atrito | Detecta a presença de uma chamada única (um CTA só) | Código |
| Transparência de modelo, regime e faixa | Campos da vaga presentes no texto; faixa ausente em perfil técnico gera aviso | Código |
| Formato adequado ao canal | Portal sem markdown; WhatsApp curto; LinkedIn com respiro e link nos comentários | **Código** |
| Sem critério discriminatório | Mesma lista do 14.11; **bloqueia** | **Código, bloqueante** |
| Hashtags e arte quando o canal pede | Hashtags presentes; briefing da arte no Instagram | Código |
| Link ou forma de candidatura testado | O sistema valida que o link responde (vitrine pública, com marcador de origem) e avisa se não | **Código** |

Regras:

- Limites por canal ficam em uma tabela de configuração (tamanho, markdown,
  hashtags), para ajustar sem mexer em código.
- A verificação de link usa a URL da vitrine pública com o marcador de origem
  do canal, que alimenta a métrica de fontes (3M).
- Texto que passa com aviso fica registrado com quem aprovou, como na vaga.

### 14.13 Checklist da triagem: garantias do módulo 3G (recebido em 15/10/2026)

Aqui o checklist deixa de ser conferência manual e vira **garantia do
próprio módulo**: cada item é imposto pelo sistema, e o que não puder ser
imposto aparece como aviso na tela do ranking.

| Item do checklist | Garantia no produto | Como |
|---|---|---|
| Critérios da vaga definidos | Triagem **não inicia** sem obrigatórios, desejáveis e eliminatórios na vaga estruturada | Código, bloqueante |
| Só competência ligada ao trabalho | O modelo recebe apenas campos de trabalho (experiência, ferramentas, formação, idiomas, resultados) | Código |
| Ignorar gênero, idade, foto, estado civil, origem e nome | Esses dados são **removidos antes** de ir ao modelo (triagem às cegas); nome volta só na tela, com um identificador estável | **Código** |
| Evidência em cada avaliação | A resposta do modelo precisa trazer a frase de origem; avaliação sem evidência é descartada e vira "não evidenciado" | Código |
| "Não mencionado" ≠ "não tem" | Estado próprio "não evidenciado", diferente de "não atende" | Código |
| Marcar quem não atende obrigatório eliminatório | Pontuação no código: eliminatório não atendido vai ao fim, com o motivo | **Código** |
| Lacunas e trocas de emprego como "a validar" | Entram só na coluna "a validar"; nunca reduzem a nota | Código |
| Comportamental como ponto a validar | Competência comportamental sai com confiança baixa e vai para a lista de pontos a validar na entrevista (3H) | Código |
| Ranking mostra a evidência por trás de cada posição | Linha expansível com a frase do currículo em cada critério | UI |
| Corte de quem avança definido | O recrutador marca o corte; a plataforma só **sugere** | Pessoa decide |

Observações de projeto:

- Por segurança, o sistema nunca diz "reprovado": o estado é "não segue para
  entrevista, por motivo X", decisão da pessoa e registrada.
- O ranking tem **revisão humana obrigatória** antes de qualquer mudança de
  etapa (direito de revisão da pessoa, LGPD art. 20).
- Os dez itens são a base do teste de aceite do 3G: cada um vira um caso de
  teste automatizado com currículos sintéticos.

### 14.14 Checklist da abordagem ativa: verificação antes de enviar (recebido em 15/10/2026)

Aplicado a cada rascunho do 3K, com os níveis verde, aviso e bloqueio:

| Item do checklist | Como o sistema verifica | Tipo |
|---|---|---|
| Um ângulo atrativo escolhido | A IA mostra o ângulo escolhido e o trecho do perfil que o sustenta; pessoa confirma | IA + pessoa |
| Começa pela pessoa, não pela vaga | Primeira frase referencia o perfil antes de citar o cargo | Código |
| Personalização real | A mensagem precisa conter ao menos um detalhe do perfil informado; sem isso, aviso | Código |
| Transparência: cargo, modelo e faixa | Campos da vaga presentes no texto; faixa ausente em perfil técnico gera aviso | Código |
| CTA de baixo atrito | Um único convite à conversa curta; pedido de currículo na primeira mensagem gera aviso | Código |
| Curto e adequado ao canal | Nota de conexão do LinkedIn com cerca de 300 caracteres como limite; InMail e e-mail com tamanho de leitura no celular | **Código** |
| Só informação profissional pública | O perfil colado é filtrado de dado pessoal (família, endereço, saúde); texto que cita tema pessoal **bloqueia** | **Código, bloqueante** |
| Sem falar mal do empregador atual | Lista de termos negativos junto ao nome da empresa atual; aviso | Código |
| 1 ou 2 follow-ups preparados | A sequência (14.4) é gerada junto, com datas | Código |
| Porta aberta para o "não" e indicação | Fechamento com abertura para recusa e pedido de indicação presente | Código |

Regras adicionais:

- **Sem envio automático:** o sistema entrega o texto e o lembrete; a pessoa
  envia fora da plataforma.
- **Base legal e finalidade:** o perfil colado serve só a esta abordagem; o
  rascunho guarda apenas o necessário e é descartado ao encerrar a
  abordagem (máximo de 2 follow-ups).
- **WhatsApp frio fica fora**, como já decidido: a regra de consentimento
  vale também para o canal.

### 14.15 Checklist da entrevista: preparação e condução (recebido em 15/10/2026)

Divide-se em duas verificações do 3H: **antes** (ao gerar o roteiro) e
**depois** (ao fechar a ficha de parecer).

| Item do checklist | Quando | Como o sistema garante |
|---|---|---|
| 4 a 6 competências definidas | Gerar | Aviso fora da faixa; sugere as de maior peso da vaga estruturada |
| Mistura de STAR e situacional | Gerar | O gerador distribui os dois tipos; roteiro só com um tipo gera aviso |
| Cada pergunta sinaliza a competência | Gerar | Pergunta sem competência não é gerada |
| Fit por valor, pedindo comportamento | Gerar | Pergunta de valor sempre em formato de comportamento (nunca "você valoriza...?") |
| Pontos a validar da triagem | Gerar | Puxados da triagem salva (3G) e transformados em perguntas |
| Roteiro cabe no tempo | Gerar | Cálculo por duração (por exemplo 45 min comporta 6 a 8 perguntas); excesso gera aviso |
| "O que observar" para o mesmo critério | Gerar | Campo obrigatório em cada pergunta |
| Anotações e escala 1 a 4 prontos | Gerar | Presentes por item na tela de condução |
| Não perguntar sobre filhos, idade, estado civil ou religião | Gerar | Lista aplicada em código; pergunta proibida é removida e o motivo aparece |
| Espaço do candidato e próximos passos | Gerar | Bloco final fixo no roteiro |
| Todas as competências avaliadas e com evidência | Fechar ficha | Ficha não fecha com competência sem nota; nota 1 ou 4 exige evidência |
| Recomendação com o "por quê" | Fechar ficha | Obrigatório (14.3) |

Regra de consistência: o **mesmo roteiro** é usado para todos os candidatos de
uma vaga (para comparar de forma justa); alterações viram nova versão do
roteiro, com registro de quais entrevistas usaram cada versão.

### 14.16 Checklist de testes e dinâmicas: instrumento válido e justo (recebido em 15/10/2026)

Verificação do 3J antes de liberar o instrumento para aplicação:

| Item do checklist | Como o sistema garante | Tipo |
|---|---|---|
| Competência-alvo definida antes de desenhar | Não gera sem competência-alvo escolhida | Código, bloqueante |
| Mede de fato a competência | Cada questão e atividade aponta a competência que mede; sem vínculo, é removida | Código + IA |
| Relevante para a função | Compara o conteúdo com as tarefas da vaga estruturada; conteúdo sem ligação gera aviso | IA + pessoa |
| Esforço proporcional (sem trabalho grátis) | Tempo estimado limitado (case até 1 a 2 h); entrega aproveitável pela empresa gera aviso | Código |
| Conteúdo neutro e acessível (PcD) | Lista de temas sensíveis (religião, política) bloqueia; campo de adaptações para PcD na folha do aplicador | Código + pessoa |
| Gabarito ou rubrica 1 a 4 | Obrigatório; sem ele não libera | Código, bloqueante |
| Dinâmica sem pegadinha, exposição ou humilhação | Lista de formatos proibidos (confissão de defeitos, constrangimento, pressão deliberada); aviso e remoção | Código |
| Grade de observação por nível | Obrigatória em dinâmica, com comportamento nos níveis 1 a 4 | Código, bloqueante |
| Folha do candidato separada da do aplicador | Dois documentos distintos; o do candidato nunca contém gabarito | **Código** |
| Sem teste psicológico sem psicólogo | Tipos de teste de personalidade, perfil e projetivo **não existem** no sistema | Código, bloqueante |

Regras:

- O instrumento aprovado fica versionado e **reaproveitável** por vaga
  semelhante, com a rubrica; nota de cada candidato é registrada em formato
  estruturado (competência, nota 1 a 4) para alimentar o laudo (3L).
- Resultados são sempre pela rubrica; nunca texto livre sem escala.

### 14.17 Checklist do laudo: garantias do módulo 3L (recebido em 15/10/2026)

| Item do checklist | Garantia no produto | Tipo |
|---|---|---|
| Tipo de laudo confirmado (só fatos × recomendação) | Escolha obrigatória antes de gerar; no modo A o bloco de recomendação não existe | Código, bloqueante |
| Insumos reunidos | Lista automática do que há (3G, 3H, 3J, referências anexadas); laudo com poucos insumos mostra a limitação no topo | Código |
| Matching competência a competência | Uma linha por competência da vaga, na ordem da vaga estruturada | Código |
| Evidência e fonte em cada afirmação | Linha sem evidência e fonte não é emitida; vira "não avaliado" | Código, bloqueante |
| "Não avaliado" quando falta evidência | Estado próprio com sugestão de como avaliar | Código |
| Divergências entre fontes apontadas | Notas muito diferentes para a mesma competência entre fontes geram item em "divergências", sem escolher versão | Código |
| Só competência ligada ao trabalho | Campos de entrada limitados a dados de trabalho; sem dado sensível (idade, gênero, foto) | Código |
| Sem conclusão psicológica nem leitura de personalidade | Termos e conclusões desse tipo são filtrados e a saída é revisada por regra | Código + IA |
| Recomendação apoiada na evidência | A justificativa só pode citar linhas do quadro; citação inexistente invalida a recomendação | Código |
| Tom profissional e neutro | Revisão de tom antes de salvar; adjetivos valorativos sinalizados | IA + pessoa |

Fechamento: laudo **assinado** pelo recrutador é imutável (nova versão em vez de
edição) e fica acessível só ao atendente e à gestão. O candidato nunca recebe
o laudo; para ele existe a devolutiva (3I).

### 14.18 Checklist da devolutiva: verificação antes de enviar (recebido em 15/10/2026)

| Item do checklist | Como o sistema garante | Tipo |
|---|---|---|
| Aprovado ou reprovado; genérica ou com feedback | Escolha obrigatória antes de gerar; feedback exige pontos fortes e de melhoria | Código, bloqueante |
| Personalizada com nome e vaga | Campos vêm da candidatura; mensagem sem nome ou vaga não é liberada | Código, bloqueante |
| Feedback proporcional à etapa | A etapa em que a pessoa parou define a versão sugerida (triagem: genérica; finalista: com feedback) | Código |
| Melhoria construtiva e acionável, nada pessoal | Termos pessoais e depreciativos sinalizados; sugestão de reescrita acionável | Código + IA |
| Feedback baseado em evidência do processo | Só usa pontos vindos da ficha de parecer (14.3) ou digitados pela pessoa; sem eles, só a genérica | Código |
| Sem critério discriminatório | Mesma lista do 14.11; **bloqueia** | **Código, bloqueante** |
| Sem falsa esperança nem promessa vazia | Promessa de guardar o currículo só entra com o campo "banco de talentos" marcado | Código |
| Tom respeitoso | Revisão de tom; texto seco ("Infelizmente não foi selecionado. Att.") gera aviso | IA + pessoa |
| Aprovado: próximos passos e prazo claros | Campos "próximo passo" e "prazo" obrigatórios na aprovação | Código, bloqueante |
| Feedback delicado de finalista por conversa | Para finalista com feedback, o sistema sugere **ligação** primeiro e gera o roteiro (caso 4 do 3I) | Código |

A exceção de envio de encerramento (um envio em até 30 dias, respeitando
descadastro e black list) é verificada **antes** de liberar o envio.

### 14.19 Checklist de métricas e fechamento: acompanhar e melhorar (recebido em 15/10/2026)

| Item do checklist | Como o produto garante | Tipo |
|---|---|---|
| Indicadores do período com dados reais | Automáticos vêm do banco; manuais mostram "sem dado" até serem preenchidos | Código |
| Comparar com a meta | Meta ao lado de cada indicador, com status verde, atenção ou abaixo | Código |
| Ler em conjunto | A análise cruza pares conhecidos (fechamento rápido com turnover alto; custo baixo com NPS baixo) e os destaca | IA + regras |
| Maior gargalo do funil | Destaque da etapa com maior queda de conversão | Código |
| Fonte com mais contratações por menor custo | Quadro por fonte com contratações e custo; ordenação por eficiência | Código |
| 1 a 3 ações com responsável e prazo | Plano de ação (14.8) limita a 3 ações abertas por período e exige responsável e prazo | Código |
| Metas ajustadas à realidade | Metas editáveis por empresa e histórico de mudanças | Código |
| Diversidade só para equidade, nunca para excluir | **Fora do escopo inicial.** Se habilitada: dado voluntário, com consentimento específico, **só agregado**, nunca visível por candidato nem usado em triagem | Decisão pendente |
| Comunicar à liderança | Relatório mensal (14.7) em PDF, com botão de envio para o gestor | Código |
| Registrar o que funcionou | Campo "o que funcionou" ao concluir um plano de ação, que alimenta a base de conhecimento (lição candidata, 3D) | Código |

**Reconciliação sobre diversidade:** o checklist aceita a métrica desde que seja
só de equidade. Como ela exige coletar dado pessoal sensível (LGPD), fica fora
da primeira entrega e só entra com decisão explícita do Rodnei, desenho de
consentimento próprio e apenas em formato agregado.

### 14.20 Mestre de match: match em um passo (skill recebida em 15/10/2026)

Relação com os módulos já planejados: **não é um módulo novo**, é um segundo
modo do 3G que reaproveita a extração de critérios do 3O.

| Aspecto | Triagem com critérios (3G) | Match em um passo |
|---|---|---|
| Critérios | Já estruturados na vaga (3O) | Extraídos da JD colada ou da vaga cadastrada |
| Confirmação | Não precisa | Mostra os critérios em duas linhas para ajuste antes de ranquear |
| Quando usar | Vaga já cadastrada e padronizada | Vaga nova, recado do gestor ou JD solta |

Saída (formato da skill, mantido):

| Parte | Conteúdo |
|---|---|
| Critérios extraídos | Obrigatórios, desejáveis e comportamentais, com o que for eliminatório marcado e as **suposições** sinalizadas quando a JD for vaga |
| Ranking | Posição, candidato, aderência (alta, média, baixa), obrigatórios x/y e resumo de uma linha |
| Por candidato | Pontos fortes (com evidência do currículo), gaps (separando "não tem" de "não evidenciado") e recomendação **Entrevistar, Entrevistar com ressalva ou Não avançar**, com o porquê |
| Sugestão de corte | Sempre como sugestão; a decisão é da pessoa |
| Ações | Exportar em planilha e gerar perguntas de entrevista para os gaps de cada candidato (liga ao 3H) |

Regras próprias deste modo:

- A **recomendação do match** (entrevistar) é de triagem e é distinta da
  recomendação da ficha da entrevista (avançar) e da do laudo (contratar): três
  registros, três momentos.
- Critérios extraídos pela IA **só valem depois de confirmados** pela pessoa;
  a confirmação fica registrada, e pode ser salva como critérios da vaga.
- Currículo ilegível é listado como "não foi possível ler" e não entra no
  ranking, sem chute.
- Valem os dez itens do §14.13 (triagem às cegas, evidência obrigatória,
  eliminatório no código, revisão humana antes de mudar etapa).

### Passo 3B construído (15/10/2026): sugestão de resposta nas conversas

**O que faz**
- Ao chegar mensagem de **texto de candidato**, o webhook responde primeiro e,
  depois (`after`), pede a sugestão ao provedor do agente (Groq por padrão;
  OpenAI e Claude também). O recebimento nunca espera a IA.
- Só gera quando: agente da empresa **ligado**; conversa com candidato; sem
  descadastro nem black list; teto do mês não atingido.
- Contexto enviado: notas **aprovadas**, roteiro, a vaga em andamento do
  candidato (nunca vaga confidencial) e as últimas 8 mensagens como **dado**.
  Sem nome nem telefone do candidato no prompt.
- **Paradas sem chamar a IA:** assunto de risco (jurídico, saúde, ameaça, dados
  pessoais, reclamação) → "responda você"; sem fonte; teto mensal.
- **Caixa "Sugestão do assistente"** acima do campo de envio, só para o
  atendente da conversa: **Usar**, **Editar** (preenchem o texto) e
  **Descartar**. Ao enviar, o sistema registra **usada** (texto igual) ou
  **editada** (texto diferente), com o texto final.
- **Painel do agente:** sugestões do mês, usadas sem edição, editadas,
  descartadas, paradas, tokens e custo estimado contra o teto.

**Limites conhecidos**
- Custo é **estimativa** por tabela de preço; o oficial é o do provedor.
- Áudio, imagem e documento ainda não geram sugestão (transcrição é passo
  posterior).
- O nome padrão do modelo (`llama-3.3-70b-versatile` no Groq) pode precisar de
  ajuste no campo "Modelo" do agente se o provedor mudar a lista.
- Não testado com mensagem real de candidato no momento da publicação; o
  agente nasce **desligado**, até o Rodnei aprovar as notas e ligar.

**Código:** `src/lib/agente.ts` (regras puras), `src/lib/agente-servidor.ts`
(geração), `conversas/caixa-sugestao.tsx`, ajustes em `formulario-envio.tsx`,
`actions.ts` e no webhook. Sem migration nova (tabelas da 0032).

### Correção do 3B (15/10/2026): quem recebe sugestão

Primeiro teste real do Rodnei: o agente estava ligado e não gerou nada.
Causas confirmadas no banco: (1) as 4 conversas eram de contatos **sem
candidato vinculado** e o 3B só gerava para candidato; (2) as 3 notas iniciais
ainda estavam em **rascunho**, e sem nota aprovada a resposta é "sem fonte".

Regra ajustada: **contato desconhecido também recebe sugestão** (o número da
operação é canal de entrada de quem ainda não é candidato), com contexto só das
notas aprovadas. Continuam de fora: empresa cliente cadastrada (responsável ou
telefone), descadastro e black list. A sugestão pronta aparece em modo leitura
enquanto a conversa está na fila; para usar, assuma a conversa.

Lição de processo: todo passo termina com um **teste com mensagem real** e a
lista do que precisa estar ligado (agente ligado, notas aprovadas, conversa
assumida) escrita na entrega.

### Passo 3O, primeira entrega (15/10/2026): vaga estruturada

- **Migration `0033`:** `jobs.criterios` (jsonb, aditiva). `regras` segue como o
  conteúdo mostrado ao candidato.
- **Tela `Admin > Vagas > Critérios e qualidade`** (por vaga, respeita carteira
  e sigilo): rotina, obrigatórios (linha com `*` = eliminatório), desejáveis,
  comportamentais, senioridade, anos de experiência e diferencial.
- **Verificação de qualidade (checklist 14.11) em código:** discriminação
  (bloqueia), obrigatórios fora de 4 a 7, rotina, clichês, linguagem com marca
  de gênero, título criativo, senioridade x anos, modelo, local e faixa,
  diferencial.
- **Bloqueio na publicação:** `publicar` e `reativar` recusam vaga com critério
  discriminatório, com a mensagem do motivo.
- **Ainda não faz (próximas entregas do 3O):** gerar a JD pela IA a partir do
  recado do gestor, reescrever JD, modelos júnior e liderança, áudio do gestor.

### Primeiro teste real do 3B e decisão de provedor (15/10/2026)

O agente disparou, mas o Groq respondeu **HTTP 404: o modelo
`llama-3.3-70b-versatile` não existe ou não há acesso**. Correções: o detalhe do
erro do provedor passa a aparecer na conversa e é gravado na execução; quando o
erro é de modelo, o sistema lista os modelos da conta, escolhe o melhor de
conversa pela ordem de preferência e guarda a escolha no agente. **Decisão do
Rodnei:** usar **OpenAI** como provedor da SOS Vagas (modelo padrão
`gpt-4o-mini`, trocável no campo Modelo).

### Decisão F11 (15/10/2026): o agente atende sozinho

**Rodnei:** "o motivo maior de todo este trabalho é automatizar o recrutamento
e seleção; se o profissional ficar o tempo todo validando, não preciso de
automação." Esta decisão substitui a premissa de "sempre sugestão" da fase 3 e
sobe o agente para o nível de autonomia 2 (a escada do §7 do spec de
comunicação), com freios obrigatórios.

**Modo de atendimento (por agente):** `Sugestão` (nível 0) ou `Atende sozinho`
(nível 2). Configurado em Plataforma > Agente de IA, só superadmin.

**Quando envia sozinho:** agente ligado, modo "atende sozinho", conversa **sem
atendente** (ninguém da equipe assumiu), resposta **com fonte** e sem assunto
de risco. Em qualquer outra situação cai em sugestão ou encaminhamento.

**Freios (todos em código):**
- Assunto de risco, ameaça, pedido de dado pessoal, jurídico, saúde: não
  responde; encaminha à equipe (silêncio em caso de ameaça).
- Sem fonte aprovada ou resposta `[ENCAMINHAR]`: avisa o candidato que a equipe
  retorna e deixa a conversa marcada para a equipe.
- Pedido explícito de falar com uma pessoa: encaminha na hora.
- Agradecimento ou encerramento ("ok", "obrigado", emoji): não responde.
- Primeira mensagem sempre se identifica como assistente virtual da empresa.
- Máximo de 3 respostas automáticas em 10 minutos por conversa (anti-laço).
- Descadastro (SAIR), black list, empresa cliente cadastrada e teto mensal
  continuam bloqueando.
- Quando alguém da equipe **assume** a conversa, o agente sai de cena.
- "Agente ligado" desliga tudo de uma vez.
- Cada resposta automática fica na auditoria e no histórico como autor
  "Assistente", e a sugestão correspondente é marcada como usada.

**Painel "Precisa de ação agora":** conversa em que o agente parou aparece para
a equipe assumir.

### Decisão F12 (15/10/2026): aprender a cada atendimento (3D inicial)

Pedido do Rodnei: o agente deve aprender com cada atendimento, a partir de uma
**base de conhecimento confiável**. Desenho:

- **Fontes do aprendizado:** (a) a equipe edita a sugestão ou o texto
  automático; (b) a equipe responde algo que o agente não soube (sem fonte ou
  pediu humano). Em ambos o sistema cria uma **lição candidata** (pergunta e
  resposta, **sem dado pessoal**: telefone, e-mail, CPF, CNPJ e links
  removidos), em rascunho.
- **Confiabilidade:** a lição só vira conhecimento depois de **aprovada pelo
  Rodnei**. O painel avisa quantas esperam e permite "Aprovar todas" ou revisar
  uma a uma. O agente nunca aprende sozinho a partir de conversa crua.
- **Segurança da lição:** troca com assunto de risco, encerramento, pedido de
  humano ou resposta curta demais não vira lição; título repetido não duplica.
- **Ciclo:** lição aprovada entra no contexto das próximas respostas da empresa
  (é uma nota aprovada do tipo "Lições aprendidas").

### Requisito de confiabilidade da base de conhecimento (a evoluir)

Pedido: "ter uma base de conhecimento confiável". Já garantido: só nota
aprovada entra; edição reabre a aprovação; versão e autoria registradas;
exportação para o Obsidian; lição sem dado pessoal. **Próximas camadas
planejadas** (3D completo):

| Camada | O que faz |
|---|---|
| Validade | Nota com data de revisão; vencida avisa e deixa de valer até revisar |
| Conflito | Detecta notas que respondem a mesma pergunta de formas diferentes |
| Cobertura | Lista as perguntas mais frequentes sem fonte (lacunas) |
| Qualidade | Taxa de resposta com fonte, usadas sem edição e descartadas, por nota |
| Dono | Cada nota com responsável pela revisão |

### Ajustes após o primeiro teste do atendimento automático (15/10/2026)

- **Conversa assumida e abandonada:** o agente continuava só sugerindo porque
  a equipe havia assumido a conversa. Regra nova: se ninguém da equipe
  atribuiu nem respondeu há **30 minutos**, o agente retoma, responde e
  devolve a conversa à fila.
- **Marcador `{nome}` no texto:** o modelo copiou o marcador da nota de
  primeira mensagem. O prompt proíbe marcadores e o texto passa por limpeza em
  código antes de ser sugerido ou enviado; o agente não usa nome do candidato.
- **Notas com marcador:** use `{nome}` só como indicação humana; o agente
  nunca recebe nem preenche nome.

### Passo 3O-2 construído (15/10/2026): critérios da vaga gerados por IA

Cobre os cinco casos de uso do §14.1 (3O). Na tela **Vagas > Critérios e
qualidade**, o bloco "Gerar critérios com IA":

| Modo | O que faz |
|---|---|
| Criar a partir do recado do gestor | Extrai rotina, obrigatórios, desejáveis, comportamentais e senioridade do texto; o que o gestor não disse vira **lacuna** ("falta perguntar") |
| Reescrever uma JD | Corta exigência inflada, calibra a experiência e troca clichê por responsabilidade concreta |
| Vaga júnior | Foco em potencial; sem exigir experiência prévia |
| Vaga de liderança | Inclui escopo de gestão (tamanho do time) e competências de liderança |

**Regras:**
- A IA entrega uma **proposta**, gravada como não confirmada (`proposta_ia`).
  Só vale quando a pessoa confere e clica em Salvar critérios; o aviso fica
  na tela até lá.
- O texto do usuário entra como dado (não instrução); o prompt proíbe
  critério discriminatório, linguagem com marca de gênero e clichê.
- A verificação de qualidade (§14.11) roda sobre a proposta como sobre
  qualquer vaga: se a IA devolver termo discriminatório, a publicação continua
  **bloqueada**.
- Usa o provedor e o modelo do agente da empresa (hoje OpenAI), a chave do
  cofre, o teto mensal e registra a execução com custo estimado.
- Auditado (`vaga_criterios_gerados_ia`), sem o texto original.

**Fica para a próxima entrega:** áudio do gestor (transcrição) e geração do
texto de divulgação (3N).

### Passo 3N construído (15/10/2026): divulgação da vaga

Tela **Vagas > Critérios > Gerar divulgação** (`/admin/vagas/[id]/divulgacao`).
Parte dos critérios estruturados do 3O e gera o texto por canal.

| Canal | Entrega |
|---|---|
| LinkedIn | Post em 1ª pessoa, 2 opções de gancho, hashtags, CTA sem link no corpo |
| Instagram | Legenda, 2 ganchos, hashtags e briefing da arte |
| WhatsApp / grupos | Curto, escaneável, link direto |
| Portal (Gupy, Catho, Indeed) | Texto limpo sem markdown, título como o candidato busca |
| Comunidade tech | Formato #vaga direto |
| Vaga interna | Tom institucional, como se candidatar |
| Indicação | Texto reencaminhável com assunto |

**Regras:**
- Opções: perfil técnico ou menos técnico, tom da empresa (descontraído,
  tradicional, propósito) e mostrar ou não a faixa de remuneração.
- Vaga confidencial: o prompt proíbe citar a empresa.
- Cada canal recebe o link da vitrine com marcador de origem (`?o=canal`),
  base da métrica de fontes (3M). **A leitura do marcador ainda não existe**:
  entra no 3M.
- Verificação em código (§14.12): critério discriminatório **bloqueia** o
  texto; avisos para tamanho, markdown no portal, gancho longo, hashtags,
  briefing da arte, CTA, link no LinkedIn, faixa em perfil técnico, clichê e
  vaga ainda não publicada.
- A plataforma só redige. Publicar é manual, fora da plataforma.
- Nada é gravado em tabela nova; auditoria `vaga_divulgacao_gerada` (canais,
  provedor, modelo; sem o texto).

**Fica para depois:** diagnóstico "vaga não atrai" (precisa de dados de
candidaturas, vem com o 3M) e leitura do marcador de origem.

### Passo 3G construído (15/10/2026): triagem de currículos

Tela **Vagas > Critérios > Triar candidatos** (`/admin/vagas/[id]/triagem`).
Migration **0034** (`job_screenings`, aditiva, RLS ligada, sem política pública).

**Fluxo:** botão "Triar candidatos" avalia, em blocos de 5 e até 30 por rodada,
as candidaturas ativas da vaga contra `jobs.criterios`; resultado salvo por
candidatura com o hash dos critérios (se a vaga mudar, o ranking avisa
"critérios mudaram: refazer"). Teto mensal e chave do cofre valem como no resto.

**Garantias do §14.13 e onde vivem:**
| Garantia | Implementação |
|---|---|
| Critérios definidos antes | `bloqueiosDaTriagem`: sem obrigatórios, proposta da IA não conferida ou termo discriminatório bloqueia |
| Às cegas | `montarCurriculoCego`: só título, resumo e histórico (cargo e período); sem nome, contato, endereço, cidade, motivo de saída; idade, estado civil e sexo são removidos do texto livre (melhor esforço) |
| Evidência obrigatória | trecho literal conferido contra o currículo; sem ele, vira "não evidenciado" |
| Não evidenciado ≠ não atende | estado próprio; só "não atende" com evidência pode eliminar |
| Eliminatório no código | `fecharResultado`; eliminado vai ao fim com o motivo |
| Lacunas e trocas só "a validar" | `sinaisDeHistorico` calcula no código; nunca reduz a nota |
| Comportamental a validar | entra na lista "a validar na entrevista" |
| Pontuação | 70% obrigatórios + 30% desejáveis, calculada no código |
| Corte | só sugerido (70+ e sem eliminatório); a decisão é da pessoa |
| Sem reprovação automática | nenhuma mudança de etapa é feita pela triagem |

**Limites desta primeira entrega:**
- O "currículo" é o **cadastro estruturado** (título, resumo, experiências).
  O PDF anexado **não** é lido ainda; perfil vazio aparece como "não foi
  possível avaliar".
- Formação, idiomas e ferramentas só entram se estiverem no resumo ou nos cargos.
- Faltam: exportar o ranking em planilha, "top N", currículos colados e o
  modo mestre-de-match de um passo (a extração de critérios já existe no 3O-2).
