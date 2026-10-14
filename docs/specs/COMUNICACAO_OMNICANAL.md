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

## 11. Decisões pedidas ao Rodnei

| # | Pergunta | Recomendação |
|---|---|---|
| E1 | Começar pelo WhatsApp via Evolution (já existente) ou direto pela API oficial da Meta? | Evolution agora, com plano de migrar; oficial para disparo em massa |
| E2 | Qual número/instância é o canal da plataforma? Um por empresa cliente ou um comum? | Um por empresa (sigilo e marca), começando por um piloto |
| E3 | Provedor de e-mail: Resend ou Amazon SES? Domínio de envio? | Resend para começar; domínio próprio de envio |
| E4 | SMS e Telegram entram agora ou só depois da Fase 5? | Depois da Fase 5 |
| E5 | Qual modelo de IA e teto mensal de custo? | Modelo econômico para triagem; teto fixo por mês |
| E6 | O agente começa em modo sugestão (operador aprova)? | Sim, por 2 a 4 semanas |
| E7 | Operador pode disparar para várias pessoas ou só 1 a 1? | Só 1 a 1; massa apenas admin |
| E8 | Prazo de guarda das conversas? | 12 meses após o encerramento da candidatura |
