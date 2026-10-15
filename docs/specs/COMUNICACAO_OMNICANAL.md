# Especificação — Comunicação omnicanal e agente recrutador de IA (v0.1)

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Spec de comunicação v0.1 · **Data:** 14/10/2026
> **Status:** proposta para aprovação do Rodnei. Nada deste documento foi construído, contratado ou ativado.
> Regra dos seis documentos: este arquivo precede o código. Complementa
> `PROJETO.md` §8.0 (agente de IA + WhatsApp) e §6 (LGPD), que já previam esta fase.

## 1. Objetivo

Dar ao operador, dentro da plataforma, um lugar único para falar com candidatos
por **WhatsApp, e-mail, SMS e Telegram**, com um **agente recrutador de IA**
que faz a triagem inicial e passa a conversa para a pessoa. Tudo respeitando
a carteira do operador, o consentimento por canal e o histórico no perfil do
candidato.

## 2. Princípios

1. **Um inbox, vários canais.** O operador não troca de ferramenta.
2. **Consentimento primeiro.** Sem opt-in do canal, não há envio (já existe a
   tabela de consentimentos por finalidade e canal).
3. **A IA triagem, a pessoa decide.** A IA nunca reprova, contrata nem altera
   etapa sozinha; propõe e registra.
4. **Escopo da carteira.** O operador só vê conversas de candidatos das vagas
   da sua carteira (mesma barreira `escopo.ts`).
5. **Canal substituível.** Cada canal é um adaptador atrás de uma interface
   única; trocar de provedor não muda telas nem regras.
6. **Falha segura.** Em dúvida, a IA para e chama o humano.

## 3. Hierarquia e permissões

| Papel | Inbox | Disparo em massa | Configura canais/IA |
|---|---|---|---|
| Superadmin | Todas as conversas | Sim | Sim |
| Admin | Todas as conversas | Sim | Parcial (modelos e campanhas) |
| Operador | Só carteira; só candidato com candidatura em andamento ou convite ativo | **Não** (só mensagem 1 a 1 e modelos aprovados) | Não |

Operador não exporta contatos nem vê número/e-mail fora da conversa aberta.

## 4. Canais

| Canal | Uso principal | Provedor sugerido | Observações |
|---|---|---|---|
| **WhatsApp** | Triagem, convite, lembrete de entrevista, documentos | **Fase 1:** Evolution API (já usada pelas linhas RH) · **Meta Cloud API oficial** como destino | Evolution não é oficial: risco de bloqueio do número. Cloud API exige modelos aprovados e janela de 24 h, mas é estável e escalável |
| **E-mail** | Marketing de vagas, convites, lembretes, comprovantes | Resend ou Amazon SES (a decidir) | Exige domínio com SPF, DKIM e DMARC; link de descadastro obrigatório |
| **SMS** | Lembrete curto e código; alto custo por mensagem | Zenvia ou Twilio (a decidir) | Só para o que é urgente ou sem WhatsApp |
| **Telegram** | Alertas de vagas para quem prefere | Bot oficial do Telegram (gratuito) | O bot **não inicia** conversa: o candidato precisa tocar em "Iniciar" |
| **No app** | Chat interno atual (`messages`) | Já existe | Vira mais um canal no mesmo inbox |

Ordem recomendada: WhatsApp → e-mail → SMS → Telegram.

## 5. Arquitetura

```
Candidato ⇄ Canal (WhatsApp/e-mail/SMS/Telegram)
              │ webhook                    ▲ envio
              ▼                            │
        n8n (orquestração)  ──►  Adaptadores de canal
              │                            ▲
              ▼                            │
   API da plataforma (Next.js, server actions)
      │  grava conversa/mensagem      │  chama agente
      ▼                               ▼
   Supabase (conversas, consentimentos)   Agente recrutador (LLM)
      ▲
      └── Inbox do operador (Realtime)
```

- **n8n** recebe webhooks e roda fluxos (já previsto no `PROJETO.md` §8.0).
- **A plataforma é a fonte da verdade**: conversas, consentimento e etapa
  ficam no Supabase; o n8n não guarda estado de negócio.
- Webhooks entram por rota assinada (segredo por canal) e idempotente
  (id da mensagem do provedor como chave única).

## 6. Modelo de dados proposto (migration futura, só com "sim")

