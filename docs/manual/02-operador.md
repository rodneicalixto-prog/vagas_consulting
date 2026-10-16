# 2. Operador

> **Estado:** rascunho parcial (15/10/2026). Escrito a partir do código e das
> specs. Os tópicos que dependem de telas que ainda preciso conferir estão
> marcados **a escrever** e não foram inventados.

## 2.1 Sua rotina: Visão geral e "Precisa de ação agora"

**Para que serve.** Começar o dia sabendo o que está esperando por você.
**Onde fica.** `Visão geral`.

O quadro **Precisa de ação agora** mostra cartões com a contagem e um
destino clicável:

| Cartão | O que significa |
|---|---|
| Conversas na fila | Candidatos esperando alguém assumir |
| Mensagens não lidas | Nas suas conversas e na fila |
| Compromissos hoje | Entrevistas e tarefas da sua agenda |
| Candidaturas paradas 7+ dias | Sem mudança de etapa |
| Vagas sem candidato há 5+ dias | Publicadas e sem candidatura |
| Follow-ups de abordagem | Lembretes vencidos para você enviar |
| Entregas vencendo em 3 dias | Prazo da vaga perto de acabar |

## 2.2 Conversas

**Para que serve.** Falar com candidatos pelo WhatsApp, dentro da plataforma.
**Onde fica.** `Conversas`.

1. Use a busca por nome ou telefone e os filtros **Todas**, **Não lidas** e,
   se a empresa tiver mais de um número, **Número**.
2. **Fila:** conversa sem dono, com "Na fila · sem atendente". Clique em
   **Assumir** para atender.
3. **Responder:** só quem assumiu responde. Digite, anexe arquivo ou grave
   áudio (envio pelo painel até 4 MB).
4. **Devolver à fila:** libera a conversa para outra pessoa assumir.
5. **Citar** uma mensagem para responder a ela.

### O que aparece na conversa

| Elemento | Significado |
|---|---|
| "Você está atendendo" / "Em atendimento: nome" | Quem é o dono |
| **Número: apelido** | Qual número de WhatsApp da empresa fala com essa pessoa; a resposta sai por ele |
| Caixa de sugestão | Rascunho do assistente: **usar**, **editar** ou **descartar** |
| Descadastro | A pessoa pediu para não receber mais mensagens |

### Quando o envio é recusado

A plataforma só envia para quem **respondeu**, tem **candidatura em
andamento** ou **consentiu**. Também recusa **descadastro** e **black list**.
A tela mostra o motivo.

### Número dedicado

Se o número é só seu, a conversa **nasce com você**, sem passar pela fila, e
não pode ser devolvida à fila. Para outra pessoa assumir, a gestão transfere.

### O que a plataforma não faz

- **Não envia sozinha** (exceto o agente, se o número estiver em "atende
  sozinho" e a plataforma permitir).
- **Não mostra** conversas de outros operadores.
- **Não envia** para quem pediu para sair.
- **Não traz** mensagens enviadas pelo celular fora da plataforma.

## 2.3 Sugestão do assistente

O assistente propõe uma resposta com base nas **notas aprovadas** da empresa e
na vaga do candidato. Se a pergunta não tiver fonte, ele encaminha para você
em vez de inventar. O que você usa ou edita ajuda a melhorar as notas.
**a escrever:** detalhes da tela de aprendizado.

## 2.4 Agenda, candidatos, contatos, talentos e convites

**a escrever** com conferência das telas (agenda em cascata, entrevistas, por
etapa, entregas; candidatos e documentos; contatos e o botão **Conversar**;
talentos; convites e prazos).

## 2.5 Vagas e vagas sigilosas

**Onde fica.** `Empresas e vagas → Cadastro de vagas`.

- O operador vê as vagas das empresas da sua **carteira**.
- **Vaga sigilosa:** só aparece com **acesso de confiança**; sem ele, nem a
  empresa nem a vaga são vistas.
- **Publicar** a vaga é função do administrador e do superadmin; o operador
  prepara critérios, divulgação e todo o ciclo (capítulo 3).

## 2.6 Indicadores

Veja [3.10 Indicadores e plano de ação](03-ciclo-rs/10-indicadores.md).

## Veja também

- [Ciclo de R&S](03-ciclo-rs/00-visao-geral.md)
- [Matriz de permissões](apendices/matriz-permissoes.md)
- [Regras de ouro](apendices/regras-de-ouro.md)
