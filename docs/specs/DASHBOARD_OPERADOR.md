# Especificação — Dashboard do operador e hierarquia de acesso (v0.1)

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Spec do dashboard v0.1 · **Data:** 14/10/2026
> **Status:** proposta para aprovação do Rodnei. Nada deste documento foi construído.
> Parte da regra dos seis documentos: este arquivo precede o código.

## 1. Objetivo

Dar ao operador (e, com visão ampla, ao admin e ao superadmin) um painel que
responda, sem abrir telas separadas: **quantas vagas, em que estágio estão os
candidatos, o que está parado e há quanto tempo.** Tudo clicável, com os dados
sempre limitados à carteira do operador (`src/lib/auth/escopo.ts`).

## 2. Hierarquia e acesso

| Papel | Enxerga | Pode alterar |
|---|---|---|
| **Superadmin** | Tudo, todas as empresas e a Carteira | Tudo; atribui operadores; vê o dashboard geral e o Estratégico |
| **Admin** | Tudo, todas as empresas | Publica/encerra vagas, valida candidatos, marca confidencial, black list |
| **Operador de confiança** | Carteira + vagas confidenciais das empresas dele | Cria vaga em rascunho; move candidatos no kanban; agenda; convida |
| **Operador** | Só a carteira ativa, sem confidenciais | Igual ao de confiança, sem as confidenciais |

O operador **não** vê: prestações e valores, leads, black list, denúncias,
LGPD, auditoria, acesso, estratégico, nem dados de contato de quem não tem
candidatura em andamento (regras já em produção, ver `CARTEIRA_ATENDENTE.md`).

## 3. Indicadores (cards clicáveis)

Todo card abre a lista filtrada correspondente. Período aplicado ao evento de
cada card (ver §5).

| Card | Definição | Abre |
|---|---|---|
| Vagas (total) | Vagas da carteira, qualquer status exceto arquivada | Vagas |
| Vagas em aberto | `publicada` | Vagas filtradas |
| Vagas preenchidas | `preenchida` | Vagas filtradas |
| Candidatos cadastrados | Perfis visíveis na carteira (candidatura/convite) | Candidatos |
| Em triagem | Candidaturas `recebida` + `triagem` | Kanban, coluna 1-2 |
| Aguardando entrevista | Candidaturas `entrevista` | Kanban, coluna Entrevista |
| Em teste | Candidaturas `teste` | Kanban, coluna Teste |
| Aguardando exame médico | Candidaturas `exame_medico` (**status novo**, ver §6) | Kanban, coluna Exame |
| Proposta enviada | Candidaturas `proposta` | Kanban, coluna Proposta |
| Aprovados | `contratado` | Lista de contratados |
| Reprovados | `rejeitada` + `reprovado_cliente` | Lista de reprovados |
| Sem movimento há 7+ dias | Candidatura em aberto sem mudança de etapa | Lista priorizada |

## 4. Visões

1. **Kanban de candidaturas** — colunas: Recebida · Triagem · Entrevista ·
   Teste · Exame médico · Proposta · Contratado · Não seguiu/Reprovado.
   Arrastar o cartão muda a etapa (mesma regra e auditoria de
   `atualizarStatusCandidatura`, com `exigirVaga`). Cartão mostra candidato,
   vaga, empresa e dias na etapa. Motivo obrigatório ao reprovar.
2. **Funil** — recebida → contratada, com taxa de conversão por etapa.
3. **Vagas em aberto: tempo por vaga** — tabela com dias desde `publicada_em`,
   candidaturas recebidas, em andamento e semáforo (verde até 15 dias, amarelo
   16–30, vermelho acima; limites ajustáveis).
4. **Por setor** — vagas e candidaturas por setor/segmento (ver §6).
5. **Evolução no período** — linhas de candidaturas novas, contratações e
   vagas abertas.
6. **Tabelas premium** — ordenação, busca, paginação, exportar CSV
   (apenas campos que o papel já enxerga).

> **Decisão do Rodnei (14/10/2026): mover cartão fica adiado.** Quem conduz
> a triagem inicial será o **agente de IA** e o operador entra só na última
> etapa. O Kanban nasce **somente leitura** (colunas e contagens); o arrastar
> e soltar e quem pode mover cada etapa são definidos junto com a construção
> do agente (`COMUNICACAO_OMNICANAL.md` §7).

