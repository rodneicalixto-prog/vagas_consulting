# 3.3 Triagem de currículos

> **Estado:** rascunho (capítulo-modelo), escrito a partir do código e da spec
> em 15/10/2026. Passos marcados `[A VALIDAR]` ainda não foram executados no
> roteiro de teste (passo 4).

## Para que serve

Ordenar os candidatos de uma vaga pelos critérios que você definiu, mostrando
**a frase do cadastro que sustenta cada avaliação**, para você decidir quem
segue para a entrevista sem abrir um por um.

## Quem faz

Operador, administrador da empresa, administrador e superadmin, dentro do que
cada um enxerga.

## Onde fica

`Empresas e vagas → Cadastro de vagas → abrir a vaga → Triar candidatos`

## Antes de começar

- A vaga precisa de **requisitos obrigatórios** nos critérios.
- Se os critérios vieram de uma proposta da IA, **confira e salve** antes
  (proposta não conferida bloqueia a triagem).
- Os critérios não podem ter termo que discrimina (por exemplo "apenas jovens").
- A vaga precisa ter candidaturas ativas.

## Passo a passo

1. Abra a vaga e clique em **Triar candidatos**.
2. Clique em **Triar candidatos** de novo na tela da triagem. A plataforma avalia
   até **30 candidaturas por rodada**.
3. Se houver mais, clique outra vez: ela continua de onde parou.
4. Leia o ranking: posição, pontuação de 0 a 100 e obrigatórios atendidos (x/y).
5. Abra um candidato para ver cada critério com o estado e a **frase de
   evidência**.
6. Leia a lista **A validar na entrevista** (lacunas de período, trocas de
   emprego e competências comportamentais).
7. Use **Top 3, 5 ou 10** para focar e **Baixar planilha (CSV)** para levar o
   ranking.

## O que você vai ver

| Elemento | Significado |
|---|---|
| **Atende** | O cadastro mostra o critério, com a frase de evidência |
| **Não atende** | O cadastro contradiz o critério, com a frase |
| **Não evidenciado** | O cadastro não menciona. Não é o mesmo que "não atende" |
| **Não segue (eliminatório)** | Um obrigatório eliminatório não foi atendido; o candidato vai para o fim, com o motivo |
| **Pontuação** | 70% dos obrigatórios e 30% dos desejáveis, calculada pelo sistema |
| **Critérios mudaram: refazer** | Você mudou a vaga depois da triagem; marque "Refazer também os já avaliados" |
| **Sugestão de corte** | Quantos têm 70 ou mais e nenhum eliminatório. É só sugestão |

## O que a plataforma não faz

- **Não reprova e não muda a etapa** de ninguém. Você decide e muda a etapa no
  fluxo de candidaturas.
- **Não usa nome, idade, gênero, contato, endereço, cidade nem motivo de
  saída** na avaliação. Esses dados não chegam à IA.
- **Não reduz a nota por lacuna ou troca de emprego:** isso aparece só em
  "a validar".
- **Não lê o PDF** do currículo, exceto quando o cadastro do candidato está
  vazio; nesse caso lê só título e experiências. Arquivo ilegível fica
  "não foi possível ler".
- **Não avalia competência comportamental:** ela vai para "a validar" para a
  entrevista.

## Erros comuns e o que fazer

| Mensagem ou situação | O que fazer |
|---|---|
| "Triagem bloqueada" | Ajustar os critérios (obrigatórios, conferir a proposta da IA, remover termo discriminatório) |
| "Esta vaga ainda não tem candidaturas" | Esperar candidaturas ou divulgar a vaga |
| "O teto mensal de custo de IA foi atingido" | Pedir à plataforma para ampliar o teto |
| Falha em alguns candidatos | Clicar em **Triar candidatos** de novo: só os pendentes rodam |
| Candidato sem avaliação | Cadastro vazio e sem PDF legível: peça que complete o perfil |

## Veja também

- [3.1 Critérios da vaga](01-criterios.md)
- [3.4 Roteiro de entrevista e ficha](04-entrevista.md)
- [Regras de ouro](../apendices/regras-de-ouro.md)
