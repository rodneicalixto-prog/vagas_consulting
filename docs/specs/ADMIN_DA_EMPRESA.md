# Especificação — Admin da empresa e vagas de operador (v0.1)

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Spec do admin da empresa v0.1 · **Data:** 14/10/2026
> **Status:** proposta para aprovação do Rodnei. Nada foi construído nem alterado no banco.
> Regra dos seis documentos: este arquivo precede o código. Dialoga com
> `CARTEIRA_ATENDENTE.md` (escopo por empresa) e com
> `docs/DIAGNOSTICO_MULTIUSUARIO_WHITELABEL.md` (aluguel e white-label).

## 1. Objetivo

Hoje a plataforma tem um único "admin" (da plataforma). Esta etapa cria o
**admin interno de cada empresa cliente**, que gerencia os **próprios
operadores** dentro de um **número contratado de vagas de operador**, sem
enxergar nenhuma outra empresa.

## 2. Hierarquia proposta

| Nível | Papel | Enxerga | Gerencia |
|---|---|---|---|
| 1 | **Superadmin** (dono da plataforma) | Tudo | Plataforma, planos, carteira, agentes, chaves |
| 2 | **Admin da plataforma** (equipe Vagas Consulting) | Todas as empresas | Vagas, candidatos, publicação, black list, ranking |
| 3 | **Admin da empresa** (novo) | **Só a empresa dele** | Operadores da empresa, dashboard, vagas e agente da empresa |
| 4 | **Operador** | Só a carteira dele | Triagem, convites, agenda, contatos |

O admin da empresa é um **operador com poderes de gestão** da própria empresa.
Ele nunca sobe de nível sozinho e nunca cria outro admin.

## 3. Vagas de operador ("operadores em aberto")

Cada empresa tem um **limite contratado** de operadores ativos:

| Campo | Significado |
|---|---|
| Contratados | Limite do plano da empresa (definido pelo superadmin ou admin da plataforma) |
| Em uso | Operadores ativos da empresa (admin da empresa **não** conta) |
| **Em aberto** | Contratados − Em uso |

Exemplo na tela: **"3 de 5 operadores em uso · 2 em aberto"**.

Regras:
1. O admin da empresa só **convida ou ativa** operador se houver vaga em
   aberto. Sem vaga, o botão fica bloqueado com o motivo e o contato para
   ampliar o plano.
2. **Desativar** um operador libera a vaga na hora e **preserva o histórico**
   (candidaturas, conversas, auditoria); nada é apagado.
3. A conferência do limite é **no servidor**, no momento do convite e da
   ativação, para não passar do limite com dois cliques simultâneos.
4. O superadmin e o admin da plataforma podem ajustar o limite; todo ajuste
   vai para a auditoria.

## 4. O que o admin da empresa vê e faz

| Área | Acesso |
|---|---|
| Visão geral | Dashboard **só da empresa**, de todos os operadores dela |
| Operadores | Lista, convida, ativa, desativa, vê carga de cada um (candidatos em andamento, tempo de resposta) |
| Vagas | Cria e acompanha vagas da empresa, **inclusive as sigilosas (confidenciais)**; **publicação** conforme decisão E4 |
| Candidatos e contatos | Da empresa, com a mesma regra de contato do operador |
| Agenda | Equipe da própria empresa (entrevistas, por etapa, entregas) |
| Agente de IA | Edita roteiro e FAQ do agente **da empresa** (versionado); não muda chave, teto nem autonomia |
| Prestações e valores | Conforme decisão E5 |
| Empresas, leads, black list global, denúncias, LGPD, auditoria da plataforma, carteira, acesso global | **Não** |

## 5. Modelo de dados proposto (migration futura, só com "sim")

| Alteração | Função |
|---|---|
| Novo perfil `admin_empresa` em `admin_users.perfil` | Distingue o admin da empresa |
| `company_assignments` ganha `papel` (`operador` ou `admin_empresa`) | Vincula a pessoa à empresa com o papel dela |
| `companies.max_operadores integer` | Vagas de operador contratadas |
| Visão/função `operadores_em_uso(company_id)` | Contagem usada na tela e na trava |
| `audit_log` | Já existe; novas ações: `operador_convidado`, `operador_desativado`, `limite_operadores_alterado` |

A barreira de dados continua sendo `src/lib/auth/escopo.ts`: o admin da
empresa é um escopo "da empresa inteira", não "da carteira individual".

## 6. Segurança

- **Sem escalada:** admin da empresa só cria `operador`; criar `admin_empresa`
  ou `admin` é do superadmin/admin da plataforma.
- **Sem alcance cruzado:** toda ação por id passa por `exigirEmpresa` /
  `exigirVaga`; testes de isolamento entre duas empresas antes de liberar.
- **Último admin:** não é possível desativar o único admin de uma empresa.
- **Convite:** por e-mail com link de uso único (já existe
  `inviteUserByEmail`), expiração e reenvio auditados.
- **Saída de operador:** ao desativar, as candidaturas em andamento dele
  voltam para a fila da empresa (a definir com o admin da empresa, E7).

## 7. Plano

| Fase | Entrega | Migration |
|---|---|---|
| 0 | Aprovar esta spec e as decisões do §8 | Não |
| 1 | Perfil `admin_empresa`, limite de operadores, tela "Operadores" com convite, ativar, desativar e contador | **Sim** |
| 2 | Dashboard e agenda no escopo "empresa inteira" | Não |
| 3 | Edição do roteiro do agente da empresa (depois da Fase 3 da comunicação) | Não |
| 4 | Plano/limite editável pelo superadmin com histórico e alerta de uso | Opcional |