## 5. Filtros

Período (hoje, 7 dias, 30 dias, 90 dias, mês atual, personalizado), empresa
(dentro da carteira), setor, modalidade, responsável pela vaga. O filtro vale
para cards, gráficos, kanban e tabelas ao mesmo tempo e vai na URL
(link compartilhável e botão voltar funcionam).

## 6. Lacunas de dados (exigem migration — só com "sim" explícito)

| Necessidade | Hoje | Proposta |
|---|---|---|
| Aguardando exame médico | Não existe etapa | Novo valor do enum `status_candidatura`: `exame_medico`, entre `proposta` e `contratado`. Aditivo, não altera dados |
| Setores | `companies.segmento` existe (ramo da empresa) | **Fase 1 sem migration:** setor = segmento da empresa. **Fase 2 (opcional):** `jobs.setor` para vaga com setor próprio dentro da empresa |
| Quando a vaga foi preenchida | `decidido_em` é de quem decidiu, não do preenchimento | Fase 2 (opcional): `jobs.preenchida_em`, para medir tempo até preencher |
| Tempo na etapa | Vem do `audit_log` (`candidatura_status_alterado`) | Sem migration; leitura no servidor |

## 7. O que mais valorizaria o dashboard

Sugestões, em ordem de valor para o operador:

1. **Fila "Precisa de ação hoje"**: entrevistas de hoje (agenda), convites
   vencendo em 24 h, candidaturas paradas há 7+ dias.
2. **Tempo médio por etapa** e **tempo até preencher** a vaga, por empresa.
3. **Alertas**: vaga publicada sem candidatura há 5 dias; exame médico
   pendente há 3 dias.
4. **Origem dos candidatos** (`applications.origem`): de onde vêm os melhores.
5. **Taxa de desistência** por etapa (onde o candidato some).
6. **Comparativo com o período anterior** nos cards (setas de variação).
7. **Resumo semanal por empresa** em PDF/imagem para repassar ao cliente.
8. **Metas** por empresa (vagas a preencher no mês) com barra de progresso.

## 8. Segurança e desempenho

- Toda consulta passa por `obterEscopo` / `vagasVisiveis` / `candidatosVisiveis`
  (o painel usa a chave de serviço; a RLS não protege).
- Nada de contato (telefone, e-mail, endereço) nos cartões do kanban.
- Atualizações do kanban só por server action, com auditoria.
- Agregações no servidor; limite de linhas e janela de período para não
  truncar silenciosamente. Se a base crescer, mover para uma função SQL.
- "Tempo real" = revalidação ao mover cartão e atualização periódica leve
  (sem websocket na Fase 1).

## 9. Plano

| Fase | Entrega | Precisa de migration |
|---|---|---|
| 0 | Aprovar esta spec e as decisões do §10 | Não |
| 1 | Dashboard com cards, filtros, gráficos, tabelas, tempo de vaga em aberto, setor = segmento | Não |
| 2 | Kanban **somente leitura** (arrastar fica para depois do agente de IA) | Não |
| 3 | Etapa **Exame médico** + cards dela | **Sim** (enum, aditiva) |
| 4 | Fila "Precisa de ação hoje", alertas, comparativo, metas | Opcional (`jobs.preenchida_em`, `jobs.setor`) |

Critérios de aceite: (a) operador só vê números da própria carteira; (b)
clicar em qualquer card abre a lista com o mesmo total; (c) mover cartão grava
auditoria e respeita `exigirVaga`; (d) nenhum dado de contato aparece no
kanban; (e) filtro de período muda cards, gráficos e tabelas juntos.

## 10. Decisões pedidas ao Rodnei

| # | Pergunta | Recomendação |
|---|---|---|
| E1 | "Aprovados" = `contratado`, ou também `proposta`? | Só `contratado`; proposta aparece em card próprio |
| E2 | Incluir a etapa **Exame médico** (migration aditiva)? | Sim, na Fase 3 |
| E3 | Setor = segmento da empresa por enquanto? | Sim; `jobs.setor` só se precisar |
| E4 | Limites do semáforo de vaga em aberto: 15 e 30 dias? | Sim, ajustável por empresa depois |
| E5 | Admin e superadmin usam o mesmo dashboard (com todas as empresas)? | Sim, mesma tela, escopo `todos` |
| E6 | Exportar CSV para o operador? | Sim, só os campos visíveis |
