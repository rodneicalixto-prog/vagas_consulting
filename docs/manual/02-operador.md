# 2. Operador

> **Estado:** rascunho (15/10/2026). Escrito a partir do código e das
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

### Agenda

**Para que serve.** Marcar entrevistas e compromissos, ver o que vem pela
frente e acompanhar prazos de entrega ao cliente.
**Onde fica.** `Agenda`, com cinco telas.

| Tela | O que mostra |
|---|---|
| **Minha agenda** | Seus compromissos, em **Calendário** ou **Lista**, e o formulário **Novo compromisso** |
| **Entrevistas** | Entrevistas das vagas da sua carteira e as que você marcou (a equipe de plataforma vê todas) |
| **Por etapa** | Candidatos em cada etapa do quadro, com a data da próxima entrevista; quem está na etapa e ainda **não tem data** aparece em destaque |
| **Entregas** | Prazo para entregar candidatos ao cliente, por vaga, com **Alterar prazo** e **Salvar** |
| **Agenda da equipe** | Compromissos da equipe (administrador da empresa, administrador e superadmin) |

**Para marcar um compromisso:**

1. Em **Minha agenda**, preencha **Novo compromisso**: título e tipo
   (**Compromisso interno** ou **Entrevista com candidato**).
2. Informe o **início** e, se quiser, o **fim**.
3. Para entrevista, **vincule a uma candidatura em aberto** (opcional).
4. Clique para salvar. Depois use **Concluir**, **Cancelar** ou **Excluir**.

**O que a plataforma não faz.** Não envia convite de calendário externo e
não encaixa a ficha de entrevista automaticamente no compromisso. Vagas com
prazo vencido são **arquivadas pela rotina diária**.

### Candidatos

**Onde fica.** `Candidatos → Candidatos`.

- A lista é **por empresa e vaga**. Filtros: **Em andamento**, **Contratados**,
  **Reprovados**, **Desistência e expirados** e **Todos**; busca por candidato
  ou vaga.
- **Cadastrados sem candidatura** lista quem se cadastrou e ainda não se
  candidatou.
- Ao abrir um candidato, o cadastro está em **modo leitura**. Você pode
  **atualizar a etapa da candidatura** (escolhendo a etapa, com motivo
  opcional, e **Salvar**) e usar a **black list**. Nenhuma ação é feita em nome
  do candidato.
- **Contato liberado após a candidatura:** telefone, endereço e currículo só
  aparecem quando há candidatura em andamento na sua carteira. Convite
  sozinho libera o perfil, não o contato.

### Contatos

**Onde fica.** `Candidatos → Contatos`. Busca por nome ou telefone; mostra
vaga e etapa. O telefone aparece **enquanto a candidatura estiver em
andamento**. O botão **Conversar** abre a conversa na plataforma (no número
da empresa ou no seu número dedicado).

### Talentos

**Onde fica.** `Candidatos → Talentos` (**Banco de talentos**). Candidatos
aprovados, em resumo; filtros por nome ou cargo e por cidade. O contato
completo só aparece depois que o candidato se candidata a uma vaga da sua
carteira. Para convidar, escolha **Convidar para a vaga…** (vagas temporárias
publicadas) e clique em **Convidar**; a validade padrão é de 72 horas.

### Convites

**Onde fica.** `Candidatos → Convites`. Convite direto para **vagas
temporárias**: o candidato responde pelo aplicativo e a equipe confirma.

1. Escolha o **candidato** e a **vaga temporária publicada**.
2. Defina o **prazo para responder** (de 1 a 168 horas; padrão 72).
3. Clique em **Enviar convite**.
4. Acompanhe a **situação**. Quando o candidato **aceitar**, use
   **Confirmar**. Convite ainda aberto pode ser **cancelado**.

**O que a plataforma não faz.** Convite sem resposta no prazo aparece como
**Expirado** e libera um novo convite; não prorroga sozinho.

`[A VALIDAR]` todas as telas desta seção no roteiro de teste.

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
