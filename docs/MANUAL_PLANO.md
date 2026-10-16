# Plano do manual de uso da plataforma

> **Projeto:** Vagas Consulting · **Documento:** Plano do manual v1.0 · **Data:** 15/10/2026
> **Status:** aprovado em 15/10/2026. Fase 1 entregue em `docs/manual/` (estrutura,
> permissões, glossário, regras de ouro e o capítulo-modelo de Triagem).

## 1. Objetivo

Um manual que permita a cada pessoa usar a plataforma **sem treinamento
presencial**: o candidato se cadastrar e acompanhar um processo; o operador
tocar o dia; o admin da empresa gerir equipe e números; a plataforma (Rodnei)
operar o negócio. Também serve como material de venda e de implantação do
modelo de aluguel.

**Critério de pronto:** uma pessoa nova, só com o manual, completa as tarefas
do seu papel sem pedir ajuda. Validado por teste com pessoas reais (fase 4).

## 2. O que o manual precisa cobrir (inventário real)

| Quem | Telas | Tamanho |
|---|---|---|
| Candidato | cadastro e onboarding, perfil (dados, documentos, preferências), vagas, candidatura, processos, convites, mensagens | ~13 telas |
| Operador | visão geral, conversas, agenda, candidatos, contatos, talentos, convites, vagas e todo o ciclo de R&S, abordagens, indicadores | ~35 telas |
| Admin da empresa | operadores, números de WhatsApp, black list, integrações (chave de IA), prestações, estratégico | ~8 telas |
| Administrador | ranking, leads, denúncias, LGPD, auditoria | ~6 telas |
| Superadmin (plataforma) | empresas, carteira, acesso, agente de IA e base de conhecimento, integrações, limites | ~8 telas |

O maior bloco é o **ciclo de R&S** (dentro da vaga): critérios, divulgação,
triagem, roteiro e ficha, testes, laudo, devolutiva, abordagem e carta-oferta.

## 3. Princípios

1. **Por tarefa, não por menu.** "Como triar candidatos", não "a tela Triagem".
2. **Uma tarefa por página**, com no máximo 7 passos.
3. **Verdade antes de promessa.** Cada afirmação sai do código, das specs ou de
   teste real. O que a plataforma **não** faz fica escrito (ela não envia
   devolutiva, carta nem abordagem; só a pessoa envia e registra).
4. **Cada capítulo diz o que a IA faz e o que a pessoa decide.**
5. **Dados fictícios** em toda captura de tela.
6. **Vivo:** atualizar o manual é parte de cada entrega (seção 8).

## 4. Estrutura

| Volume | Conteúdo |
|---|---|
| 0. Começar | guia de 1 página por papel; como entrar, definir senha, menu e tela inicial; o que cada papel enxerga |
| 1. Candidato | cadastro, perfil, vagas, candidatura, acompanhar o processo, convites, mensagens, privacidade e descadastro |
| 2. Operador | rotina do dia; conversas (fila, assumir, devolver, número de origem); agenda; candidatos; contatos; talentos; convites |
| 3. Ciclo de R&S | da vaga à contratação, um capítulo por etapa (seção 5) |
| 4. Admin da empresa | equipe e limites, números de WhatsApp (QR, dedicado ou compartilhado), black list, chave de IA, indicadores e plano de ação |
| 5. Plataforma | empresas, carteira, acesso, agente de IA, base de conhecimento confiável, integrações, limites, LGPD, auditoria |
| Apêndices | glossário; regras de ouro (o que a plataforma nunca faz); matriz de permissões por papel; LGPD para quem usa; solução de problemas; perguntas frequentes |

## 5. O capítulo mais difícil: o ciclo de R&S

Ordem e uma linha por etapa; cada capítulo tem **o que a IA faz**, **o que a
pessoa decide**, **o que bloqueia** e **o que sai (Word, PDF, planilha)**:

1. Critérios da vaga (inclui áudio do gestor) 2. Divulgação e origem
3. Triagem 4. Roteiro de entrevista e ficha 5. Testes e dinâmicas
6. Laudo 7. Devolutiva (regra de encerramento) 8. Carta-oferta
9. Abordagem ativa 10. Indicadores e plano de ação.

Cada um traz um **exemplo trabalhado** do início ao fim, com os mesmos dados
fictícios, para o leitor ver o ciclo inteiro conectado.

## 6. Molde de cada tópico

