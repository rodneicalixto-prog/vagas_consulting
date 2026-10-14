# Especificação — Carteira por atendente (Fase 1)

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Spec v0.3 · **Data:** 14/10/2026 · **Status:** D1–D6 decididas; falta só o aval explícito para construir (a migration 0023 altera o banco de produção)

## 1. Contexto e objetivo

Hoje existem **duas empresas** operadas pelo Rodnei, **Athenas** e **ePró
Estética** (CNPJs e ramos diferentes), cada uma com **um operador próprio**. O
fluxo real é:

1. O Rodnei **capta** as vagas e faz as **tratativas pela IA**.
2. **Delega** ao operador da empresa, que **dá continuidade**: cadastra vagas
   e atende os candidatos **daquela** empresa.

Objetivo: o operador enxerga e trata **somente** a(s) empresa(s) ligada(s) à
sua conta e ativa(s) para ele; **admin** e **superadmin** mantêm a visão geral.

## 2. Perfis (modelo de hoje, sem white-label)

| Perfil | Escopo | Observação |
|---|---|---|
| **superadmin** | Tudo | Único que gerencia contas, carteira e configurações |
| **admin** | Tudo (como o superadmin) | Decisão do Rodnei, 14/10/2026 |
| **operador** | Só as empresas atribuídas **e ativas** para ele | Cadastra vagas e atende candidatos dessas empresas |

## 3. Matriz de acesso do operador

Regra única: o operador só vê dados cujo `company_id` esteja na sua carteira ativa.

| Tela | Operador | Observação |
|---|---|---|
| Visão geral | Só indicadores da sua carteira | |
| Empresas | **Só leitura** das suas | Aprovar/cadastrar empresa: admin e superadmin |
| Cadastro de vagas | Cria e acompanha vagas **das suas empresas**; a vaga fica em **rascunho** até admin/superadmin publicar (D1, decidido) | |
| Candidatos | Só quem se candidatou ou foi convidado a vaga **das suas empresas** | Nunca a base inteira |
| Convites | Das vagas das suas empresas | |
| Minha agenda | Já é por dono | Sem mudança |
| Agenda da equipe | Não | Já é só superadmin |
| Prestações | **Não** (decidido: só admin e superadmin) | Contém valores de serviço |
| Leads, Black list, Denúncias, LGPD, Auditoria, Acesso, Estratégico | Não | Dados da plataforma; admin e superadmin |

## 4. Modelo de dados

Nova tabela, sem alterar as existentes:

```sql
company_assignments (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  ativo       boolean not null default true,
  criado_por  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  unique (company_id, user_id)
)
```

- Aceita **N operadores por empresa** e **N empresas por operador**
  (hoje será 1×1; o modelo não precisa mudar quando crescer).
- `ativo = false` tira o acesso sem apagar histórico.
- RLS: sem política para o usuário comum (acesso só pelo servidor), como
  `audit_log`.

## 5. Abordagem técnica

1. **Um helper único** `escopoDoUsuario(user, role)`: devolve `null` (sem filtro,
   para admin/superadmin) ou a lista de `company_id` ativos do operador.
2. **Toda consulta e toda ação do painel** passa por ele. Listagens aplicam
   `.in("company_id", escopo)`; ações por `id` (publicar, convidar, decidir)
   **verificam** que o registro pertence ao escopo (evita acessar vaga de outra
   empresa trocando o `id` na requisição).
3. **Candidatos**: visíveis se existir `applications`/`invites` para uma vaga de
   empresa do escopo.
4. Tela de **Carteira** (superadmin): atribuir, ativar e desativar operadores
   por empresa. Ao convidar uma conta `operador`, a atribuição é escolhida no
   mesmo formulário.
5. **Auditoria**: criar/alterar/desativar atribuição vai para `audit_log`.

**Risco que o desenho precisa fechar:** hoje 32 telas usam a chave de serviço sem
filtro. Esquecer o helper em uma tela vaza dados entre empresas. Mitigação:
o helper é a única porta de leitura do painel para o operador e há teste por
tela (ver §7).

## 6. Fluxo (operador)

1. Entra em `/admin/login` → vê **só** a sua empresa no seletor/lista.
2. **Vagas**: cadastra vaga da sua empresa (empresa pré-selecionada e travada).
3. **Candidatos**: abre a fila de quem se candidatou/foi convidado às vagas dela.
4. **Convites**: convida candidato para vaga temporária da sua empresa.
5. Qualquer tentativa de abrir registro de outra empresa → "Acesso não
   autorizado" e registro em auditoria.