Critérios de aceite da Fase 1: (a) admin da empresa A não vê nem altera nada
da empresa B; (b) convite além do limite é recusado no servidor; (c)
desativar libera a vaga e mantém o histórico; (d) admin da empresa não cria
admin; (e) todas as ações geram auditoria.

## 8. Decisões pedidas ao Rodnei

| # | Pergunta | Recomendação |
|---|---|---|
| E1 | "Operadores em aberto" = vagas de operador ainda livres dentro do limite contratado? | Sim, como na seção 3 |
| E2 | Quem define o limite por empresa? | Superadmin e admin da plataforma, com auditoria |
| E3 | O admin da empresa vê vagas confidenciais da própria empresa? | **Decidido (14/10/2026): sim, e também cria e acompanha vagas sigilosas** |
| E4 | Admin da empresa publica vaga ou segue a regra "admin da plataforma publica"? | Segue a regra atual no início; liberar publicação por empresa depois |
| E5 | Admin da empresa vê prestações e valores da própria empresa? | Só leitura, só da empresa |
| E6 | Um admin pode administrar mais de uma empresa? | Não; uma pessoa, uma empresa (o profissional de confiança continua como operador em várias) |
| E7 | Ao desativar operador, o que acontece com os candidatos em andamento dele? | Voltam à fila da empresa e o admin redistribui |
| E8 | Existe cobrança por operador extra? | A definir com o plano comercial (white-label) |

## 9. Vagas sigilosas no admin da empresa (decidido em 14/10/2026)

O admin da empresa **cria e acompanha vagas sigilosas** da própria empresa.

| Regra | Detalhe |
|---|---|
| Criar | Pode marcar `confidencial` ao cadastrar vaga **da sua empresa** (hoje só admin e superadmin marcam) |
| Acompanhar | Vê a vaga, candidaturas, convites, funil e tempo em aberto da vaga sigilosa |
| Quem mais vê | Só operadores da empresa com acesso de confiança (`acessa_confidenciais`); o operador comum não vê a vaga, as candidaturas nem as contagens |
| Candidato | Continua vendo "Empresa confidencial" até a etapa de entrevista |
| Mudar o sigilo | Admin da empresa pode marcar e desmarcar nas vagas da própria empresa; toda mudança é auditada (`vaga_marcada/desmarcada_confidencial`) |
| Limite | Não vê vaga sigilosa de outra empresa, nem a lista de quais empresas existem |

**Pontos de atenção:** (1) os totais do dashboard do operador comum não devem revelar a existência de vaga sigilosa (já garantido pelo filtro de escopo); (2) o agente da empresa trata a vaga sigilosa sem citar o nome da empresa antes da etapa permitida.

**Decisão nova pedida (E9):** o admin da empresa pode **conceder ou retirar** o acesso de confiança de um operador da própria empresa, ou isso continua só com o superadmin? Recomendação: o admin da empresa concede, com auditoria, porque o sigilo é dele.

## 10. Decisões do Rodnei (14/10/2026)

| # | Tema | Decisão |
|---|---|---|
| E1 | Operadores em aberto | **Confirmado:** é o **limite total de operadores** da empresa; "em aberto" = limite − em uso. O número é configurável por empresa pelo superadmin; **valor padrão sugerido para empresa nova: 4** (a ajustar caso a caso) |
| E2 | Quem define o limite por empresa | **Somente o superadmin** (não o admin da plataforma) |
| E3 | Vagas confidenciais da própria empresa | **Sim** (e cria/acompanha sigilosas, §9) |
| E4 | Publicação de vaga | **Regra atual**: admin da plataforma publica; admin da empresa não publica |
| E5 | Prestações e valores da empresa | **Sim, somente leitura**, só da própria empresa |
| E6 | Admin em mais de uma empresa | **Não**: uma pessoa, uma empresa |
| E7 | Candidatos de operador desativado | **Voltam à fila da empresa** e o admin da empresa redistribui |
| E8 | Cobrança por operador extra | **Não há cobrança inicialmente** (o limite continua existindo) |

### Consequências

- **Limite editável só pelo superadmin**, com histórico em auditoria (`limite_operadores_alterado`). O admin da plataforma vê o limite, não altera.
- **Prestações**: o admin da empresa ganha leitura filtrada pela empresa (capability de leitura própria, separada de `finance.read` global).
- **Redistribuição**: ao desativar operador, a tela mostra os candidatos em andamento dele com ação "atribuir a outro operador".
- **Sem cobrança**: o campo de plano comercial fica fora da Fase 1; o limite é só controle operacional.

### Pendências

1. **E1**: confirmar se "4" é o limite inicial de operadores por empresa.
2. **E9 (decidido em 14/10/2026: sim, o admin da empresa concede e retira o acesso de confiança dos operadores da própria empresa, com auditoria `carteira_confidenciais_liberadas/revogadas`; superadmin continua podendo em qualquer empresa).** Texto original: **E9**: quem concede o acesso de confiança a operadores da empresa (recomendação: o admin da empresa, com auditoria).

### Fechamento (14/10/2026)

Todas as decisões E1 a E9 estão respondidas. A **Fase 1** está pronta para construir, com **limite por empresa sem valor fixo no código** (coluna `max_operadores`, padrão 4 para empresa nova, editável só pelo superadmin). A migration só será aplicada com o "sim" explícito do Rodnei.