| Tabela | Função |
|---|---|
| `channel_accounts` | Contas/números/domínios conectados (canal, provedor, status; segredo fora do banco) |
| `conversations` | Uma por candidato + canal; dono (operador), empresa/vaga de contexto, status, última atividade |
| `conversation_messages` | Mensagens (direção, tipo, texto, mídia, autor: candidato/operador/ia/sistema, status de entrega, id do provedor) |
| `message_templates` | Modelos (canal, nome, variáveis, aprovação do provedor, versão) |
| `campaigns` / `campaign_recipients` | Disparos com público, agenda, resultado por destinatário |
| `consents` (existe) | Finalidade + canal + versão do texto + data + revogação |
| `channel_opt_outs` | Descadastros imediatos (SAIR, link do e-mail, /stop) |
| `ai_agent_runs` | Cada execução do agente: entrada, saída, decisão proposta, motivo, custo |

RLS ligada em todas, sem política pública; acesso só pelo servidor com o
helper de escopo. A tabela `messages` atual (chat interno com restrição de
vínculo) **não é alterada**: o canal "no app" a mapeia para o inbox.

## 7. Agente recrutador de IA

> **Decisão do Rodnei (14/10/2026):** depois de sincronizado, o agente
> conduz **todo o processo inicial**; o operador entra **só na última etapa**.
> Isso substitui a premissa de que o operador move o candidato na triagem e
> será detalhado (etapas do agente, ponto de entrega ao operador, quem move
> cada etapa) quando o agente for construído (Fase 3).

**Faz:** primeiro contato; confirma interesse e disponibilidade; coleta dados
faltantes do perfil; aplica perguntas eliminatórias já cadastradas na vaga;
envia link de teste; marca entrevista na agenda; responde dúvidas
frequentes da vaga; resume a conversa para o operador.

**Nunca faz:** reprovar ou aprovar; mudar etapa sozinho; prometer salário,
vaga ou contratação; pedir documento sensível fora do fluxo; falar de outra
empresa; revelar empresa de vaga confidencial antes da etapa permitida.

**Regras de parada (gate KPA para WhatsApp):**
- Candidato pede humano, reclama, menciona saúde, discriminação, advogado ou
  LGPD → passa para o operador na hora.
- Duas respostas sem entender → passa para o operador.
- Fora do horário comercial: responde apenas confirmação e agenda retorno.
- Limite de mensagens por candidato por dia; sem repetição de abordagem.
- Palavras de saída (SAIR, PARAR) encerram e gravam o descadastro.

**Transparência e LGPD:** a primeira mensagem diz que é um assistente
virtual. Decisão que afete o candidato (ex.: encaminhar ou não) é sempre
revisável por pessoa, com o motivo registrado (LGPD art. 20).
Modelo e custo por conversa a definir (E5).

## 8. Telas

1. **Inbox do operador**: lista de conversas (filtro por canal, vaga, etapa,
   "aguardando resposta"), conversa à direita, painel do candidato com etapa
   e botões de ação (convidar, agendar, mover etapa).
2. **Modelos**: criar, versionar e enviar para aprovação.
3. **Campanhas** (admin): público por filtros, pré-visualização, agendamento,
   resultado (enviadas, entregues, lidas, respostas, descadastros).
4. **Canais** (superadmin): estado das contas, número, qualidade, saúde.
5. **Agente de IA** (superadmin/admin): roteiro por vaga, perguntas, limites,
   histórico de execuções e botão de pausa geral.

## 9. Conformidade e riscos

| Risco | Tratamento |
|---|---|
| Bloqueio do número do WhatsApp | Aquecimento, limite diário, só quem fez opt-in; migrar para Cloud API oficial |
| Spam / consentimento | Opt-in por canal, desmarcado por padrão; prova guardada; descadastro em 1 clique |
| E-mail na caixa de spam | SPF/DKIM/DMARC, domínio de envio separado, lista limpa |
| Dado sensível (saúde/exame) no chat | Não coletar por mensagem; orientar para o fluxo próprio |
| Vazamento entre carteiras | Mesma barreira de escopo; testes de isolamento antes de ligar |
| Alucinação da IA | Respostas só a partir de dados da vaga; fora disso, passa para humano |
| Custo | Teto mensal por canal e por IA; painel de consumo |
| Retenção | Prazo definido de guarda das conversas e exclusão a pedido (LGPD) |

## 10. Plano por fases