> Para que serve · Quem faz · Onde fica · Antes de começar · Passo a passo
> (até 7) · O que você vai ver · O que a plataforma **não** faz · Erros
> comuns e o que fazer · Veja também

## 7. Como produzir sem inventar

| Passo | Como |
|---|---|
| Fonte da verdade | código, `docs/specs/*` e o roteiro de teste; nunca a memória |
| Rascunho | gerado a partir das rotas e das specs, tela por tela |
| Verificação | cada passo é executado em ambiente de teste por quem escreve; o que não rodar fica marcado "a validar" |
| Capturas | feitas no navegador com conta e dados fictícios, em tamanho padrão, com realces |
| Revisão | uma pessoa de cada papel lê e tenta a tarefa só com o texto |
| Limites | cada capítulo herda a lista de "limites conhecidos" das specs |

## 8. Manter atualizado

- **Regra de entrega:** mudou tela, regra ou limite, muda o capítulo antes de publicar.
- O manual leva **versão e data** e a versão do app a que se refere.
- `docs/manual/CHANGELOG.md` registra o que mudou por versão.
- Um **checklist de conferência** por entrega (telas citadas existem, rotas
  funcionam, imagens não ficaram velhas) roda antes de cada publicação.

## 9. Formato e entrega

| Formato | Uso |
|---|---|
| Markdown em `docs/manual/` | fonte única, versionada no repositório |
| Site de ajuda (HTML) dentro da própria plataforma | leitura por papel, com busca |
| Botão **Ajuda** em cada tela | leva ao capítulo daquela tarefa |
| Word e PDF | impressão, envio ao cliente e treinamento |
| Vídeos curtos (opcional, depois) | 3 tarefas mais usadas, gravadas do próprio ambiente de teste |

**Marca:** como a plataforma é alugada, a estrutura deve permitir logotipo e
nome da empresa na capa e nos arquivos entregues, sem alterar o conteúdo.

## 10. Decisões que preciso de você

1. **Quem lê primeiro?** Começo pelo **operador e pelo ciclo de R&S** (maior uso
   e maior risco de erro), ou pelo candidato?
2. **Onde o manual vive?** Só arquivos e PDF, ou também o **site de ajuda dentro
   da plataforma** com botão Ajuda por tela (recomendado)?
3. **Marca por empresa (white-label)** já na primeira versão, ou depois?
4. **Tom:** direto e informal (como as telas) ou formal?
5. **Vídeos:** entram agora ou só depois do texto aprovado?

## 11. Fases

| Fase | Entrega | Depende de |
|---|---|---|
| 0 | decisões da seção 10 | você |
| 1 | esqueleto completo, matriz de permissões, glossário e regras de ouro | fase 0 |
| 2 | volumes 2 (operador) e 3 (ciclo de R&S) com exemplo trabalhado | testes do roteiro |
| 3 | volumes 0, 1, 4 e 5 e apêndices | fase 2 |
| 4 | capturas de tela, revisão com uma pessoa de cada papel, correções | pessoas reais |
| 5 | site de ajuda e botão Ajuda por tela; Word e PDF | fase 4 |

## 12. Riscos

| Risco | Tratamento |
|---|---|
| Parte do produto ainda sem teste real (números novos, geração por IA) | o capítulo descreve o comportamento esperado e marca "a validar" até o roteiro rodar |
| Tela muda e a captura envelhece | capturas só na fase 4, depois do congelamento; checklist por entrega |
| Dado pessoal em captura | somente conta e dados fictícios, revisão antes de publicar |
| Manual grande demais para ler | por papel, por tarefa, com busca e guia de 1 página |
| Prometer o que o produto não faz | seção "o que a plataforma não faz" obrigatória em cada tópico |

## 13. Decisões aprovadas (15/10/2026) e assistente da plataforma

- Começar pelo **operador e pelo ciclo de R&S**; **site de ajuda dentro da
  plataforma**; tom **direto e informal**; **marca por empresa** preparada na
  capa, conteúdo igual; **vídeos** depois do texto aprovado.
- **Assistente da plataforma (ideia do Rodnei):** agente de IA que tira dúvidas
  de funcionamento usando o manual como fonte única. Spec:
  `docs/specs/ASSISTENTE_PLATAFORMA.md`. Entra na fase 5, depois dos capítulos
  do operador e do ciclo de R&S estarem em rascunho.
