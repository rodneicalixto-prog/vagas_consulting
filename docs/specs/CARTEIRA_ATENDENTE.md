# Especificação — Carteira por atendente (Fase 1)

> **Projeto:** Vagas Consulting · **App:** v0.1.0 · **Documento:** Spec v0.1 (proposta) · **Data:** 14/10/2026 · **Status:** aguardando 3 decisões do Rodnei antes de construir (regra dos seis documentos)

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
| Cadastro de vagas | Cria e acompanha vagas **das suas empresas** | Publicar: ver decisão D1 |
| Candidatos | Só quem se candidatou ou foi convidado a vaga **das suas empresas** | Nunca a base inteira |
| Convites | Das vagas das suas empresas | |
| Minha agenda | Já é por dono | Sem mudança |
| Agenda da equipe | Não | Já é só superadmin |
| Prestações | Não (ver D3) | Contém valores de serviço |
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

## 8. Plano de implementação

| Passo | Entrega | Verificação |
|---|---|---|
| 1 | Migration `0023` (`company_assignments`) | Aplicada em teste e em produção (aditiva) |
| 2 | Helper `escopoDoUsuario` + testes | Casos: admin, operador, sem carteira, inativo |
| 3 | Aplicar nas telas e ações do operador (empresas, vagas, candidatos, convites, visão geral) | Teste por tela com 2 empresas |
| 4 | Tela **Carteira** + convite de conta operadora com atribuição | Fluxo ponta a ponta |
| 5 | Cadastrar Athenas e ePró, criar os 2 operadores e conferir isolamento | Roteiro manual do Rodnei |

## 9. Decisões pendentes

| # | Pergunta | Sugestão |
|---|---|---|
| **D1** | O operador **publica** a vaga ou ela fica em rascunho até admin/superadmin publicar? | Como o Rodnei capta e valida as vagas, **só admin/superadmin publicam** (como hoje); o operador cadastra e acompanha |
| **D2** | O operador é **funcionário da própria empresa cliente** (Athenas/ePró) ou da sua equipe? | Se for da empresa cliente, ele só vê **candidatos que se candidataram àquela empresa** e o app deve registrar o aceite do candidato para compartilhar dados (já há o aviso "o que será enviado à empresa") |
| **D3** | O operador vê **prestações/valores**? | Não: só admin e superadmin |
| D4 | Quem pode **reatribuir** carteira? | Só superadmin |