| Fase | Entrega | Migration |
|---|---|---|
| 0 | Aprovar esta spec e as decisões do §11 | Não |
| 1 | Inbox + WhatsApp 1 a 1 (Evolution) + registro de conversa + opt-out | Sim |
| 2 | Modelos e e-mail transacional (convite, lembrete) | Sim |
| 3 | Agente recrutador em modo **sugestão** (operador aprova cada resposta) | Sim |
| 4 | Agente com envio automático nas regras seguras + horário comercial | Não |
| 5 | Campanhas de e-mail e WhatsApp com público e métricas | Sim |
| 6 | SMS e Telegram | Sim |
| 7 | Migração para WhatsApp Cloud API oficial | Não |

Critérios de aceite da Fase 1: (a) operador só vê conversas da carteira;
(b) sem consentimento do canal não sai mensagem; (c) SAIR bloqueia novos
envios; (d) mensagem recebida aparece no inbox em até 5 s; (e) nenhuma
credencial no repositório (variáveis de ambiente).

## 11. Decisões do Rodnei (14/10/2026)

| # | Tema | Decisão |
|---|---|---|
| E1 | Canal inicial de WhatsApp | **Evolution API já existente** (migrar para a API oficial depois, se necessário) |
| E2 | Números | **Um número por empresa**, usado pelo operador daquela empresa |
| E3 | Provedor de e-mail | **Resend como candidato**; ainda não avaliado pelo Rodnei (avaliar custo, entregabilidade e domínio antes de contratar) |
| E4 | SMS e Telegram | **Depois da Fase 5**; uso como reforço quando o candidato para de responder, **por vontade do operador** (não automático) |
| E5 | Modelos de IA | **OpenAI e Claude**, e **Groq**, por conta do superadmin no início. A plataforma deve ficar **pronta para cada empresa cadastrar a própria chave** (BYOK) |
| E6 | Modo sugestão do agente | **Aprovado:** começa em sugestão (rascunho que o operador aprova, edita ou descarta); autonomia **gradual**, conforme o agente aprende |
| E7 | Disparo | **Operador só 1 a 1**; massa apenas admin |
| E8 | Guarda das conversas | **12 meses no Supabase** (após o encerramento da candidatura); depois, arquivo no **Google Drive** sem prazo definido. Ressalva LGPD abaixo |

### Consequências para o projeto

- **Chaves de IA por empresa:** a tabela `ai_provider_keys` (empresa, provedor,
  chave **cifrada**, teto mensal, status) entra na Fase 3. A chave nunca é
  gravada em texto puro, nunca volta para o navegador e nunca vai em log;
  uso por Supabase Vault ou criptografia em coluna com chave de servidor.
  Sem chave da empresa, usa a do superadmin e o custo é apontado ao
  superadmin.
- **Teto mensal de custo:** por empresa e por provedor; ao atingir, o agente
  pausa e avisa o superadmin. **Valor do teto: pendente.**
- **Roteamento de modelo:** modelo econômico para triagem e mensagens
  curtas; modelo mais forte só para resumo e casos ambíguos.
- **SMS/Telegram como reforço:** botão "Reforçar por SMS/Telegram" na conversa,
  habilitado só se o candidato tem opt-in desse canal e não respondeu em N
  horas; nunca dispara sozinho.
- **Número por empresa:** `channel_accounts` já prevê uma conta por empresa;
  o operador só usa a conta da empresa da conversa.

### Escada de autonomia do agente (proposta, a validar)

| Nível | O agente pode | Entra quando |
|---|---|---|
| 0 | Só sugerir; o operador aprova cada mensagem | Início |
| 1 | Enviar sozinho confirmações simples (recebi, horário, lembrete de entrevista) | 90% das sugestões desse tipo aprovadas sem edição em 2 semanas |
| 2 | Enviar sozinho respostas a dúvidas frequentes da vaga | Mesma métrica, por tipo, sem reclamação |
| 3 | Conduzir a triagem inicial inteira e entregar ao operador na última etapa | Revisão do Rodnei com amostra de conversas |

Regras: a promoção é **por tipo de mensagem e por empresa**; qualquer
reclamação, erro grave ou pedido de humano **volta o tipo ao nível 0**;
o painel mostra, por tipo, aprovadas sem edição, editadas e descartadas;
só o superadmin muda o nível. Toda edição do operador vira exemplo de
aprendizado para o roteiro daquela empresa.

### Pendentes

1. Teto mensal de custo (valor) e se há teto por empresa.
2. "Grock" é **Groq** (modelos Llama, o que o n8n do Rodnei já usa) ou **xAI
   Grok**? A spec assume Groq.
