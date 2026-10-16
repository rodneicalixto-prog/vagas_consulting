# 4. Administrador da empresa

> **Estado:** rascunho (código e specs em 15/10/2026). Tudo `[A VALIDAR]` no
> roteiro de teste. O que ainda não conferi na tela está marcado **a escrever**.

O administrador da empresa gerencia a **própria empresa**: equipe, números de
WhatsApp, black list e a chave de IA. Não aprova empresa nem publica vaga, e
só lê as prestações da própria empresa.

## 4.1 Equipe (operadores)

**Para que serve.** Convidar e organizar os operadores da empresa.
**Onde fica.** `Empresas e vagas → Operadores`.

1. Informe o **nome** e o **e-mail** da pessoa.
2. Escolha a **função** (a lista mostra uma dica de cada uma).
3. Clique em **Enviar convite**. A pessoa recebe um e-mail para definir a senha.
4. Na lista de **Pessoa, Situação, Acesso de confiança e Ações**, use
   **Desativar** quando alguém sair da equipe.

| Função | O que faz |
|---|---|
| **Operador** | Atende candidatos e conversas da carteira; não vê financeiro nem outras empresas |
| **Admin da empresa** | Gerencia equipe, black list e integrações da própria empresa |

**Acesso de confiança.** Liberar o acesso de confiança a um operador faz ele
enxergar as **vagas sigilosas** da empresa. Sem ele, essas vagas e a empresa
nelas não aparecem.

**Limite de operadores.** A empresa tem um limite (padrão 4). Atingido o
limite, o envio do convite fica bloqueado: peça à plataforma para ampliar.

**O que a plataforma não faz.** Não deixa convidar um e-mail que já pertence a
outra pessoa cadastrada; não permite criar função acima da sua.

## 4.2 Números de WhatsApp

**Para que serve.** Conectar um ou mais números da empresa e decidir quem
atende cada um.
**Onde fica.** `Plataforma → Números de WhatsApp`.

**Dois modelos.** Um número **compartilhado** (as conversas vão para a fila da
equipe) ou números **dedicados**, um por operador (a conversa nasce com ele e
não vai para a fila). Os dois podem existir na mesma empresa.

**Para criar um número:**

1. Em **Novo número de WhatsApp**, dê um **apelido** (ex.: RH Ana).
2. Escolha o **operador dono** (ou deixe como compartilhado) e o **modo do agente**.
3. Clique em **Criar número**. A plataforma cria a instância e liga o
   recebimento sozinha.
4. No número criado, clique em **Mostrar QR code**.
5. No celular: WhatsApp → **Aparelhos conectados** → **Conectar um aparelho** e
   aponte para o código. O estado muda para **Conectada** e o número aparece.

**Modo do agente em cada número:** **Desligado**, **Só sugestão** (a pessoa
envia) ou **Atende sozinho** (só se o agente da empresa permitir). Número
dedicado começa em "Só sugestão".

**Outras ações.** **Atualizar estado**, **Desconectar** (será preciso ler o QR
de novo), **Religar o recebimento** e **Editar número** (apelido, operador,
agente, ativa). Ao trocar o operador dono, marque a opção para **passar as
conversas** que já têm dono ao novo operador.

**Limite.** O número de números é limitado pelo plano da empresa; só a
plataforma amplia.

**O que a plataforma não faz.** Não compartilha o QR code nem o token; não
apaga a instância na Evolution (**Desativar** só para de receber e enviar); não
move conversas ao trocar o dono, a menos que você marque a opção.

## 4.3 Black list da empresa

**Para que serve.** Impedir que uma pessoa específica se candidate ou receba
mensagem da empresa.
**Onde fica.** `Financeiro e dados → Black list`.

- Cadastre escolhendo a pessoa **na lista** ou informando o **telefone**
  (vale mesmo antes de a pessoa se cadastrar), com **motivo** obrigatório.
- Para liberar, remova da lista.
- O efeito vale **em todos os números** da empresa.

**O que a plataforma não faz.** Não informa ao candidato o motivo nem a
empresa que o bloqueou.

## 4.4 Chave de IA da empresa

**Onde fica.** `Plataforma → Integrações`.

A empresa pode usar a **própria chave** de IA (OpenAI, Claude ou Groq). Sem
chave própria, usa a da plataforma, e o custo é da plataforma. O campo da
chave é só de escrita: depois de salvo aparece apenas `••••` e os 4 últimos
caracteres. **Testar conexão** confere a chave sem enviar mensagem.

## 4.5 Prestações

**Onde fica.** `Financeiro e dados → Prestações`. A empresa vê **só as
próprias**, em leitura. Status: pendente, pago, parcial ou atrasado.
**a escrever:** detalhes de valores e campos, depois de conferir a tela.

## 4.6 Estratégico e indicadores

- **Estratégico:** visão da empresa dentro da carteira, sem valores.
  **a escrever** depois de conferir a tela.
- **Indicadores de R&S:** veja [3.10](03-ciclo-rs/10-indicadores.md). Aqui você
  também ajusta **metas** e acompanha o **plano de ação**.

## Veja também

- [Matriz de permissões](apendices/matriz-permissoes.md)
- [Ciclo de R&S](03-ciclo-rs/00-visao-geral.md)
- [Regras de ouro](apendices/regras-de-ouro.md)