## 7. Critérios de aceite

1. Operador A (Athenas) **não vê** empresa, vaga, candidato, convite ou número
   da ePró Estética, em nenhuma tela nem por URL direta.
2. Admin e superadmin veem as duas empresas.
3. Desativar o operador (`ativo=false`) ou a atribuição corta o acesso na
   próxima requisição.
4. Operador não cria vaga/convite em empresa fora da carteira (mesmo forjando
   `company_id`).
5. Toda mudança de carteira aparece em `audit_log`.
6. Teste automatizado do helper (escopo, admin, operador sem carteira) e roteiro
   manual com 2 operadores reais antes de publicar.

## 7.1 Regras de sigilo (D5/D6) — detalhe

- Vaga com `confidencial = true`:
  - **Painel:** oculta de operador sem `acessa_confidenciais`, inclusive suas
    candidaturas, convites e contagens (nas telas e nos totais da visão geral).
  - **Candidato:** em listas, detalhe e convite, o nome da empresa vira
    "Empresa confidencial". Quando a candidatura do candidato chega a
    `entrevista`, `teste`, `proposta` ou `contratado`, o nome real é mostrado.
  - **Convite:** a mesma regra vale para a tela do convite.
- Marcar/desmarcar `confidencial`: só admin e superadmin.
- Auditoria: mudança de `confidencial` e de `acessa_confidenciais` vai para `audit_log`.

## 8. Plano de implementação

| Passo | Entrega | Verificação |
|---|---|---|
| 1 | Migration `0023`: tabela `company_assignments` (com `acessa_confidenciais`) e `jobs.confidencial` | Aplicada em produção (aditiva, defaults seguros: nada fica confidencial nem atribuído) |
| 2 | Helper `escopoDoUsuario` + testes | Casos: admin, operador, sem carteira, inativo |
| 3 | Aplicar nas telas e ações do operador (empresas, vagas, candidatos, convites, visão geral) | Teste por tela com 2 empresas |
| 4 | Tela **Carteira** + convite de conta operadora com atribuição | Fluxo ponta a ponta |
| 5 | Sigilo: ocultar vaga confidencial do operador comum e anonimizar a empresa ao candidato | Teste com operador comum × operador de confiança |
| 6 | Cadastrar Athenas e ePró, criar os 2 operadores e conferir isolamento | Roteiro manual do Rodnei |

## 8.1 Vagas confidenciais e operador de confiança (novo, de D2)

O Rodnei indicou que o operador pode ser **funcionário da empresa cliente** (a
proposta padrão) **ou um profissional dele**, sobretudo em vagas de **gerência
e altos cargos**, que exigem **sigilo** da empresa interessada. Isso pede dois
conceitos que cabem no mesmo modelo:

| Conceito | Proposta |
|---|---|
| **Operador de confiança** | `company_assignments.acessa_confidenciais boolean default false`. O profissional do Rodnei recebe `true`; o funcionário da empresa cliente recebe `false` |
| **Vaga confidencial** | `jobs.confidencial boolean default false`. Só admin, superadmin e operadores com `acessa_confidenciais` veem a vaga, suas candidaturas e convites |
| **Anonimato ao candidato** (opcional, ver D6) | Em vaga confidencial o app mostra "Empresa confidencial" no lugar do nome |

Como o vínculo é N:N, o mesmo profissional de confiança pode ser atribuído às
**duas** empresas (Athenas e ePró) sem criar outro tipo de conta.

## 9. Decisões

### Decididas (14/10/2026)
| # | Pergunta | Decisão |
|---|---|---|
| D1 | Operador publica a vaga? | **Não.** Fica em rascunho até admin/superadmin publicar |
| D2 | Quem é o operador? | **Funcionário da empresa cliente (padrão) ou profissional do Rodnei**, este principalmente em gerência, altos cargos e vagas sigilosas |
| D3 | Operador vê prestações e valores? | **Não.** Só admin (e superadmin) |

| D5 | Vaga sigilosa fica oculta do operador funcionário da empresa? | **Sim.** Só admin, superadmin e operador de confiança (`acessa_confidenciais`) a veem, com candidaturas e convites |
| D6 | O candidato não vê o nome da empresa em vaga confidencial? | **Sim.** Mostra "Empresa confidencial"; o nome real aparece quando a candidatura chega à etapa **entrevista** ou além |

### Menor (com sugestão, vale como padrão)
| # | Pergunta | Sugestão |
|---|---|---|
| D4 | Quem **reatribui** carteira? | Só superadmin |