3. Avaliação do Resend (custo e domínio de envio).
5. **Arquivo "eterno" no Drive e a LGPD:** guardar dado pessoal sem prazo
   conflita com o princípio da necessidade/limitação. Proposta: no Drive,
   guardar a conversa **sem identificação direta** (nome, telefone e e-mail
   trocados por código) ou com **prazo final** (ex.: 5 anos), e excluir a
   pedido do titular também no Drive. Decisão do Rodnei pendente.

### Fechamento de 14/10/2026

- **Teto mensal de custo de IA: US$ 100 POR EMPRESA** (confirmado pelo Rodnei em 14/10/2026). Cada empresa tem o próprio contador; ao atingir 80% avisa o superadmin, ao atingir 100% o agente daquela empresa pausa e volta ao modo sugestão manual. Empresa com chave própria (BYOK) não consome o teto do superadmin. **Texto anterior assumia teto da plataforma; vale este.**
- (registro anterior, substituído) **Teto mensal de custo de IA: US$ 100** (assumido como teto da plataforma no conjunto; se for por empresa, o Rodnei indica). Ao atingir 80% avisa o superadmin; ao atingir 100% o agente pausa e volta ao modo sugestão manual.
- **Provedor:** Groq (confirmado, não xAI Grok), além de OpenAI e Claude.
- **Retenção (E8): os dois mecanismos.** Supabase guarda 12 meses; depois a conversa vai ao Drive **pseudonimizada** (nome, telefone e e-mail trocados por um **código estável por candidato**, sem a chave no Drive) e **com prazo final** (proposta: 5 anos, a confirmar). O código estável permite o histórico que o Rodnei quer (há quanto tempo procura emprego, quantas reprovações) sem expor a identidade. Dado pseudonimizado ainda é dado pessoal: a **tabela de correspondência código↔pessoa fica só no Supabase** e, a pedido do titular, é apagada, o que desfaz o vínculo no Drive.

### Contatos e link do WhatsApp (14/10/2026)

- **Prazo final no Drive: 5 anos** (confirmado pelo Rodnei).
- **Telefone como link:** em toda tela com telefone do candidato, o número é um link `wa.me` que abre a conversa no WhatsApp. Quando o inbox da plataforma existir (Fase 1), o mesmo link passa a abrir a conversa **dentro** da plataforma, com o histórico.
- **Aba Contatos (`/admin/contatos`):** nome, telefone, vaga e etapa de todos os candidatos, com busca por nome ou telefone, para identificar quem liga e para quem ligar. Admin e superadmin veem toda a base; o operador vê só candidatos da carteira e **o telefone só enquanto há candidatura em andamento**. Cada abertura da lista grava auditoria.
- **Ponto de atenção:** candidato reprovado que volta a ligar não terá o telefone visível ao operador (regra de contato). Se isso atrapalhar o atendimento, o Rodnei decide estender a janela (ex.: 30 dias após o encerramento).

### Hierarquia de agentes: um por empresa e o agente mor (pedido do Rodnei, 14/10/2026)

| Agente | Escopo | Faz | Não faz |
|---|---|---|---|
| **Agente da empresa** | Uma empresa cliente | Conversa com os candidatos daquela empresa; roteiro, tom, perguntas eliminatórias e dúvidas frequentes próprios; propõe respostas ao operador (modo sugestão) | Ver dados de outra empresa; afrouxar regra do agente mor; mudar etapa sozinho |
| **Agente mor** (superadmin) | A plataforma toda | Define a política global; supervisiona todos os agentes; audita conversas por amostra; detecta anomalias, custo e queda de qualidade; sugere ajustes de roteiro; responde ao superadmin | Falar com candidato (por padrão); alterar dado de empresa sem o superadmin |

**Regras de herança**
1. A política do agente mor é o **piso**: regras de parada, LGPD, limites e
   linguagem proibida **não podem ser removidas** pela empresa; ela só pode
   **restringir mais**.
2. Cada agente de empresa tem **contexto, memória e base de conhecimento
   isolados**; o agente mor lê **agregados e amostras**, nunca mistura o
   conteúdo de uma empresa em outra.
3. **Chave e teto por empresa:** cada agente usa a chave da empresa (se houver)
   ou a do superadmin, com teto de US$ 100/mês por empresa. O agente mor tem
   teto próprio, separado.
4. **Autonomia por agente:** a escada de níveis 0 a 3 vale por agente de
   empresa e por tipo de mensagem; só o superadmin promove.
5. **Sigilo:** agente de empresa nunca revela empresa de vaga confidencial
   antes da etapa permitida.

**Quem controla**
| Papel | Agente da empresa | Agente mor |
|---|---|---|
| Superadmin | Cria, configura, pausa, muda autonomia | Configura, pausa, vê tudo |
| Admin | Vê histórico e métricas; **edita roteiro e FAQ** (decidido) | Não acessa |
| Operador | Aprova, edita ou descarta sugestões; vê o status | Não acessa |

**Modelo de dados proposto:** `ai_agents` (escopo plataforma|empresa,
empresa, nome, ativo, nível de autonomia, referência da chave, teto mensal),
`ai_agent_policies` (versões da política e do roteiro, com quem aprovou),
`ai_agent_runs` (já previsto: entrada, saída, decisão, custo, agente).

**Fases:** agente da empresa na Fase 3 (modo sugestão); agente mor na Fase 4,
primeiro só como supervisor e relatório para o superadmin.

**Decisões do Rodnei (14/10/2026):**
1. **O agente mor só supervisiona e fala com o superadmin**; não atende
   candidatos.
2. **O admin pode editar o roteiro do agente de uma empresa** "no modelo de
   hoje". Cuidados registrados: a edição respeita a política-piso do agente
   mor (não remove regra de parada nem LGPD); cada alteração gera nova
   **versão** do roteiro com autor e data, e o superadmin pode reverter; o
   admin não muda o nível de autonomia nem a chave/teto (só o superadmin).
   Revisar quando houver white-label ou operadores com perfil de gestão.

## Fase B construída: inbox de WhatsApp (14-15/10/2026)

**Telas:** `/admin/conversas` (lista + conversa, atualiza a cada 15 s) e o botão
"Conversar" em Contatos. **Recebimento:** `POST /api/webhooks/evolution`.

### Regras de envio (aplicadas no servidor)
1. Empresa vem da conversa, nunca do formulário; precisa estar no escopo do usuário.
2. **Descadastro** (SAIR, PARAR, STOP, DESCADASTRAR, mensagem inteira) bloqueia
   novos envios e é registrado **antes** de qualquer outra gravação.
3. Só envia com relação ativa: a pessoa **já respondeu**, **candidatura em
   andamento** na empresa ou **consentimento** de alertas no WhatsApp.
4. **Black list da empresa** bloqueia o envio.
5. O texto da mensagem **nunca** entra na auditoria.
6. Cada empresa envia pela **própria instância** (um número por empresa).

### Como ligar o recebimento na Evolution (uma vez por instância)
No manager da Evolution, em cada instância → **Webhook**:

| Campo | Valor |
|---|---|
| URL | `https://sosvagas.sosmkt.com.br/api/webhooks/evolution` |
| Eventos | `MESSAGES_UPSERT` e `MESSAGES_UPDATE` |
| Cabeçalho | `apikey: <a chave global da Evolution cadastrada em Integrações>` |

A rota recusa (401) qualquer chamada sem a chave da plataforma.

### Limites conhecidos
- Mensagens enviadas pelo celular (fora do sistema) não aparecem no inbox.
- Sem tempo real verdadeiro: atualização a cada 15 s.
- Só texto: imagens e áudios entram como marcador (`[imagem]`).
- Reentrega sem id do provedor pode duplicar uma mensagem.
- Telefone aparece na conversa mesmo se a candidatura terminou (conversa já existente).

### Anexos e áudio (15/10/2026)

- **Armazenamento:** bucket privado `conversas-anexos`, caminho
  `<empresa>/<conversa>/<id>-<nome>`; sem política de leitura direta.
- **Entrada:** o webhook registra a mensagem e, em seguida, baixa a mídia
  (`/chat/getBase64FromMediaMessage`) e guarda. Falha no download não perde a
  mensagem (aparece "arquivo indisponível"). Tipos permitidos: JPG, PNG, WebP,
  PDF, Word, Excel, TXT, áudio e vídeo MP4; SVG, HTML e executáveis nunca.
- **Saída:** `sendMedia` (imagem, documento, vídeo) e `sendWhatsAppAudio`
  (áudio como nota de voz; sem legenda). Limite de 4 MB por envio.
- **Citação:** `resposta_a` aponta mensagem da mesma conversa; se a citação
  causar erro na Evolution, reenvia sem citar.
- **Acesso:** `/api/admin/conversas/anexo/[id]` valida o escopo da empresa e
  redireciona para link temporário de 2 min; fora do escopo responde 404.
